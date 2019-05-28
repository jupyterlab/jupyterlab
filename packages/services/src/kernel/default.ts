// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { URLExt } from '@jupyterlab/coreutils';

import { UUID } from '@phosphor/coreutils';

import { ArrayExt, each, find } from '@phosphor/algorithm';

import { JSONExt, JSONObject, PromiseDelegate } from '@phosphor/coreutils';

import { ISignal, Signal } from '@phosphor/signaling';

import { ServerConnection } from '..';

import { CommHandler } from './comm';

import { Kernel } from './kernel';

import { KernelMessage } from './messages';

import { KernelFutureHandler } from './future';

import * as serialize from './serialize';

import * as validate from './validate';

/**
 * The url for the kernel service.
 */
const KERNEL_SERVICE_URL = 'api/kernels';

/**
 * The url for the kernelspec service.
 */
const KERNELSPEC_SERVICE_URL = 'api/kernelspecs';

// Stub for requirejs.
declare var requirejs: any;

/**
 * Implementation of the Kernel object.
 *
 * #### Notes
 * Messages from the server are handled in the order they were received and
 * asynchronously. Any message handler can return a promise, and message
 * handling will pause until the promise is fulfilled.
 */
export class DefaultKernel implements Kernel.IKernel {
  /**
   * Construct a kernel object.
   */
  constructor(options: Kernel.IOptions, id: string) {
    this._name = options.name;
    this._id = id;
    this.serverSettings =
      options.serverSettings || ServerConnection.makeSettings();
    this._clientId = options.clientId || UUID.uuid4();
    this._username = options.username || '';

    void this._readyPromise.promise.then(() => {
      this._sendPending();
    });

    this._createSocket();
    Private.runningKernels.push(this);
  }

  /**
   * A signal emitted when the kernel is shut down.
   */
  get terminated(): ISignal<this, void> {
    return this._terminated;
  }

  /**
   * The server settings for the kernel.
   */
  readonly serverSettings: ServerConnection.ISettings;

  /**
   * A signal emitted when the kernel status changes.
   */
  get statusChanged(): ISignal<this, Kernel.Status> {
    return this._statusChanged;
  }

  /**
   * A signal emitted for iopub kernel messages.
   *
   * #### Notes
   * This signal is emitted after the iopub message is handled asynchronously.
   */
  get iopubMessage(): ISignal<this, KernelMessage.IIOPubMessage> {
    return this._iopubMessage;
  }

  /**
   * A signal emitted for unhandled kernel message.
   *
   * #### Notes
   * This signal is emitted for a message that was not handled. It is emitted
   * during the asynchronous message handling code.
   */
  get unhandledMessage(): ISignal<this, KernelMessage.IMessage> {
    return this._unhandledMessage;
  }

  /**
   * A signal emitted for any kernel message.
   *
   * #### Notes
   * This signal is emitted when a message is received, before it is handled
   * asynchronously.
   *
   * The behavior is undefined if the message is modified during message
   * handling. As such, the message should be treated as read-only.
   */
  get anyMessage(): ISignal<this, Kernel.IAnyMessageArgs> {
    return this._anyMessage;
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
   * Test whether the kernel has been disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
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
    return this._readyPromise.promise;
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
    this._specPromise = Private.findSpecs(this.serverSettings).then(specs => {
      return specs.kernelspecs[this._name];
    });
    return this._specPromise;
  }

  /**
   * Clone the current kernel with a new clientId.
   */
  clone(): Kernel.IKernel {
    return new DefaultKernel(
      {
        name: this._name,
        username: this._username,
        serverSettings: this.serverSettings
      },
      this._id
    );
  }

  /**
   * Dispose of the resources held by the kernel.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;
    this._terminated.emit();
    this._status = 'dead';
    // Trigger the async _clearState, but do not wait for it.
    void this._clearState();
    this._clearSocket();
    this._kernelSession = '';
    this._msgChain = null;
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
  sendShellMessage<T extends KernelMessage.ShellMessageType>(
    msg: KernelMessage.IShellMessage<T>,
    expectReply = false,
    disposeOnDone = true
  ): Kernel.IFuture<KernelMessage.IShellMessage<T>> {
    if (this.status === 'dead') {
      throw new Error('Kernel is dead');
    }
    if (!this._isReady || !this._ws) {
      this._pendingMessages.push(msg);
    } else {
      this._ws.send(serialize.serialize(msg));
    }
    this._anyMessage.emit({ msg, direction: 'send' });
    let future = new KernelFutureHandler(
      () => {
        let msgId = msg.header.msg_id;
        this._futures.delete(msgId);
        // Remove stored display id information.
        let displayIds = this._msgIdToDisplayIds.get(msgId);
        if (!displayIds) {
          return;
        }
        displayIds.forEach(displayId => {
          let msgIds = this._displayIdToParentIds.get(displayId);
          if (msgIds) {
            let idx = msgIds.indexOf(msgId);
            if (idx === -1) {
              return;
            }
            if (msgIds.length === 1) {
              this._displayIdToParentIds.delete(displayId);
            } else {
              msgIds.splice(idx, 1);
              this._displayIdToParentIds.set(displayId, msgIds);
            }
          }
        });
        this._msgIdToDisplayIds.delete(msgId);
      },
      msg,
      expectReply,
      disposeOnDone,
      this
    );
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
    return Private.interruptKernel(this, this.serverSettings);
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
    return Private.restartKernel(this, this.serverSettings);
  }

  /**
   * Handle a restart on the kernel.  This is not part of the `IKernel`
   * interface.
   */
  async handleRestart(): Promise<void> {
    await this._clearState();
    this._updateStatus('restarting');
  }

  /**
   * Reconnect to a disconnected kernel.
   *
   * #### Notes
   * Used when the websocket connection to the kernel is lost.
   */
  reconnect(): Promise<void> {
    this._clearSocket();
    this._updateStatus('reconnecting');
    this._createSocket();
    return this._readyPromise.promise;
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
   * If the kernel is already `dead`, it closes the websocket and returns
   * without a server request.
   */
  async shutdown(): Promise<void> {
    if (this.status === 'dead') {
      this._clearSocket();
      await this._clearState();
      return;
    }
    await Private.shutdownKernel(this.id, this.serverSettings);
    await this._clearState();
    this._clearSocket();
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
  async requestKernelInfo(): Promise<KernelMessage.IInfoReplyMsg> {
    let msg = KernelMessage.createMessage({
      msgType: 'kernel_info_request',
      channel: 'shell',
      username: this._username,
      session: this._clientId,
      content: {}
    });
    let reply = (await Private.handleShellMessage(
      this,
      msg
    )) as KernelMessage.IInfoReplyMsg;
    if (this.isDisposed) {
      throw new Error('Disposed kernel');
    }
    this._info = reply.content;
    return reply;
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
  requestComplete(
    content: KernelMessage.ICompleteRequest
  ): Promise<KernelMessage.ICompleteReplyMsg> {
    let msg = KernelMessage.createMessage({
      msgType: 'complete_request',
      channel: 'shell',
      username: this._username,
      session: this._clientId,
      content
    });
    return Private.handleShellMessage(this, msg) as Promise<
      KernelMessage.ICompleteReplyMsg
    >;
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
  requestInspect(
    content: KernelMessage.IInspectRequest
  ): Promise<KernelMessage.IInspectReplyMsg> {
    let msg = KernelMessage.createMessage({
      msgType: 'inspect_request',
      channel: 'shell',
      username: this._username,
      session: this._clientId,
      content: content
    });
    return Private.handleShellMessage(this, msg) as Promise<
      KernelMessage.IInspectReplyMsg
    >;
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
  requestHistory(
    content: KernelMessage.IHistoryRequest
  ): Promise<KernelMessage.IHistoryReplyMsg> {
    let msg = KernelMessage.createMessage({
      msgType: 'history_request',
      channel: 'shell',
      username: this._username,
      session: this._clientId,
      content
    });
    return Private.handleShellMessage(this, msg) as Promise<
      KernelMessage.IHistoryReplyMsg
    >;
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
  requestExecute(
    content: KernelMessage.IExecuteRequest,
    disposeOnDone: boolean = true,
    metadata?: JSONObject
  ): Kernel.IFuture<
    KernelMessage.IExecuteRequestMsg,
    KernelMessage.IExecuteReplyMsg
  > {
    let defaults: JSONObject = {
      silent: false,
      store_history: true,
      user_expressions: {},
      allow_stdin: true,
      stop_on_error: false
    };
    let msg = KernelMessage.createMessage({
      msgType: 'execute_request',
      channel: 'shell',
      username: this._username,
      session: this._clientId,
      content: { ...defaults, ...content }
    });
    return this.sendShellMessage(msg, true, disposeOnDone) as Kernel.IFuture<
      KernelMessage.IExecuteRequestMsg,
      KernelMessage.IExecuteReplyMsg
    >;
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
  requestIsComplete(
    content: KernelMessage.IIsCompleteRequest
  ): Promise<KernelMessage.IIsCompleteReplyMsg> {
    let msg = KernelMessage.createMessage({
      msgType: 'is_complete_request',
      channel: 'shell',
      username: this._username,
      session: this._clientId,
      content
    });
    return Private.handleShellMessage(this, msg) as Promise<
      KernelMessage.IIsCompleteReplyMsg
    >;
  }

  /**
   * Send a `comm_info_request` message.
   *
   * #### Notes
   * Fulfills with the `comm_info_reply` content when the shell reply is
   * received and validated.
   */
  requestCommInfo(
    content: KernelMessage.ICommInfoRequest
  ): Promise<KernelMessage.ICommInfoReplyMsg> {
    let msg = KernelMessage.createMessage({
      msgType: 'comm_info_request',
      channel: 'shell',
      username: this._username,
      session: this._clientId,
      content
    });
    return Private.handleShellMessage(this, msg) as Promise<
      KernelMessage.ICommInfoReplyMsg
    >;
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
    let msg = KernelMessage.createMessage({
      msgType: 'input_reply',
      channel: 'stdin',
      username: this._username,
      session: this._clientId,
      content
    });
    if (!this._isReady || !this._ws) {
      this._pendingMessages.push(msg);
    } else {
      this._ws.send(serialize.serialize(msg));
    }
    this._anyMessage.emit({ msg, direction: 'send' });
  }

  /**
   * Connect to a comm, or create a new one.
   *
   * #### Notes
   * If a client-side comm already exists with the given commId, it is returned.
   */
  connectToComm(
    targetName: string,
    commId: string = UUID.uuid4()
  ): Kernel.IComm {
    if (this._comms.has(commId)) {
      return this._comms.get(commId);
    }
    let comm = new CommHandler(targetName, commId, this, () => {
      this._unregisterComm(commId);
    });
    this._comms.set(commId, comm);
    return comm;
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
   * Only one comm target can be registered to a target name at a time, an
   * existing callback for the same target name will be overridden.  A registered
   * comm target handler will take precedence over a comm which specifies a
   * `target_module`.
   *
   * If the callback returns a promise, kernel message processing will pause
   * until the returned promise is fulfilled.
   */
  registerCommTarget(
    targetName: string,
    callback: (
      comm: Kernel.IComm,
      msg: KernelMessage.ICommOpenMsg
    ) => void | PromiseLike<void>
  ): void {
    this._targetRegistry[targetName] = callback;
  }

  /**
   * Remove a comm target handler.
   *
   * @param targetName - The name of the comm target to remove.
   *
   * @param callback - The callback to remove.
   *
   * #### Notes
   * The comm target is only removed the callback argument matches.
   */
  removeCommTarget(
    targetName: string,
    callback: (
      comm: Kernel.IComm,
      msg: KernelMessage.ICommOpenMsg
    ) => void | PromiseLike<void>
  ): void {
    if (!this.isDisposed && this._targetRegistry[targetName] === callback) {
      delete this._targetRegistry[targetName];
    }
  }

  /**
   * Register an IOPub message hook.
   *
   * @param msg_id - The parent_header message id the hook will intercept.
   *
   * @param hook - The callback invoked for the message.
   *
   * #### Notes
   * The IOPub hook system allows you to preempt the handlers for IOPub
   * messages that are responses to a given message id.
   *
   * The most recently registered hook is run first. A hook can return a
   * boolean or a promise to a boolean, in which case all kernel message
   * processing pauses until the promise is fulfilled. If a hook return value
   * resolves to false, any later hooks will not run and the function will
   * return a promise resolving to false. If a hook throws an error, the error
   * is logged to the console and the next hook is run. If a hook is
   * registered during the hook processing, it will not run until the next
   * message. If a hook is removed during the hook processing, it will be
   * deactivated immediately.
   *
   * See also [[IFuture.registerMessageHook]].
   */
  registerMessageHook(
    msgId: string,
    hook: (msg: KernelMessage.IIOPubMessage) => boolean | PromiseLike<boolean>
  ): void {
    let future = this._futures && this._futures.get(msgId);
    if (future) {
      future.registerMessageHook(hook);
    }
  }

  /**
   * Remove an IOPub message hook.
   *
   * @param msg_id - The parent_header message id the hook intercepted.
   *
   * @param hook - The callback invoked for the message.
   *
   */
  removeMessageHook(
    msgId: string,
    hook: (msg: KernelMessage.IIOPubMessage) => boolean | PromiseLike<boolean>
  ): void {
    let future = this._futures && this._futures.get(msgId);
    if (future) {
      future.removeMessageHook(hook);
    }
  }

  /**
   * Handle a message with a display id.
   *
   * @returns Whether the message was handled.
   */
  private async _handleDisplayId(
    displayId: string,
    msg: KernelMessage.IMessage
  ): Promise<boolean> {
    let msgId = (msg.parent_header as KernelMessage.IHeader).msg_id;
    let parentIds = this._displayIdToParentIds.get(displayId);
    if (parentIds) {
      // We've seen it before, update existing outputs with same display_id
      // by handling display_data as update_display_data.
      let updateMsg: KernelMessage.IMessage = {
        header: (JSONExt.deepCopy(
          (msg.header as unknown) as JSONObject
        ) as unknown) as KernelMessage.IHeader,
        parent_header: (JSONExt.deepCopy(
          (msg.parent_header as unknown) as JSONObject
        ) as unknown) as KernelMessage.IHeader,
        metadata: JSONExt.deepCopy(msg.metadata),
        content: JSONExt.deepCopy(msg.content as JSONObject),
        channel: msg.channel,
        buffers: msg.buffers ? msg.buffers.slice() : []
      };
      (updateMsg.header as any).msg_type = 'update_display_data';

      await Promise.all(
        parentIds.map(async parentId => {
          let future = this._futures && this._futures.get(parentId);
          if (future) {
            await future.handleMsg(updateMsg);
          }
        })
      );
    }

    // We're done here if it's update_display.
    if (msg.header.msg_type === 'update_display_data') {
      // It's an update, don't proceed to the normal display.
      return true;
    }

    // Regular display_data with id, record it for future updating
    // in _displayIdToParentIds for future lookup.
    parentIds = this._displayIdToParentIds.get(displayId) || [];
    if (parentIds.indexOf(msgId) === -1) {
      parentIds.push(msgId);
    }
    this._displayIdToParentIds.set(displayId, parentIds);

    // Add to our map of display ids for this message.
    let displayIds = this._msgIdToDisplayIds.get(msgId) || [];
    if (displayIds.indexOf(msgId) === -1) {
      displayIds.push(msgId);
    }
    this._msgIdToDisplayIds.set(msgId, displayIds);

    // Let the message propagate to the intended recipient.
    return false;
  }

  /**
   * Clear the socket state.
   *
   * #### Notes
   * When calling this, you should also set the status to something like
   * 'reconnecting' to reset the kernel ready state.
   */
  private _clearSocket(): void {
    this._wsStopped = true;
    if (this._ws !== null) {
      // Clear the websocket event handlers and the socket itself.
      this._ws.onopen = this._noOp;
      this._ws.onclose = this._noOp;
      this._ws.onerror = this._noOp;
      this._ws.onmessage = this._noOp;
      this._ws.close();
      this._ws = null;
    }
  }

  /**
   * Handle status iopub messages from the kernel.
   */
  private _updateStatus(status: Kernel.Status): void {
    switch (status) {
      case 'idle':
      case 'busy':
        if (!this._isReady && this._initialized) {
          this._isReady = true;
          this._readyPromise.resolve();
        }
        break;
      case 'restarting':
        // Send a kernel_info_request to get to a known kernel state.
        void this.requestKernelInfo().catch(this._noOp);
        break;
      case 'starting':
      case 'autorestarting':
        // 'starting' can happen at initialization or 'restarting'.
        // 'autorestarting' is always preceded by 'restarting'. In either case,
        // the 'restarting' handler above is fine, so we do nothing here.
        /* no-op */
        break;
      case 'connected':
        // requestKernelInfo is sent by the onWSOpen
        break;
      case 'reconnecting':
        if (this._isReady) {
          this._isReady = false;
          this._readyPromise = new PromiseDelegate();
          void this._readyPromise.promise.then(() => {
            // when we are ready again, send any pending messages.
            this._sendPending();
          });
        }
        break;
      case 'dead':
        if (this._isReady) {
          this._isReady = false;
          this._readyPromise = new PromiseDelegate();
        }
        void this._readyPromise.promise.catch(this._noOp);
        this._readyPromise.reject('Kernel is dead');
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
  }

  /**
   * Send pending messages to the kernel.
   */
  private _sendPending(): void {
    // We shift the message off the queue
    // after the message is sent so that if there is an exception,
    // the message is still pending.
    while (this._ws && this._pendingMessages.length > 0) {
      let msg = serialize.serialize(this._pendingMessages[0]);
      this._ws.send(msg);
      this._pendingMessages.shift();
    }
  }

  /**
   * Clear the internal state.
   */
  private async _clearState(): Promise<void> {
    this._pendingMessages = [];
    const futuresResolved: Promise<void>[] = [];
    this._futures.forEach(future => {
      futuresResolved.push(future.done.then(this._noOp, this._noOp));
      future.dispose();
    });
    this._comms.forEach(comm => {
      comm.dispose();
    });
    this._msgChain = Promise.resolve();
    this._kernelSession = '';
    this._futures = new Map<string, KernelFutureHandler>();
    this._comms = new Map<string, Kernel.IComm>();
    this._displayIdToParentIds.clear();
    this._msgIdToDisplayIds.clear();

    await Promise.all(futuresResolved);
  }

  /**
   * Check to make sure it is okay to proceed to handle a message.
   *
   * #### Notes
   * Because we handle messages asynchronously, before a message is handled the
   * kernel might be disposed or restarted (and have a different session id).
   * This function throws an error in each of these cases. This is meant to be
   * called at the start of an asynchronous message handler to cancel message
   * processing if the message no longer is valid.
   */
  private _assertCurrentMessage(msg: KernelMessage.IMessage) {
    if (this.isDisposed) {
      throw new Error('Kernel object is disposed');
    }

    if (msg.header.session !== this._kernelSession) {
      throw new Error(
        `Canceling handling of old message: ${msg.header.msg_type}`
      );
    }
  }

  /**
   * Handle a `comm_open` kernel message.
   */
  private async _handleCommOpen(
    msg: KernelMessage.ICommOpenMsg
  ): Promise<void> {
    this._assertCurrentMessage(msg);
    let content = msg.content;
    let comm = new CommHandler(
      content.target_name,
      content.comm_id,
      this,
      () => {
        this._unregisterComm(content.comm_id);
      }
    );
    this._comms.set(content.comm_id, comm);

    try {
      let target = await Private.loadObject(
        content.target_name,
        content.target_module,
        this._targetRegistry
      );
      await target(comm, msg);
    } catch (e) {
      // Close the comm asynchronously. We cannot block message processing on
      // kernel messages to wait for another kernel message.
      comm.close();
      console.error('Exception opening new comm');
      throw e;
    }
  }

  /**
   * Handle 'comm_close' kernel message.
   */
  private async _handleCommClose(
    msg: KernelMessage.ICommCloseMsg
  ): Promise<void> {
    this._assertCurrentMessage(msg);
    let content = msg.content;
    let comm = this._comms.get(content.comm_id);
    if (!comm) {
      console.error('Comm not found for comm id ' + content.comm_id);
      return;
    }
    this._unregisterComm(comm.commId);
    let onClose = comm.onClose;
    if (onClose) {
      // tslint:disable-next-line:await-promise
      await onClose(msg);
    }
    (comm as CommHandler).dispose();
  }

  /**
   * Handle a 'comm_msg' kernel message.
   */
  private async _handleCommMsg(msg: KernelMessage.ICommMsgMsg): Promise<void> {
    this._assertCurrentMessage(msg);
    let content = msg.content;
    let comm = this._comms.get(content.comm_id);
    if (!comm) {
      return;
    }
    let onMsg = comm.onMsg;
    if (onMsg) {
      // tslint:disable-next-line:await-promise
      await onMsg(msg);
    }
  }

  /**
   * Unregister a comm instance.
   */
  private _unregisterComm(commId: string) {
    this._comms.delete(commId);
  }

  /**
   * Create the kernel websocket connection and add socket status handlers.
   */
  private _createSocket = () => {
    if (this.isDisposed) {
      return;
    }
    let settings = this.serverSettings;
    let partialUrl = URLExt.join(
      settings.wsUrl,
      KERNEL_SERVICE_URL,
      encodeURIComponent(this._id)
    );

    // Strip any authentication from the display string.
    // TODO - Audit tests for extra websockets started
    let display = partialUrl.replace(/^((?:\w+:)?\/\/)(?:[^@\/]+@)/, '$1');
    console.log('Starting WebSocket:', display);

    let url = URLExt.join(
      partialUrl,
      'channels?session_id=' + encodeURIComponent(this._clientId)
    );
    // If token authentication is in use.
    let token = settings.token;
    if (token !== '') {
      url = url + `&token=${encodeURIComponent(token)}`;
    }

    this._wsStopped = false;
    this._ws = new settings.WebSocket(url);

    // Ensure incoming binary messages are not Blobs
    this._ws.binaryType = 'arraybuffer';

    this._ws.onmessage = this._onWSMessage;
    this._ws.onopen = this._onWSOpen;
    this._ws.onclose = this._onWSClose;
    this._ws.onerror = this._onWSClose;
  };

  /**
   * Handle a websocket open event.
   */
  private _onWSOpen = (evt: Event) => {
    this._reconnectAttempt = 0;
    this._updateStatus('connected');

    // We temporarily set the ready status to true so our kernel info request
    // below will go through.
    this._isReady = true;

    // Get the kernel info, signaling that the kernel is ready.
    this.requestKernelInfo()
      .then(() => {
        this._initialized = true;
        this._isReady = true;
        this._readyPromise.resolve();
      })
      .catch(err => {
        this._initialized = true;
        this._readyPromise.reject(err);
      });

    // Reset the isReady status after we sent our message so others wait for
    // the kernel info request to come back.
    this._isReady = false;
  };

  /**
   * Handle a websocket message, validating and routing appropriately.
   */
  private _onWSMessage = (evt: MessageEvent) => {
    if (this._wsStopped) {
      // If the socket is being closed, ignore any messages
      return;
    }

    // Notify immediately if there is an error with the message.
    let msg: KernelMessage.IMessage;
    try {
      msg = serialize.deserialize(evt.data);
      validate.validateMessage(msg);
    } catch (error) {
      error.message = `Kernel message validation error: ${error.message}`;
      // We throw the error so that it bubbles up to the top, and displays the right stack.
      throw error;
    }

    // Update the current kernel session id
    this._kernelSession = msg.header.session;

    // Handle the message asynchronously, in the order received.
    this._msgChain = this._msgChain
      .then(() => {
        // Return so that any promises from handling a message are fulfilled
        // before proceeding to the next message.
        return this._handleMessage(msg);
      })
      .catch(error => {
        // Log any errors in handling the message, thus resetting the _msgChain
        // promise so we can process more messages.
        console.error(error);
      });

    // Emit the message receive signal
    this._anyMessage.emit({ msg, direction: 'recv' });
  };

  private async _handleMessage(msg: KernelMessage.IMessage): Promise<void> {
    let handled = false;

    // Check to see if we have a display_id we need to reroute.
    if (
      msg.parent_header &&
      msg.channel === 'iopub' &&
      (KernelMessage.isDisplayDataMsg(msg) ||
        KernelMessage.isUpdateDisplayDataMsg(msg) ||
        KernelMessage.isExecuteResultMsg(msg))
    ) {
      // display_data messages may re-route based on their display_id.
      let transient = (msg.content.transient || {}) as JSONObject;
      let displayId = transient['display_id'] as string;
      if (displayId) {
        handled = await this._handleDisplayId(displayId, msg);
        // The await above may make this message out of date, so check again.
        this._assertCurrentMessage(msg);
      }
    }

    if (!handled && msg.parent_header) {
      let parentHeader = msg.parent_header as KernelMessage.IHeader;
      let future = this._futures && this._futures.get(parentHeader.msg_id);
      if (future) {
        await future.handleMsg(msg);
        this._assertCurrentMessage(msg);
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
          // Updating the status is synchronous, and we call no async user code
          let executionState = (msg as KernelMessage.IStatusMsg).content
            .execution_state;
          this._updateStatus(executionState);
          if (executionState === 'restarting') {
            // After processing for this message is completely done, we want to
            // handle this restart, so we don't await, but instead schedule the
            // work as a microtask. We schedule this here so that it comes
            // before any microtasks scheduled in the signal emission below.
            void Promise.resolve().then(async () => {
              // handleRestart changes the status to 'restarting', so we call it
              // first so that the status won't flip back and forth between
              // 'restarting' and 'autorestarting'.
              await this.handleRestart();
              this._updateStatus('autorestarting');
            });
          }
          break;
        case 'comm_open':
          await this._handleCommOpen(msg as KernelMessage.ICommOpenMsg);
          break;
        case 'comm_msg':
          await this._handleCommMsg(msg as KernelMessage.ICommMsgMsg);
          break;
        case 'comm_close':
          await this._handleCommClose(msg as KernelMessage.ICommCloseMsg);
          break;
        default:
          break;
      }
      // If the message was a status dead message, we might have disposed ourselves.
      if (!this.isDisposed) {
        this._assertCurrentMessage(msg);
        // the message wouldn't be emitted if we were disposed anyway.
        this._iopubMessage.emit(msg as KernelMessage.IIOPubMessage);
      }
    }
  }

  /**
   * Handle a websocket close event.
   */
  private _onWSClose = (evt: Event) => {
    if (this._wsStopped || !this._ws) {
      return;
    }
    // Clear the websocket event handlers and the socket itself.
    this._clearSocket();

    if (this._reconnectAttempt < this._reconnectLimit) {
      this._updateStatus('reconnecting');
      let timeout = Math.pow(2, this._reconnectAttempt);
      console.error(
        'Connection lost, reconnecting in ' + timeout + ' seconds.'
      );
      setTimeout(this._createSocket, 1e3 * timeout);
      this._reconnectAttempt += 1;
    } else {
      this._updateStatus('dead');
    }
  };

  private _id = '';
  private _name = '';
  private _status: Kernel.Status = 'unknown';
  private _kernelSession = '';
  private _clientId = '';
  private _isDisposed = false;
  private _wsStopped = false;
  private _ws: WebSocket | null = null;
  private _username = '';
  private _reconnectLimit = 7;
  private _reconnectAttempt = 0;
  private _isReady = false;
  private _readyPromise = new PromiseDelegate<void>();
  private _initialized = false;
  private _futures = new Map<string, KernelFutureHandler>();
  private _comms = new Map<string, Kernel.IComm>();
  private _targetRegistry: {
    [key: string]: (
      comm: Kernel.IComm,
      msg: KernelMessage.ICommOpenMsg
    ) => void;
  } = Object.create(null);
  private _info: KernelMessage.IInfoReply | null = null;
  private _pendingMessages: KernelMessage.IMessage[] = [];
  private _specPromise: Promise<Kernel.ISpecModel>;
  private _statusChanged = new Signal<this, Kernel.Status>(this);
  private _iopubMessage = new Signal<this, KernelMessage.IIOPubMessage>(this);
  private _anyMessage = new Signal<this, Kernel.IAnyMessageArgs>(this);
  private _unhandledMessage = new Signal<this, KernelMessage.IMessage>(this);
  private _displayIdToParentIds = new Map<string, string[]>();
  private _msgIdToDisplayIds = new Map<string, string[]>();
  private _terminated = new Signal<this, void>(this);
  private _msgChain: Promise<void> | null = Promise.resolve();
  private _noOp = () => {
    /* no-op */
  };
}

/**
 * The namespace for `DefaultKernel` statics.
 */
export namespace DefaultKernel {
  /**
   * Find a kernel by id.
   *
   * @param id - The id of the kernel of interest.
   *
   * @param settings - The optional server settings.
   *
   * @returns A promise that resolves with the model for the kernel.
   *
   * #### Notes
   * If the kernel was already started via `startNewKernel`, we return its
   * `Kernel.IModel`.
   *
   * Otherwise, we attempt to find an existing kernel by connecting to the
   * server. The promise is fulfilled when the kernel is found, otherwise the
   * promise is rejected.
   */
  export function findById(
    id: string,
    settings?: ServerConnection.ISettings
  ): Promise<Kernel.IModel> {
    return Private.findById(id, settings);
  }

  /**
   * Fetch all of the kernel specs.
   *
   * @param settings - The optional server settings.
   *
   * @returns A promise that resolves with the kernel specs.
   *
   * #### Notes
   * Uses the [Jupyter Notebook API](http://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter/notebook/master/notebook/services/api/api.yaml#!/kernelspecs).
   */
  export function getSpecs(
    settings?: ServerConnection.ISettings
  ): Promise<Kernel.ISpecModels> {
    return Private.getSpecs(settings);
  }

  /**
   * Fetch the running kernels.
   *
   * @param settings - The optional server settings.
   *
   * @returns A promise that resolves with the list of running kernels.
   *
   * #### Notes
   * Uses the [Jupyter Notebook API](http://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter/notebook/master/notebook/services/api/api.yaml#!/kernels) and validates the response model.
   *
   * The promise is fulfilled on a valid response and rejected otherwise.
   */
  export function listRunning(
    settings?: ServerConnection.ISettings
  ): Promise<Kernel.IModel[]> {
    return Private.listRunning(settings);
  }

  /**
   * Start a new kernel.
   *
   * @param options - The options used to create the kernel.
   *
   * @returns A promise that resolves with a kernel object.
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
  export function startNew(options: Kernel.IOptions): Promise<Kernel.IKernel> {
    return Private.startNew(options);
  }

  /**
   * Connect to a running kernel.
   *
   * @param model - The model of the running kernel.
   *
   * @param settings - The server settings for the request.
   *
   * @returns The kernel object.
   *
   * #### Notes
   * If the kernel was already started via `startNewKernel`, the existing
   * Kernel object info is used to create another instance.
   */
  export function connectTo(
    model: Kernel.IModel,
    settings?: ServerConnection.ISettings
  ): Kernel.IKernel {
    return Private.connectTo(model, settings);
  }

  /**
   * Shut down a kernel by id.
   *
   * @param id - The id of the running kernel.
   *
   * @param settings - The server settings for the request.
   *
   * @returns A promise that resolves when the kernel is shut down.
   */
  export function shutdown(
    id: string,
    settings?: ServerConnection.ISettings
  ): Promise<void> {
    return Private.shutdownKernel(id, settings);
  }

  /**
   * Shut down all kernels.
   *
   * @param settings - The server settings to use.
   *
   * @returns A promise that resolves when all the kernels are shut down.
   */
  export function shutdownAll(
    settings?: ServerConnection.ISettings
  ): Promise<void> {
    return Private.shutdownAll(settings);
  }
}

/**
 * A private namespace for the Kernel.
 */
namespace Private {
  /**
   * A module private store for running kernels.
   */
  export const runningKernels: DefaultKernel[] = [];

  /**
   * A module private store of kernel specs by base url.
   */
  export const specs: {
    [key: string]: Promise<Kernel.ISpecModels>;
  } = Object.create(null);

  /**
   * Find a kernel by id.
   *
   * Will reach out to the server if needed to find the kernel.
   */
  export function findById(
    id: string,
    settings?: ServerConnection.ISettings
  ): Promise<Kernel.IModel> {
    let kernel = find(runningKernels, value => {
      return value.id === id;
    });
    if (kernel) {
      return Promise.resolve(kernel.model);
    }
    return getKernelModel(id, settings).catch(() => {
      throw new Error(`No running kernel with id: ${id}`);
    });
  }

  /**
   * Get the cached kernel specs or fetch them.
   */
  export function findSpecs(
    settings?: ServerConnection.ISettings
  ): Promise<Kernel.ISpecModels> {
    settings = settings || ServerConnection.makeSettings();
    let promise = specs[settings.baseUrl];
    if (promise) {
      return promise;
    }
    return getSpecs(settings);
  }

  /**
   * Fetch all of the kernel specs.
   *
   * #### Notes
   * Uses the [Jupyter Notebook API](http://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter/notebook/master/notebook/services/api/api.yaml#!/kernelspecs).
   */
  export function getSpecs(
    settings?: ServerConnection.ISettings
  ): Promise<Kernel.ISpecModels> {
    settings = settings || ServerConnection.makeSettings();
    let url = URLExt.join(settings.baseUrl, KERNELSPEC_SERVICE_URL);
    let promise = ServerConnection.makeRequest(url, {}, settings)
      .then(response => {
        if (response.status !== 200) {
          throw new ServerConnection.ResponseError(response);
        }
        return response.json();
      })
      .then(data => {
        return validate.validateSpecModels(data);
      });
    Private.specs[settings.baseUrl] = promise;
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
  export function listRunning(
    settings?: ServerConnection.ISettings
  ): Promise<Kernel.IModel[]> {
    settings = settings || ServerConnection.makeSettings();
    let url = URLExt.join(settings.baseUrl, KERNEL_SERVICE_URL);
    return ServerConnection.makeRequest(url, {}, settings)
      .then(response => {
        if (response.status !== 200) {
          throw new ServerConnection.ResponseError(response);
        }
        return response.json();
      })
      .then(data => {
        if (!Array.isArray(data)) {
          throw new Error('Invalid kernel list');
        }
        for (let i = 0; i < data.length; i++) {
          validate.validateModel(data[i]);
        }
        return updateRunningKernels(data);
      });
  }

  /**
   * Update the running kernels based on new data from the server.
   */
  export function updateRunningKernels(
    kernels: Kernel.IModel[]
  ): Kernel.IModel[] {
    each(runningKernels.slice(), kernel => {
      let updated = find(kernels, model => {
        return kernel.id === model.id;
      });
      // If kernel is no longer running on disk, emit dead signal.
      if (!updated && kernel.status !== 'dead') {
        kernel.dispose();
      }
    });
    return kernels;
  }

  /**
   * Start a new kernel.
   */
  export async function startNew(
    options: Kernel.IOptions
  ): Promise<Kernel.IKernel> {
    let settings = options.serverSettings || ServerConnection.makeSettings();
    let url = URLExt.join(settings.baseUrl, KERNEL_SERVICE_URL);
    let init = {
      method: 'POST',
      body: JSON.stringify({ name: options.name })
    };
    let response = await ServerConnection.makeRequest(url, init, settings);
    if (response.status !== 201) {
      throw new ServerConnection.ResponseError(response);
    }
    let data = await response.json();
    validate.validateModel(data);
    return new DefaultKernel(
      {
        ...options,
        name: data.name,
        serverSettings: settings
      },
      data.id
    );
  }

  /**
   * Connect to a running kernel.
   */
  export function connectTo(
    model: Kernel.IModel,
    settings?: ServerConnection.ISettings
  ): Kernel.IKernel {
    let serverSettings = settings || ServerConnection.makeSettings();
    let kernel = find(runningKernels, value => {
      return value.id === model.id;
    });
    if (kernel) {
      return kernel.clone();
    }

    return new DefaultKernel({ name: model.name, serverSettings }, model.id);
  }

  /**
   * Restart a kernel.
   */
  export async function restartKernel(
    kernel: Kernel.IKernel,
    settings?: ServerConnection.ISettings
  ): Promise<void> {
    if (kernel.status === 'dead') {
      throw new Error('Kernel is dead');
    }
    settings = settings || ServerConnection.makeSettings();
    let url = URLExt.join(
      settings.baseUrl,
      KERNEL_SERVICE_URL,
      encodeURIComponent(kernel.id),
      'restart'
    );
    let init = { method: 'POST' };

    // Handle the restart on all of the kernels with the same id.
    await Promise.all(
      runningKernels.filter(k => k.id === kernel.id).map(k => k.handleRestart())
    );
    let response = await ServerConnection.makeRequest(url, init, settings);
    if (response.status !== 200) {
      throw new ServerConnection.ResponseError(response);
    }
    let data = await response.json();
    validate.validateModel(data);
  }

  /**
   * Interrupt a kernel.
   */
  export async function interruptKernel(
    kernel: Kernel.IKernel,
    settings?: ServerConnection.ISettings
  ): Promise<void> {
    if (kernel.status === 'dead') {
      throw new Error('Kernel is dead');
    }
    settings = settings || ServerConnection.makeSettings();
    let url = URLExt.join(
      settings.baseUrl,
      KERNEL_SERVICE_URL,
      encodeURIComponent(kernel.id),
      'interrupt'
    );
    let init = { method: 'POST' };
    let response = await ServerConnection.makeRequest(url, init, settings);
    if (response.status !== 204) {
      throw new ServerConnection.ResponseError(response);
    }
  }

  /**
   * Delete a kernel.
   */
  export async function shutdownKernel(
    id: string,
    settings?: ServerConnection.ISettings
  ): Promise<void> {
    settings = settings || ServerConnection.makeSettings();
    let url = URLExt.join(
      settings.baseUrl,
      KERNEL_SERVICE_URL,
      encodeURIComponent(id)
    );
    let init = { method: 'DELETE' };
    let response = await ServerConnection.makeRequest(url, init, settings);
    if (response.status === 404) {
      let msg = `The kernel "${id}" does not exist on the server`;
      console.warn(msg);
    } else if (response.status !== 204) {
      throw new ServerConnection.ResponseError(response);
    }
    killKernels(id);
  }

  /**
   * Shut down all kernels.
   *
   * @param settings - The server settings to use.
   *
   * @returns A promise that resolves when all the kernels are shut down.
   */
  export async function shutdownAll(
    settings?: ServerConnection.ISettings
  ): Promise<void> {
    settings = settings || ServerConnection.makeSettings();
    let running = await listRunning(settings);
    await Promise.all(running.map(k => shutdownKernel(k.id, settings)));
  }

  /**
   * Kill the kernels by id.
   */
  function killKernels(id: string): void {
    // Iterate on an array copy so disposals will not affect the iteration.
    runningKernels.slice().forEach(kernel => {
      if (kernel.id === id) {
        kernel.dispose();
      }
    });
  }

  /**
   * Get a full kernel model from the server by kernel id string.
   */
  export async function getKernelModel(
    id: string,
    settings?: ServerConnection.ISettings
  ): Promise<Kernel.IModel> {
    settings = settings || ServerConnection.makeSettings();
    let url = URLExt.join(
      settings.baseUrl,
      KERNEL_SERVICE_URL,
      encodeURIComponent(id)
    );
    let response = await ServerConnection.makeRequest(url, {}, settings);
    if (response.status !== 200) {
      throw new ServerConnection.ResponseError(response);
    }
    let data = await response.json();
    validate.validateModel(data);
    return data;
  }

  /**
   * Log the current kernel status.
   */
  export function logKernelStatus(kernel: Kernel.IKernel): void {
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
   * Send a kernel message to the kernel and resolve the reply message.
   */
  export async function handleShellMessage(
    kernel: Kernel.IKernel,
    msg: KernelMessage.IShellMessage
  ): Promise<KernelMessage.IShellMessage> {
    let future = kernel.sendShellMessage(msg, true);
    return future.done;
  }

  /**
   * Try to load an object from a module or a registry.
   *
   * Try to load an object from a module asynchronously if a module
   * is specified, otherwise tries to load an object from the global
   * registry, if the global registry is provided.
   */
  export function loadObject(
    name: string,
    moduleName: string | undefined,
    registry?: { [key: string]: any }
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      // Try loading the view module using require.js
      if (moduleName) {
        if (typeof requirejs === 'undefined') {
          throw new Error('requirejs not found');
        }
        requirejs(
          [moduleName],
          (mod: any) => {
            if (mod[name] === void 0) {
              let msg = `Object '${name}' not found in module '${moduleName}'`;
              reject(new Error(msg));
            } else {
              resolve(mod[name]);
            }
          },
          reject
        );
      } else {
        if (registry && registry[name]) {
          resolve(registry[name]);
        } else {
          reject(new Error(`Object '${name}' not found in registry`));
        }
      }
    });
  }
}
