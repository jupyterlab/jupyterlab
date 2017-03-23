// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ArrayExt, each, find, toArray
} from '@phosphor/algorithm';

import {
  JSONObject, PromiseDelegate
} from '@phosphor/coreutils';

import {
  DisposableDelegate, IDisposable
} from '@phosphor/disposable';

import {
  ISignal, Signal
} from '@phosphor/signaling';

import {
  CommHandler
} from './comm';

import {
  Kernel
} from './kernel';

import {
  KernelMessage
} from './messages';

import {
  KernelFutureHandler
} from './future';

import * as serialize
  from './serialize';

import * as validate
  from './validate';

import {
  IAjaxSettings
} from '../utils';

import * as utils
  from '../utils';


/**
 * The url for the kernel service.
 */
const KERNEL_SERVICE_URL = 'api/kernels';

/**
 * The url for the kernelspec service.
 */
const KERNELSPEC_SERVICE_URL = 'api/kernelspecs';


/**
 * Implementation of the Kernel object
 */
export
class DefaultKernel implements Kernel.IKernel {
  /**
   * Construct a kernel object.
   */
  constructor(options: Kernel.IOptions, id: string) {
    this._name = options.name;
    this._id = id;
    this._baseUrl = options.baseUrl || utils.getBaseUrl();
    this._wsUrl = options.wsUrl || utils.getWsUrl(this._baseUrl);
    this._ajaxSettings = JSON.stringify(
      utils.ajaxSettingsWithToken(options.ajaxSettings, options.token)
    );
    this._token = options.token || utils.getConfigOption('token');
    this._clientId = options.clientId || utils.uuid();
    this._username = options.username || '';
    this._futures = new Map<string, KernelFutureHandler>();
    this._commPromises = new Map<string, Promise<Kernel.IComm>>();
    this._comms = new Map<string, Kernel.IComm>();
    this._createSocket();
    this.terminated = new Signal<this, void>(this);
    Private.runningKernels.push(this);
  }

  /**
   * A signal emitted when the kernel is shut down.
   */
  readonly terminated: Signal<this, void>;

  /**
   * A signal emitted when the kernel status changes.
   */
  get statusChanged(): ISignal<this, Kernel.Status> {
    return this._statusChanged;
  }

  /**
   * A signal emitted for iopub kernel messages.
   */
  get iopubMessage(): ISignal<this, KernelMessage.IIOPubMessage> {
    return this._iopubMessage;
  }

  /**
   * A signal emitted for unhandled kernel message.
   */
  get unhandledMessage(): ISignal<this, KernelMessage.IMessage> {
    return this._unhandledMessage;
  }

  /**
   * The id of the server-side kernel.
   */
  get id(): string {
    return this._id;
  }

  /**
   * The name of the server-side kernel.
   */
  get name(): string {
    return this._name;
  }

  /**
   * Get the model associated with the kernel.
   */
  get model(): Kernel.IModel {
    return { name: this.name, id: this.id };
  }

  /**
   * The client username.
   */
   get username(): string {
     return this._username;
   }

  /**
   * The client unique id.
   */
  get clientId(): string {
    return this._clientId;
  }

  /**
   * The current status of the kernel.
   */
  get status(): Kernel.Status {
    return this._status;
  }

  /**
   * The base url of the kernel.
   */
  get baseUrl(): string {
    return this._baseUrl;
  }

  /**
   * Get a copy of the default ajax settings for the kernel.
   */
  get ajaxSettings(): IAjaxSettings {
    return JSON.parse(this._ajaxSettings);
  }
  /**
   * Set the default ajax settings for the kernel.
   */
  set ajaxSettings(value: IAjaxSettings) {
    this._ajaxSettings = JSON.stringify(value);
  }

  /**
   * Test whether the kernel has been disposed.
   */
  get isDisposed(): boolean {
    return this._futures === null;
  }

  /**
   * The cached kernel info.
   *
   * #### Notes
   * This value will be null until the kernel is ready.
   */
  get info(): KernelMessage.IInfoReply | null {
    return this._info;
  }

  /**
   * Test whether the kernel is ready.
   */
  get isReady(): boolean {
    return this._isReady;
  }

  /**
   * A promise that is fulfilled when the kernel is ready.
   */
  get ready(): Promise<void> {
    return this._connectionPromise.promise;
  }

  /**
   * Get the kernel spec.
   *
   * @returns A promise that resolves with the kernel spec.
   */
  getSpec(): Promise<Kernel.ISpecModel> {
    if (this._specPromise) {
      return this._specPromise;
    }
    let options = {
      baseUrl: this._baseUrl,
      ajaxSettings: this.ajaxSettings
    };
    this._specPromise = Private.findSpecs(options).then(specs => {
      return specs.kernelspecs[this._name];
    });
    return this._specPromise;
  }

  /**
   * Clone the current kernel with a new clientId.
   */
  clone(): Kernel.IKernel {
    let options: Kernel.IOptions = {
      baseUrl: this._baseUrl,
      wsUrl: this._wsUrl,
      name: this._name,
      username: this._username,
      token: this._token,
      ajaxSettings: this.ajaxSettings
    };
    return new DefaultKernel(options, this._id);
  }

  /**
   * Dispose of the resources held by the kernel.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._status = 'dead';
    if (this._ws !== null) {
      this._ws.close();
    }
    this._ws = null;
    this._futures.forEach((future, key) => {
      future.dispose();
    });
    this._comms.forEach((comm, key) => {
      comm.dispose();
    });
    this._futures = null;
    this._commPromises = null;
    this._comms = null;
    this._targetRegistry = null;
    ArrayExt.removeFirstOf(Private.runningKernels, this);
    Signal.clearData(this);
  }

  /**
   * Send a shell message to the kernel.
   *
   * #### Notes
   * Send a message to the kernel's shell channel, yielding a future object
   * for accepting replies.
   *
   * If `expectReply` is given and `true`, the future is disposed when both a
   * shell reply and an idle status message are received. If `expectReply`
   * is not given or is `false`, the future is resolved when an idle status
   * message is received.
   * If `disposeOnDone` is not given or is `true`, the Future is disposed at this point.
   * If `disposeOnDone` is given and `false`, it is up to the caller to dispose of the Future.
   *
   * All replies are validated as valid kernel messages.
   *
   * If the kernel status is `dead`, this will throw an error.
   */
  sendShellMessage(msg: KernelMessage.IShellMessage, expectReply=false, disposeOnDone=true): Kernel.IFuture {
    if (this.status === 'dead') {
      throw new Error('Kernel is dead');
    }
    if (!this._isReady) {
      this._pendingMessages.push(msg);
    } else {
      this._ws.send(serialize.serialize(msg));
    }
    let future = new KernelFutureHandler(() => {
      this._futures.delete(msg.header.msg_id);
    }, msg, expectReply, disposeOnDone);
    this._futures.set(msg.header.msg_id, future);
    return future;
  }

  /**
   * Interrupt a kernel.
   *
   * #### Notes
   * Uses the [Jupyter Notebook API](http://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter/notebook/master/notebook/services/api/api.yaml#!/kernels).
   *
   * The promise is fulfilled on a valid response and rejected otherwise.
   *
   * It is assumed that the API call does not mutate the kernel id or name.
   *
   * The promise will be rejected if the kernel status is `Dead` or if the
   * request fails or the response is invalid.
   */
  interrupt(): Promise<void> {
    return Private.interruptKernel(this, this._baseUrl, this.ajaxSettings);
  }

  /**
   * Restart a kernel.
   *
   * #### Notes
   * Uses the [Jupyter Notebook API](http://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter/notebook/master/notebook/services/api/api.yaml#!/kernels) and validates the response model.
   *
   * Any existing Future or Comm objects are cleared.
   *
   * The promise is fulfilled on a valid response and rejected otherwise.
   *
   * It is assumed that the API call does not mutate the kernel id or name.
   *
   * The promise will be rejected if the request fails or the response is
   * invalid.
   */
  restart(): Promise<void> {
    this._clearState();
    this._updateStatus('restarting');
    return Private.restartKernel(this, this._baseUrl, this.ajaxSettings);
  }

  /**
   * Reconnect to a disconnected kernel.
   *
   * #### Notes
   * Used when the websocket connection to the kernel is lost.
   */
  reconnect(): Promise<void> {
    this._isReady = false;
    if (this._ws !== null) {
      // Clear the websocket event handlers and the socket itself.
      this._ws.onopen = null;
      this._ws.onclose = null;
      this._ws.onerror = null;
      this._ws.onmessage = null;
      this._ws.close();
      this._ws = null;
    }
    this._updateStatus('reconnecting');
    this._createSocket();
    return this._connectionPromise.promise;
  }

  /**
   * Shutdown a kernel.
   *
   * #### Notes
   * Uses the [Jupyter Notebook API](http://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter/notebook/master/notebook/services/api/api.yaml#!/kernels).
   *
   * The promise is fulfilled on a valid response and rejected otherwise.
   *
   * On a valid response, closes the websocket and disposes of the kernel
   * object, and fulfills the promise.
   *
   * The promise will be rejected if the kernel status is `Dead` or if the
   * request fails or the response is invalid.
   */
  shutdown(): Promise<void> {
    if (this.status === 'dead') {
      return Promise.reject(new Error('Kernel is dead'));
    }
    this._clearState();
    return Private.shutdownKernel(this.id, this._baseUrl, this.ajaxSettings);
  }

  /**
   * Send a `kernel_info_request` message.
   *
   * #### Notes
   * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#kernel-info).
   *
   * Fulfills with the `kernel_info_response` content when the shell reply is
   * received and validated.
   */
  requestKernelInfo(): Promise<KernelMessage.IInfoReplyMsg> {
    let options: KernelMessage.IOptions = {
      msgType: 'kernel_info_request',
      channel: 'shell',
      username: this._username,
      session: this._clientId
    };
    let msg = KernelMessage.createShellMessage(options);
    return Private.handleShellMessage(this, msg).then(reply => {
      this._info = reply.content as KernelMessage.IInfoReply;
      return reply;
    });
  }

  /**
   * Send a `complete_request` message.
   *
   * #### Notes
   * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#completion).
   *
   * Fulfills with the `complete_reply` content when the shell reply is
   * received and validated.
   */
  requestComplete(content: KernelMessage.ICompleteRequest): Promise<KernelMessage.ICompleteReplyMsg> {
    let options: KernelMessage.IOptions = {
      msgType: 'complete_request',
      channel: 'shell',
      username: this._username,
      session: this._clientId
    };
    let msg = KernelMessage.createShellMessage(options, content);
    return Private.handleShellMessage(this, msg);
  }

  /**
   * Send an `inspect_request` message.
   *
   * #### Notes
   * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#introspection).
   *
   * Fulfills with the `inspect_reply` content when the shell reply is
   * received and validated.
   */
  requestInspect(content: KernelMessage.IInspectRequest): Promise<KernelMessage.IInspectReplyMsg> {
    let options: KernelMessage.IOptions = {
      msgType: 'inspect_request',
      channel: 'shell',
      username: this._username,
      session: this._clientId
    };
    let msg = KernelMessage.createShellMessage(options, content);
    return Private.handleShellMessage(this, msg);
  }

  /**
   * Send a `history_request` message.
   *
   * #### Notes
   * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#history).
   *
   * Fulfills with the `history_reply` content when the shell reply is
   * received and validated.
   */
  requestHistory(content: KernelMessage.IHistoryRequest): Promise<KernelMessage.IHistoryReplyMsg> {
    let options: KernelMessage.IOptions = {
      msgType: 'history_request',
      channel: 'shell',
      username: this._username,
      session: this._clientId
    };
    let msg = KernelMessage.createShellMessage(options, content);
    return Private.handleShellMessage(this, msg);
  }

  /**
   * Send an `execute_request` message.
   *
   * #### Notes
   * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#execute).
   *
   * Future `onReply` is called with the `execute_reply` content when the
   * shell reply is received and validated. The future will resolve when
   * this message is received and the `idle` iopub status is received.
   * The future will also be disposed at this point unless `disposeOnDone`
   * is specified and `false`, in which case it is up to the caller to dispose
   * of the future.
   *
   * **See also:** [[IExecuteReply]]
   */
  requestExecute(content: KernelMessage.IExecuteRequest, disposeOnDone: boolean = true): Kernel.IFuture {
    let options: KernelMessage.IOptions = {
      msgType: 'execute_request',
      channel: 'shell',
      username: this._username,
      session: this._clientId
    };
    let defaults: JSONObject = {
      silent : false,
      store_history : true,
      user_expressions : {},
      allow_stdin : true,
      stop_on_error : false
    };
    content = utils.extend(defaults, content);
    let msg = KernelMessage.createShellMessage(options, content);
    return this.sendShellMessage(msg, true, disposeOnDone);
  }

  /**
   * Send an `is_complete_request` message.
   *
   * #### Notes
   * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#code-completeness).
   *
   * Fulfills with the `is_complete_response` content when the shell reply is
   * received and validated.
   */
  requestIsComplete(content: KernelMessage.IIsCompleteRequest): Promise<KernelMessage.IIsCompleteReplyMsg> {
    let options: KernelMessage.IOptions = {
      msgType: 'is_complete_request',
      channel: 'shell',
      username: this._username,
      session: this._clientId
    };
    let msg = KernelMessage.createShellMessage(options, content);
    return Private.handleShellMessage(this, msg);
  }

  /**
   * Send a `comm_info_request` message.
   *
   * #### Notes
   * Fulfills with the `comm_info_reply` content when the shell reply is
   * received and validated.
   */
  requestCommInfo(content: KernelMessage.ICommInfoRequest): Promise<KernelMessage.ICommInfoReplyMsg> {
    let options: KernelMessage.IOptions = {
      msgType: 'comm_info_request',
      channel: 'shell',
      username: this._username,
      session: this._clientId
    };
    let msg = KernelMessage.createShellMessage(options, content);
    return Private.handleShellMessage(this, msg);
  }

  /**
   * Send an `input_reply` message.
   *
   * #### Notes
   * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#messages-on-the-stdin-router-dealer-sockets).
   */
  sendInputReply(content: KernelMessage.IInputReply): void {
    if (this.status === 'dead') {
      throw new Error('Kernel is dead');
    }
    let options: KernelMessage.IOptions = {
      msgType: 'input_reply',
      channel: 'stdin',
      username: this._username,
      session: this._clientId
    };
    let msg = KernelMessage.createMessage(options, content);
    if (!this._isReady) {
      this._pendingMessages.push(msg);
    } else {
      this._ws.send(serialize.serialize(msg));
    }
  }

  /**
   * Register an IOPub message hook.
   *
   * @param msg_id - The parent_header message id the hook will intercept.
   *
   * @param hook - The callback invoked for the message.
   *
   * @returns A disposable used to unregister the message hook.
   *
   * #### Notes
   * The IOPub hook system allows you to preempt the handlers for IOPub messages with a
   * given parent_header message id. The most recently registered hook is run first.
   * If the hook returns false, any later hooks and the future's onIOPub handler will not run.
   * If a hook throws an error, the error is logged to the console and the next hook is run.
   * If a hook is registered during the hook processing, it won't run until the next message.
   * If a hook is disposed during the hook processing, it will be deactivated immediately.
   *
   * See also [[IFuture.registerMessageHook]].
   */
  registerMessageHook(msgId: string, hook: (msg: KernelMessage.IIOPubMessage) => boolean): IDisposable {
    let future = this._futures && this._futures.get(msgId);
    if (future) {
      future.registerMessageHook(hook);
    }
    return new DisposableDelegate(() => {
      future = this._futures && this._futures.get(msgId);
      if (future) {
        future.removeMessageHook(hook);
      }
    });
  }

  /**
   * Register a comm target handler.
   *
   * @param targetName - The name of the comm target.
   *
   * @param callback - The callback invoked for a comm open message.
   *
   * @returns A disposable used to unregister the comm target.
   *
   * #### Notes
   * Only one comm target can be registered at a time, an existing
   * callback will be overidden.  A registered comm target handler will take
   * precedence over a comm which specifies a `target_module`.
   */
  registerCommTarget(targetName: string, callback: (comm: Kernel.IComm, msg: KernelMessage.ICommOpenMsg) => void): IDisposable {
    this._targetRegistry[targetName] = callback;
    return new DisposableDelegate(() => {
      if (!this.isDisposed) {
        delete this._targetRegistry[targetName];
      }
    });
  }

  /**
   * Connect to a comm, or create a new one.
   *
   * #### Notes
   * If a client-side comm already exists, it is returned.
   */
  connectToComm(targetName: string, commId?: string): Kernel.IComm {
    if (commId === void 0) {
      commId = utils.uuid();
    }
    let comm = this._comms.get(commId);
    if (!comm) {
      comm = new CommHandler(
        targetName,
        commId,
        this,
        () => { this._unregisterComm(commId); }
      );
      this._comms.set(commId, comm);
    }
    return comm;
  }

  /**
   * Create the kernel websocket connection and add socket status handlers.
   */
  private _createSocket(): void {
    let partialUrl = utils.urlPathJoin(this._wsUrl, KERNEL_SERVICE_URL,
                                       encodeURIComponent(this._id));
    // Strip any authentication from the display string.
    let parsed = utils.urlParse(partialUrl);
    console.log('Starting websocket', parsed.hostname);

    let url = utils.urlPathJoin(
        partialUrl,
        'channels?session_id=' + encodeURIComponent(this._clientId)
    );
    // if token authentication is in use
    if (this._token !== '') {
      url = url + `&token=${encodeURIComponent(this._token)}`;
    }

    this._connectionPromise = new PromiseDelegate<void>();
    this._ws = new WebSocket(url);

    // Ensure incoming binary messages are not Blobs
    this._ws.binaryType = 'arraybuffer';

    this._ws.onmessage = (evt: MessageEvent) => { this._onWSMessage(evt); };
    this._ws.onopen = (evt: Event) => { this._onWSOpen(evt); };
    this._ws.onclose = (evt: Event) => { this._onWSClose(evt); };
    this._ws.onerror = (evt: Event) => { this._onWSClose(evt); };
  }

  /**
   * Handle a websocket open event.
   */
  private _onWSOpen(evt: Event): void {
    this._reconnectAttempt = 0;
    // Allow the message to get through.
    this._isReady = true;
    // Get the kernel info, signaling that the kernel is ready.
    this.requestKernelInfo().then(() => {
      this._connectionPromise.resolve(void 0);
    }).catch(err => {
      this._connectionPromise.reject(err);
    });
    this._isReady = false;
  }

  /**
   * Handle a websocket message, validating and routing appropriately.
   */
  private _onWSMessage(evt: MessageEvent) {
    if (this.status === 'dead') {
      // If the socket is being closed, ignore any messages
      return;
    }
    let msg = serialize.deserialize(evt.data);
    try {
      validate.validateMessage(msg);
    } catch (error) {
      console.error(`Invalid message: ${error.message}`);
      return;
    }
    if (msg.parent_header) {
      let parentHeader = msg.parent_header as KernelMessage.IHeader;
      let future = this._futures && this._futures.get(parentHeader.msg_id);
      if (future) {
        future.handleMsg(msg);
      } else {
        // If the message was sent by us and was not iopub, it is orphaned.
        let owned = parentHeader.session === this.clientId;
        if (msg.channel !== 'iopub' && owned) {
          this._unhandledMessage.emit(msg);
        }
      }
    }
    if (msg.channel === 'iopub') {
      switch (msg.header.msg_type) {
      case 'status':
        this._updateStatus((msg as KernelMessage.IStatusMsg).content.execution_state);
        break;
      case 'comm_open':
        this._handleCommOpen(msg as KernelMessage.ICommOpenMsg);
        break;
      case 'comm_msg':
        this._handleCommMsg(msg as KernelMessage.ICommMsgMsg);
        break;
      case 'comm_close':
        this._handleCommClose(msg as KernelMessage.ICommCloseMsg);
        break;
      default:
        break;
      }
      this._iopubMessage.emit(msg as KernelMessage.IIOPubMessage);
    }
  }

  /**
   * Handle a websocket close event.
   */
  private _onWSClose(evt: Event) {
    if (this.status === 'dead') {
      return;
    }
    // Clear the websocket event handlers and the socket itself.
    this._ws.onclose = null;
    this._ws.onerror = null;
    this._ws = null;

    if (this._reconnectAttempt < this._reconnectLimit) {
      this._updateStatus('reconnecting');
      let timeout = Math.pow(2, this._reconnectAttempt);
      console.error('Connection lost, reconnecting in ' + timeout + ' seconds.');
      setTimeout(this._createSocket.bind(this), 1e3 * timeout);
      this._reconnectAttempt += 1;
    } else {
      this._updateStatus('dead');
      this._connectionPromise.reject(new Error('Could not establish connection'));
    }
  }

  /**
   * Handle status iopub messages from the kernel.
   */
  private _updateStatus(status: Kernel.Status): void {
    switch (status) {
    case 'starting':
    case 'idle':
    case 'busy':
      this._isReady = true;
      break;
    case 'restarting':
    case 'reconnecting':
    case 'dead':
      this._isReady = false;
      break;
    default:
      console.error('invalid kernel status:', status);
      return;
    }
    if (status !== this._status) {
      this._status = status;
      Private.logKernelStatus(this);
      this._statusChanged.emit(status);
      if (status === 'dead') {
        this.dispose();
      }
    }
    if (this._isReady) {
      this._sendPending();
    }
  }

  /**
   * Send pending messages to the kernel.
   */
  private _sendPending(): void {
    // We shift the message off the queue
    // after the message is sent so that if there is an exception,
    // the message is still pending.
    while (this._pendingMessages.length > 0) {
      let msg = serialize.serialize(this._pendingMessages[0]);
      this._ws.send(msg);
      this._pendingMessages.shift();
    }
  }

  /**
   * Clear the internal state.
   */
  private _clearState(): void {
    this._isReady = false;
    this._pendingMessages = [];
    this._futures.forEach((future, key) => {
      future.dispose();
    });
    this._comms.forEach((comm, key) => {
      comm.dispose();
    });
    this._futures = new Map<string, KernelFutureHandler>();
    this._commPromises = new Map<string, Promise<Kernel.IComm>>();
    this._comms = new Map<string, Kernel.IComm>();
  }

  /**
   * Handle a `comm_open` kernel message.
   */
  private _handleCommOpen(msg: KernelMessage.ICommOpenMsg): void {
    let content = msg.content;
    let promise = utils.loadObject(content.target_name, content.target_module,
      this._targetRegistry).then(target => {
        let comm = new CommHandler(
          content.target_name,
          content.comm_id,
          this,
          () => { this._unregisterComm(content.comm_id); }
        );
        let response : any;
        try {
          response = target(comm, msg);
        } catch (e) {
          comm.close();
          console.error('Exception opening new comm');
          throw(e);
        }
        return Promise.resolve(response).then(() => {
          this._commPromises.delete(comm.commId);
          this._comms.set(comm.commId, comm);
          return comm;
        });
    });
    this._commPromises.set(content.comm_id, promise);
  }

  /**
   * Handle 'comm_close' kernel message.
   */
  private _handleCommClose(msg: KernelMessage.ICommCloseMsg): void {
    let content = msg.content;
    let promise = this._commPromises.get(content.comm_id);
    if (!promise) {
      let comm = this._comms.get(content.comm_id);
      if (!comm) {
        console.error('Comm not found for comm id ' + content.comm_id);
        return;
      }
      promise = Promise.resolve(comm);
    }
    promise.then((comm) => {
      this._unregisterComm(comm.commId);
      try {
        let onClose = comm.onClose;
        if (onClose) {
          onClose(msg);
        }
        (comm as CommHandler).dispose();
      } catch (e) {
        console.error('Exception closing comm: ', e, e.stack, msg);
      }
    });
  }

  /**
   * Handle a 'comm_msg' kernel message.
   */
  private _handleCommMsg(msg: KernelMessage.ICommMsgMsg): void {
    let content = msg.content;
    let promise = this._commPromises.get(content.comm_id);
    if (!promise) {
      let comm = this._comms.get(content.comm_id);
      if (!comm) {
        // We do have a registered comm for this comm id, ignore.
        return;
      } else {
        let onMsg = comm.onMsg;
        if (onMsg) {
          onMsg(msg);
        }
      }
    } else {
      promise.then((comm) => {
        try {
          let onMsg = comm.onMsg;
          if (onMsg) {
            onMsg(msg);
          }
        } catch (e) {
          console.error('Exception handling comm msg: ', e, e.stack, msg);
        }
        return comm;
      });
    }
  }

  /**
   * Unregister a comm instance.
   */
  private _unregisterComm(commId: string) {
    this._comms.delete(commId);
    this._commPromises.delete(commId);
  }

  private _id = '';
  private _token = '';
  private _name = '';
  private _baseUrl = '';
  private _wsUrl = '';
  private _status: Kernel.Status = 'unknown';
  private _clientId = '';
  private _ws: WebSocket = null;
  private _username = '';
  private _ajaxSettings = '{}';
  private _reconnectLimit = 7;
  private _reconnectAttempt = 0;
  private _isReady = false;
  private _futures: Map<string, KernelFutureHandler> = null;
  private _commPromises: Map<string, Promise<Kernel.IComm>> = null;
  private _comms: Map<string, Kernel.IComm> = null;
  private _targetRegistry: { [key: string]: (comm: Kernel.IComm, msg: KernelMessage.ICommOpenMsg) => void; } = Object.create(null);
  private _info: KernelMessage.IInfoReply = null;
  private _pendingMessages: KernelMessage.IMessage[] = [];
  private _connectionPromise: PromiseDelegate<void> = null;
  private _specPromise: Promise<Kernel.ISpecModel> = null;
  private _statusChanged = new Signal<this, Kernel.Status>(this);
  private _iopubMessage = new Signal<this, KernelMessage.IIOPubMessage>(this);
  private _unhandledMessage = new Signal<this, KernelMessage.IMessage>(this);
}


/**
 * The namespace for `DefaultKernel` statics.
 */
export
namespace DefaultKernel {
  /**
   * Find a kernel by id.
   *
   * #### Notes
   * If the kernel was already started via `startNewKernel`, we return its
   * `Kernel.IModel`.
   *
   * Otherwise, if `options` are given, we attempt to find the existing
   * kernel.
   * The promise is fulfilled when the kernel is found,
   * otherwise the promise is rejected.
   */
  export
  function findById(id: string, options?: Kernel.IOptions): Promise<Kernel.IModel> {
    return Private.findById(id, options);
  }

  /**
   * Fetch all of the kernel specs.
   *
   * #### Notes
   * Uses the [Jupyter Notebook API](http://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter/notebook/master/notebook/services/api/api.yaml#!/kernelspecs).
   */
  export
  function getSpecs(options: Kernel.IOptions = {}): Promise<Kernel.ISpecModels> {
    return Private.getSpecs(options);
  }

  /**
   * Fetch the running kernels.
   *
   * #### Notes
   * Uses the [Jupyter Notebook API](http://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter/notebook/master/notebook/services/api/api.yaml#!/kernels) and validates the response model.
   *
   * The promise is fulfilled on a valid response and rejected otherwise.
   */
  export
  function listRunning(options: Kernel.IOptions = {}): Promise<Kernel.IModel[]> {
    return Private.listRunning(options);
  }

  /**
   * Start a new kernel.
   *
   * #### Notes
   * Uses the [Jupyter Notebook API](http://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter/notebook/master/notebook/services/api/api.yaml#!/kernels) and validates the response model.
   *
   * If no options are given or the kernel name is not given, the
   * default kernel will by started by the server.
   *
   * Wraps the result in a Kernel object. The promise is fulfilled
   * when the kernel is started by the server, otherwise the promise is rejected.
   */
  export
  function startNew(options?: Kernel.IOptions): Promise<Kernel.IKernel> {
    options = options || {};
    return Private.startNew(options);
  }

  /**
   * Connect to a running kernel.
   *
   * #### Notes
   * If the kernel was already started via `startNewKernel`, the existing
   * Kernel object info is used to create another instance.
   *
   * Otherwise, if `options` are given, we attempt to connect to the existing
   * kernel found by calling `listRunningKernels`.
   * The promise is fulfilled when the kernel is running on the server,
   * otherwise the promise is rejected.
   *
   * If the kernel was not already started and no `options` are given,
   * the promise is rejected.
   */
  export
  function connectTo(id: string, options?: Kernel.IOptions): Promise<Kernel.IKernel> {
    return Private.connectTo(id, options);
  }

  /**
   * Shut down a kernel by id.
   */
  export
  function shutdown(id: string, options: Kernel.IOptions = {}): Promise<void> {
    return Private.shutdown(id, options);
  }
}


/**
 * A private namespace for the Kernel.
 */
namespace Private {
  /**
   * A module private store for running kernels.
   */
  export
  const runningKernels: DefaultKernel[] = [];

  /**
   * A module private store of kernel specs by base url.
   */
  export
  const specs: { [key: string]: Promise<Kernel.ISpecModels> } = Object.create(null);

  /**
   * Find a kernel by id.
   */
  export
  function findById(id: string, options?: Kernel.IOptions): Promise<Kernel.IModel> {
    let kernel = find(runningKernels, value => {
      return (value.id === id);
    });
    if (kernel) {
      return Promise.resolve(kernel.model);
    }
    return getKernelModel(id, options).catch(() => {
      throw new Error(`No running kernel with id: ${id}`);
    });
  }

  /**
   * Get the cached kernel specs or fetch them.
   */
  export
  function findSpecs(options: Kernel.IOptions): Promise<Kernel.ISpecModels> {
    let promise = specs[options.baseUrl];
    if (promise) {
      return promise;
    }
    return getSpecs(options);
  }

  /**
   * Fetch all of the kernel specs.
   *
   * #### Notes
   * Uses the [Jupyter Notebook API](http://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter/notebook/master/notebook/services/api/api.yaml#!/kernelspecs).
   */
  export
  function getSpecs(options: Kernel.IOptions = {}): Promise<Kernel.ISpecModels> {
    let baseUrl = options.baseUrl || utils.getBaseUrl();
    let url = utils.urlPathJoin(baseUrl, KERNELSPEC_SERVICE_URL);
    let ajaxSettings: IAjaxSettings = utils.ajaxSettingsWithToken(options.ajaxSettings, options.token);
    ajaxSettings.method = 'GET';
    ajaxSettings.dataType = 'json';
    let promise = utils.ajaxRequest(url, ajaxSettings).then(success => {
      if (success.xhr.status !== 200) {
        throw utils.makeAjaxError(success);
      }
      try {
        return validate.validateSpecModels(success.data);
      } catch (err) {
        throw utils.makeAjaxError(success, err.message);
      }
    });
    Private.specs[baseUrl] = promise;
    return promise;
  }

  /**
   * Fetch the running kernels.
   *
   * #### Notes
   * Uses the [Jupyter Notebook API](http://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter/notebook/master/notebook/services/api/api.yaml#!/kernels) and validates the response model.
   *
   * The promise is fulfilled on a valid response and rejected otherwise.
   */
  export
  function listRunning(options: Kernel.IOptions = {}): Promise<Kernel.IModel[]> {
    let baseUrl = options.baseUrl || utils.getBaseUrl();
    let url = utils.urlPathJoin(baseUrl, KERNEL_SERVICE_URL);
    let ajaxSettings: IAjaxSettings = utils.ajaxSettingsWithToken(options.ajaxSettings, options.token);
    ajaxSettings.method = 'GET';
    ajaxSettings.dataType = 'json';
    ajaxSettings.cache = false;

    return utils.ajaxRequest(url, ajaxSettings).then(success => {
      if (success.xhr.status !== 200) {
        throw utils.makeAjaxError(success);
      }
      if (!Array.isArray(success.data)) {
        throw utils.makeAjaxError(success, 'Invalid kernel list');
      }
      for (let i = 0; i < success.data.length; i++) {
        try {
          validate.validateModel(success.data[i]);
        } catch (err) {
          throw utils.makeAjaxError(success, err.message);
        }
      }
      return updateRunningKernels(success.data);
    }, onKernelError);
  }

  /**
   * Update the running kernels based on new data from the server.
   */
  export
  function updateRunningKernels(kernels: Kernel.IModel[]): Kernel.IModel[] {
    each(runningKernels, kernel => {
      let updated = find(kernels, model => {
        if (kernel.id === model.id) {
          return true;
        }
      });
      // If kernel is no longer running on disk, emit dead signal.
      if (!updated && kernel.status !== 'dead') {
        kernel.terminated.emit(void 0);
        kernel.dispose();
      }
    });
    return kernels;
  }

  /**
   * Start a new kernel.
   */
  export
  function startNew(options?: Kernel.IOptions): Promise<Kernel.IKernel> {
    options = options || {};
    let baseUrl = options.baseUrl || utils.getBaseUrl();
    let url = utils.urlPathJoin(baseUrl, KERNEL_SERVICE_URL);
    let ajaxSettings: IAjaxSettings = utils.ajaxSettingsWithToken(options.ajaxSettings, options.token);
    ajaxSettings.method = 'POST';
    ajaxSettings.data = JSON.stringify({ name: options.name });
    ajaxSettings.dataType = 'json';
    ajaxSettings.contentType = 'application/json';
    ajaxSettings.cache = false;

    return utils.ajaxRequest(url, ajaxSettings).then(success => {
      if (success.xhr.status !== 201) {
        throw utils.makeAjaxError(success);
      }
      validate.validateModel(success.data);
      options = utils.copy(options) as Kernel.IOptions;
      options.name = success.data.name;
      return new DefaultKernel(options, success.data.id);
    }, onKernelError);
  }

  /**
   * Connect to a running kernel.
   *
   * #### Notes
   * If the kernel was already started via `startNewKernel`, the existing
   * Kernel object info is used to create another instance.
   *
   * Otherwise, if `options` are given, we attempt to connect to the existing
   * kernel found by calling `listRunningKernels`.
   * The promise is fulfilled when the kernel is running on the server,
   * otherwise the promise is rejected.
   *
   * If the kernel was not already started and no `options` are given,
   * the promise is rejected.
   */
  export
  function connectTo(id: string, options?: Kernel.IOptions): Promise<Kernel.IKernel> {
    let kernel = find(runningKernels, value => {
      return value.id === id;
    });
    if (kernel) {
      return Promise.resolve(kernel.clone());
    }

    return getKernelModel(id, options).then(model => {
      options = utils.copy(options) as Kernel.IOptions;
      options.name = model.name;
      return new DefaultKernel(options, id);
    }).catch(() => {
      throw new Error(`No running kernel with id: ${id}`);
    });
  }

  /**
   * Shut down a kernel by id.
   */
  export
  function shutdown(id: string, options: Kernel.IOptions = {}): Promise<void> {
    let baseUrl = options.baseUrl || utils.getBaseUrl();
    let ajaxSettings = utils.ajaxSettingsWithToken(options.ajaxSettings, options.token);
    return shutdownKernel(id, baseUrl, ajaxSettings);
  }

  /**
   * Restart a kernel.
   */
  export
  function restartKernel(kernel: Kernel.IKernel, baseUrl: string, ajaxSettings?: IAjaxSettings): Promise<void> {
    if (kernel.status === 'dead') {
      return Promise.reject(new Error('Kernel is dead'));
    }
    let url = utils.urlPathJoin(
      baseUrl, KERNEL_SERVICE_URL,
      encodeURIComponent(kernel.id), 'restart'
    );
    ajaxSettings = ajaxSettings || { };
    ajaxSettings.method = 'POST';
    ajaxSettings.dataType = 'json';
    ajaxSettings.cache = false;

    return utils.ajaxRequest(url, ajaxSettings).then(success => {
      if (success.xhr.status !== 200) {
        throw utils.makeAjaxError(success);
      }
      try {
        validate.validateModel(success.data);
      } catch (err) {
        throw utils.makeAjaxError(success, err.message);
      }
    }, onKernelError);
  }

  /**
   * Interrupt a kernel.
   */
  export
  function interruptKernel(kernel: Kernel.IKernel, baseUrl: string, ajaxSettings?: IAjaxSettings): Promise<void> {
    if (kernel.status === 'dead') {
      return Promise.reject(new Error('Kernel is dead'));
    }
    let url = utils.urlPathJoin(
      baseUrl, KERNEL_SERVICE_URL,
      encodeURIComponent(kernel.id), 'interrupt'
    );
    ajaxSettings = ajaxSettings || { };
    ajaxSettings.method = 'POST';
    ajaxSettings.dataType = 'json';
    ajaxSettings.cache = false;

    return utils.ajaxRequest(url, ajaxSettings).then(success => {
      if (success.xhr.status !== 204) {
        throw utils.makeAjaxError(success);
      }
    }, onKernelError);
  }

  /**
   * Delete a kernel.
   */
  export
  function shutdownKernel(id: string, baseUrl: string, ajaxSettings?: IAjaxSettings): Promise<void> {
    let url = utils.urlPathJoin(baseUrl, KERNEL_SERVICE_URL,
                                encodeURIComponent(id));
    ajaxSettings = ajaxSettings || { };
    ajaxSettings.method = 'DELETE';
    ajaxSettings.dataType = 'json';
    ajaxSettings.cache = false;

    return utils.ajaxRequest(url, ajaxSettings).then(success => {
      if (success.xhr.status !== 204) {
        throw utils.makeAjaxError(success);
      }
      killKernels(id);
    }, (error: utils.IAjaxError) => {
      if (error.xhr.status === 404) {
        let response = JSON.parse(error.xhr.responseText) as any;
        console.warn(response['message']);
        killKernels(id);
      } else {
        return onKernelError(error);
      }
    });
  }

  /**
   * Kill the kernels by id.
   */
  function killKernels(id: string): void {
    each(toArray(runningKernels), kernel => {
      if (kernel.id === id) {
        kernel.terminated.emit(void 0);
        kernel.dispose();
      }
    });
  }

  /**
   * Get a full kernel model from the server by kernel id string.
   */
  export
  function getKernelModel(id: string, options?: Kernel.IOptions): Promise<Kernel.IModel> {
    options = options || {};
    let baseUrl = options.baseUrl || utils.getBaseUrl();
    let url = utils.urlPathJoin(baseUrl, KERNEL_SERVICE_URL,
                                encodeURIComponent(id));
    let ajaxSettings = utils.ajaxSettingsWithToken(options.ajaxSettings, options.token);
    ajaxSettings.method = 'GET';
    ajaxSettings.dataType = 'json';
    ajaxSettings.cache = false;

    return utils.ajaxRequest(url, ajaxSettings).then(success => {
      if (success.xhr.status !== 200) {
        throw utils.makeAjaxError(success);
      }
      let data = success.data as Kernel.IModel;
      try {
        validate.validateModel(data);
      } catch (err) {
        throw utils.makeAjaxError(success, err.message);
      }
      return data;
    }, Private.onKernelError);
  }

  /**
   * Log the current kernel status.
   */
  export
  function logKernelStatus(kernel: Kernel.IKernel): void {
    switch (kernel.status) {
    case 'idle':
    case 'busy':
    case 'unknown':
      return;
    default:
      console.log(`Kernel: ${kernel.status} (${kernel.id})`);
      break;
    }
  }

  /**
   * Handle an error on a kernel Ajax call.
   */
  export
  function onKernelError(error: utils.IAjaxError): Promise<any> {
    let text = (error.throwError ||
                error.xhr.statusText ||
                error.xhr.responseText);
    let msg = `API request failed: ${text}`;
    console.error(msg);
    return Promise.reject(error);
  }

  /**
   * Send a kernel message to the kernel and resolve the reply message.
   */
  export
  function handleShellMessage(kernel: Kernel.IKernel, msg: KernelMessage.IShellMessage): Promise<KernelMessage.IShellMessage> {
    let future: Kernel.IFuture;
    try {
      future = kernel.sendShellMessage(msg, true);
    } catch (e) {
      return Promise.reject(e);
    }
    return new Promise<any>((resolve, reject) => {
      future.onReply = (reply: KernelMessage.IMessage) => {
        resolve(reply);
      };
    });
  }
}
