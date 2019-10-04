// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { URLExt } from '@jupyterlab/coreutils';

import { UUID } from '@phosphor/coreutils';

import { JSONExt, JSONObject, PromiseDelegate } from '@phosphor/coreutils';

import { ISignal, Signal } from '@phosphor/signaling';

import { ServerConnection } from '..';

import { CommHandler } from './comm';

import { Kernel } from './kernel';

import { KernelMessage } from './messages';

import {
  KernelFutureHandler,
  KernelShellFutureHandler,
  KernelControlFutureHandler
} from './future';

import * as serialize from './serialize';

import * as validate from './validate';
import { KernelSpec } from '../kernelspec/kernelspec';

import * as restapi from './restapi';

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
export class KernelConnection implements Kernel.IKernelConnection {
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
    this.handleComms =
      options.handleComms === undefined ? true : options.handleComms;

    this.connectionStatusChanged.connect((sender, connectionStatus) => {
      // Send pending messages and update status to be consistent.
      if (connectionStatus === 'connected' && this.status !== 'dead') {
        // Make sure we send at least one message to get kernel status back.
        if (this._pendingMessages.length > 0) {
          this._sendPending();
        } else {
          void this.requestKernelInfo();
        }
      } else {
        // If the connection is down, then we don't know what is happening with
        // the kernel, so set the status to unknown.
        this._updateStatus('unknown');
      }
    });

    this._createSocket();

    // Immediately queue up a request for initial kernel info.
    void this.requestKernelInfo();
  }

  get disposed(): ISignal<this, void> {
    return this._disposed;
  }

  /**
   * The server settings for the kernel.
   */
  readonly serverSettings: ServerConnection.ISettings;

  /**
   * Handle comm messages
   *
   * #### Notes
   * The comm message protocol currently has implicit assumptions that only
   * one kernel connection is handling comm messages. This option allows a
   * kernel connection to opt out of handling comms.
   *
   * See https://github.com/jupyter/jupyter_client/issues/263
   */
  readonly handleComms: boolean;

  /**
   * A signal emitted when the kernel status changes.
   */
  get statusChanged(): ISignal<this, Kernel.Status> {
    return this._statusChanged;
  }

  /**
   * A signal emitted when the kernel status changes.
   */
  get connectionStatusChanged(): ISignal<this, Kernel.ConnectionStatus> {
    return this._connectionStatusChanged;
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
   * This message is emitted when a message is queued for sending (either in
   * the websocket buffer, or our own pending message buffer). The message may
   * actually be sent across the wire at a later time.
   *
   * The message emitted in this signal should not be modified in any way.
   *
   * TODO: should we only emit copies of the message? Is that prohibitively
   * expensive? Note that we can't just do a JSON copy since the message may
   * include binary buffers. We could minimally copy the top-level, though.
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
   * The current connection status of the kernel connection.
   */
  get connectionStatus(): Kernel.ConnectionStatus {
    return this._connectionStatus;
  }

  /**
   * Test whether the kernel has been disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * The cached kernel info.
   */
  get info(): Promise<KernelMessage.IInfoReply> {
    return this._info.promise;
  }

  /**
   * Get the kernel spec.
   *
   * @returns A promise that resolves with the kernel spec.
   */
  getSpec(): Promise<KernelSpec.ISpecModel> {
    if (this._specPromise) {
      return this._specPromise;
    }
    this._specPromise = KernelSpec.getSpecs(this.serverSettings).then(specs => {
      return specs.kernelspecs[this._name];
    });
    return this._specPromise;
  }

  /**
   * Clone the current kernel with a new clientId.
   */
  clone(options: Kernel.IOptions = {}): Kernel.IKernelConnection {
    return new KernelConnection(
      {
        name: this._name,
        username: this._username,
        serverSettings: this.serverSettings,
        // TODO: should this be !this.handleComms, because we only want one
        // connection to handle comms?
        handleComms: this.handleComms,
        ...options
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
    this._disposed.emit();

    // Took out this._status = 'dead' - figure out ramifications of this.
    this._updateConnectionStatus('disconnected');
    this._clearState();
    this._clearSocket();
    this._kernelSession = '';
    this._msgChain = null;
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
  ): Kernel.IShellFuture<KernelMessage.IShellMessage<T>> {
    return this._sendKernelShellControl(
      KernelShellFutureHandler,
      msg,
      expectReply,
      disposeOnDone
    ) as Kernel.IShellFuture<KernelMessage.IShellMessage<T>>;
  }

  /**
   * Send a control message to the kernel.
   *
   * #### Notes
   * Send a message to the kernel's control channel, yielding a future object
   * for accepting replies.
   *
   * If `expectReply` is given and `true`, the future is disposed when both a
   * control reply and an idle status message are received. If `expectReply`
   * is not given or is `false`, the future is resolved when an idle status
   * message is received.
   * If `disposeOnDone` is not given or is `true`, the Future is disposed at this point.
   * If `disposeOnDone` is given and `false`, it is up to the caller to dispose of the Future.
   *
   * All replies are validated as valid kernel messages.
   *
   * If the kernel status is `dead`, this will throw an error.
   */
  sendControlMessage<T extends KernelMessage.ControlMessageType>(
    msg: KernelMessage.IControlMessage<T>,
    expectReply = false,
    disposeOnDone = true
  ): Kernel.IControlFuture<KernelMessage.IControlMessage<T>> {
    return this._sendKernelShellControl(
      KernelControlFutureHandler,
      msg,
      expectReply,
      disposeOnDone
    ) as Kernel.IControlFuture<KernelMessage.IControlMessage<T>>;
  }

  private _sendKernelShellControl<
    REQUEST extends KernelMessage.IShellControlMessage,
    REPLY extends KernelMessage.IShellControlMessage,
    KFH extends new (...params: any[]) => KernelFutureHandler<REQUEST, REPLY>,
    T extends KernelMessage.IMessage
  >(
    ctor: KFH,
    msg: T,
    expectReply = false,
    disposeOnDone = true
  ): Kernel.IFuture<
    KernelMessage.IShellControlMessage,
    KernelMessage.IShellControlMessage
  > {
    this._sendMessage(msg);
    this._anyMessage.emit({ msg, direction: 'send' });

    let future = new ctor(
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
   * Send a message on the websocket.
   *
   * If pending is true, queue the message for later sending if we cannot send
   * now. Otherwise throw an error.
   */
  private _sendMessage(msg: KernelMessage.IMessage, pending = true) {
    if (this.status === 'dead') {
      throw new Error('Kernel is dead');
    }

    if (this.connectionStatus === 'disconnected') {
      throw new Error('Kernel connection is disconnected');
    }

    // Send if the ws allows it, otherwise buffer the message.
    if (this.connectionStatus === 'connected') {
      this._ws.send(serialize.serialize(msg));
      // console.log(`SENT WS message to ${this.id}`, msg);
    } else if (pending) {
      this._pendingMessages.push(msg);
      // console.log(`PENDING WS message to ${this.id}`, msg);
    } else {
      throw new Error('Could not send message');
    }
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
    return restapi.interruptKernel(this, this.serverSettings);
  }

  /**
   * Request a kernel restart.
   *
   * #### Notes
   * Uses the [Jupyter Notebook API](http://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter/notebook/master/notebook/services/api/api.yaml#!/kernels)
   * and validates the response model.
   *
   * Any existing Future or Comm objects are cleared once the kernel has
   * actually be restarted.
   *
   * The promise is fulfilled on a valid server response and rejected otherwise.
   * Note that this does not mean the kernel has been restarted, only that a
   * restart has been requested.
   *
   * It is assumed that the API call does not mutate the kernel id or name.
   *
   * The promise will be rejected if the request fails or the response is
   * invalid.
   */
  restart(): Promise<void> {
    // Handle the restart on all of the kernels with the same id.
    // TODO:
    // await Promise.all(
    //   runningKernels.filter(k => k.id === kernel.id).map(k => k.handleRestart())
    // );
    return restapi.restartKernel(this, this.serverSettings);
  }

  /**
   * Handle a restart on the kernel.  This is not part of the `IKernel`
   * interface.
   */
  async handleRestart(): Promise<void> {
    this._clearState();
    this._updateStatus('restarting');

    // Kick off an async kernel request to eventually reset the kernel status.
    // We do this with a setTimeout to avoid race conditions with the
    // restarting/autostarting logic.
    setTimeout(() => {
      void this.requestKernelInfo();
    }, 0);
  }

  /**
   * Reconnect to a disconnected kernel.
   *
   * #### Notes
   * Used when the websocket connection to the kernel is lost.
   *
   * TODO: should we remove this method? It doesn't play well with
   * 'disconnected' being a terminal state. We already have the automatic
   * reconnection.
   */
  reconnect(): Promise<void> {
    this._updateConnectionStatus('connecting');
    let result = new PromiseDelegate<void>();

    // TODO: can we use one of the test functions that has this pattern of a
    // promise resolving on a single signal emission?
    let fulfill = (sender: this, status: Kernel.ConnectionStatus) => {
      if (status === 'connected') {
        result.resolve();
      } else if (status === 'disconnected') {
        result.reject(new Error('Kernel connection disconnected'));
      }
      this.connectionStatusChanged.disconnect(fulfill);
    };
    this.connectionStatusChanged.connect(fulfill);

    this._clearSocket();
    this._createSocket();
    return result.promise;
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
   * without a server request.a
   */
  async shutdown(): Promise<void> {
    // TODO: review the logic here. Why are the clear statements in different orders?
    if (this.status === 'dead') {
      this._updateConnectionStatus('disconnected');
      this._clearSocket();
      this._clearState();
      return;
    }
    await restapi.shutdownKernel(this.id, this.serverSettings);
    this._clearState();
    this._updateConnectionStatus('disconnected');
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
    let reply: KernelMessage.IInfoReplyMsg;
    try {
      reply = (await Private.handleShellMessage(
        this,
        msg
      )) as KernelMessage.IInfoReplyMsg;
    } catch (e) {
      // If we rejected because the future was disposed, ignore and return.
      if (this.isDisposed) {
        return;
      } else {
        throw e;
      }
    }
    if (this.isDisposed) {
      throw new Error('Disposed kernel');
    }
    // Kernels sometimes do not include a status field on kernel_info_reply
    // messages, so set a default for now.
    // See https://github.com/jupyterlab/jupyterlab/issues/6760
    if (reply.content.status === undefined) {
      reply.content.status = 'ok';
    }

    if (reply.content.status !== 'ok') {
      throw new Error('Kernel info reply errored');
    }

    // TODO: Since we never make another _info promise delegate, this only
    // resolves to the *first* return, and ignores all calls after that. Is
    // that what we want, or do we want this info updated when another request
    // is made?
    this._info.resolve(reply.content);
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
    content: KernelMessage.ICompleteRequestMsg['content']
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
    content: KernelMessage.IInspectRequestMsg['content']
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
    content: KernelMessage.IHistoryRequestMsg['content']
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
    content: KernelMessage.IExecuteRequestMsg['content'],
    disposeOnDone: boolean = true,
    metadata?: JSONObject
  ): Kernel.IShellFuture<
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
      content: { ...defaults, ...content },
      metadata
    });
    return this.sendShellMessage(
      msg,
      true,
      disposeOnDone
    ) as Kernel.IShellFuture<
      KernelMessage.IExecuteRequestMsg,
      KernelMessage.IExecuteReplyMsg
    >;
  }

  /**
   * Send an experimental `debug_request` message.
   *
   * @hidden
   *
   * #### Notes
   * Debug messages are experimental messages that are not in the official
   * kernel message specification. As such, this function is *NOT* considered
   * part of the public API, and may change without notice.
   */
  requestDebug(
    content: KernelMessage.IDebugRequestMsg['content'],
    disposeOnDone: boolean = true
  ): Kernel.IControlFuture<
    KernelMessage.IDebugRequestMsg,
    KernelMessage.IDebugReplyMsg
  > {
    let msg = KernelMessage.createMessage({
      msgType: 'debug_request',
      channel: 'control',
      username: this._username,
      session: this._clientId,
      content
    });
    return this.sendControlMessage(
      msg,
      true,
      disposeOnDone
    ) as Kernel.IControlFuture<
      KernelMessage.IDebugRequestMsg,
      KernelMessage.IDebugReplyMsg
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
    content: KernelMessage.IIsCompleteRequestMsg['content']
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
    content: KernelMessage.ICommInfoRequestMsg['content']
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
  sendInputReply(content: KernelMessage.IInputReplyMsg['content']): void {
    let msg = KernelMessage.createMessage({
      msgType: 'input_reply',
      channel: 'stdin',
      username: this._username,
      session: this._clientId,
      content
    });

    this._sendMessage(msg);
    this._anyMessage.emit({ msg, direction: 'send' });
  }

  /**
   * Connect to a comm, or create a new one.
   *
   * #### Notes
   * If a client-side comm already exists with the given commId, it is
   * returned. An error is thrown if the kernel does not handle comms.
   *
   * TODO: this means that I can just take over a comm just by knowing its id.
   * So we can't *really* share comms, since only one message handler is
   * installed. So why would we return someone else's comm object? Perhaps
   * instead we should throw an error if a comm is already existing with that
   * id, signifying that someone else has already hooked up to that comm?
   */
  connectToComm(
    targetName: string,
    commId: string = UUID.uuid4()
  ): Kernel.IComm {
    if (!this.handleComms) {
      throw new Error('Comms are disabled on this kernel connection');
    }

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
    if (!this.handleComms) {
      return;
    }

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
   * The comm target is only removed if the callback argument matches.
   */
  removeCommTarget(
    targetName: string,
    callback: (
      comm: Kernel.IComm,
      msg: KernelMessage.ICommOpenMsg
    ) => void | PromiseLike<void>
  ): void {
    if (!this.handleComms) {
      return;
    }

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
   * TODO: does this not apply anymore.
   *
   * #### Notes
   * When calling this, you should also set the connectionStatus to
   * 'connecting' if you are going to try to reconnect, or 'disconnected' if
   * not.
   */
  private _clearSocket(): void {
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
    // "unknown" | "starting" | "idle" | "busy" | "restarting" | "autorestarting" | "dead"

    if (this._status === status || this._status === 'dead') {
      return;
    }

    this._status = status;
    Private.logKernelStatus(this);
    this._statusChanged.emit(status);
    if (status === 'dead') {
      this.dispose();
    }
  }

  /**
   * Send pending messages to the kernel.
   */
  private _sendPending(): void {
    // We check to make sure we are still connected each time. For
    // example, if a websocket buffer overflows, it may close, so we should
    // stop sending messages.
    while (
      this.connectionStatus === 'connected' &&
      this._pendingMessages.length > 0
    ) {
      this._sendMessage(this._pendingMessages[0], false);
      // TODO: remove debuging console.log below.
      // console.log(
      //   `SENT pending message to ${this.id}`,
      //   this._pendingMessages[0]
      // );

      // We shift the message off the queue after the message is sent so that
      // if there is an exception, the message is still pending.
      this._pendingMessages.shift();
    }
  }

  /**
   * Clear the internal state.
   */
  private _clearState(): void {
    this._pendingMessages = [];
    this._futures.forEach(future => {
      future.dispose();
    });
    this._comms.forEach(comm => {
      comm.dispose();
    });
    this._msgChain = Promise.resolve();
    this._kernelSession = '';
    this._futures = new Map<
      string,
      KernelFutureHandler<
        KernelMessage.IShellControlMessage,
        KernelMessage.IShellControlMessage
      >
    >();
    this._comms = new Map<string, Kernel.IComm>();
    this._displayIdToParentIds.clear();
    this._msgIdToDisplayIds.clear();
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
      restapi.KERNEL_SERVICE_URL,
      encodeURIComponent(this._id)
    );

    // Strip any authentication from the display string.
    // TODO - Audit tests for extra websockets started
    let display = partialUrl.replace(/^((?:\w+:)?\/\/)(?:[^@\/]+@)/, '$1');
    console.log(`Starting WebSocket: ${display}`);

    let url = URLExt.join(
      partialUrl,
      'channels?session_id=' + encodeURIComponent(this._clientId)
    );
    // If token authentication is in use.
    let token = settings.token;
    if (token !== '') {
      url = url + `&token=${encodeURIComponent(token)}`;
    }

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
    this._updateConnectionStatus('connected');
  };

  /**
   * Handle a websocket message, validating and routing appropriately.
   */
  private _onWSMessage = (evt: MessageEvent) => {
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

  /**
   * Handle connection status changes.
   *
   * #### Notes
   * The 'disconnected' state is considered a terminal state.
   */
  private _updateConnectionStatus(
    connectionStatus: Kernel.ConnectionStatus
  ): void {
    if (
      this._connectionStatus === connectionStatus ||
      this._connectionStatus === 'disconnected'
    ) {
      return;
    }

    this._connectionStatus = connectionStatus;

    // Notify others that the connection status changed.
    this._connectionStatusChanged.emit(connectionStatus);
  }

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
          if (this.handleComms) {
            await this._handleCommOpen(msg as KernelMessage.ICommOpenMsg);
          }
          break;
        case 'comm_msg':
          if (this.handleComms) {
            await this._handleCommMsg(msg as KernelMessage.ICommMsgMsg);
          }
          break;
        case 'comm_close':
          if (this.handleComms) {
            await this._handleCommClose(msg as KernelMessage.ICommCloseMsg);
          }
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
    // Update the connection status and schedule a possible reconnection.
    if (this._reconnectAttempt < this._reconnectLimit) {
      this._updateConnectionStatus('connecting');
      let timeout = Math.pow(2, this._reconnectAttempt);
      console.error(
        'Connection lost, reconnecting in ' + timeout + ' seconds.'
      );
      setTimeout(this._createSocket, 1e3 * timeout);
      this._reconnectAttempt += 1;
    } else {
      this._updateConnectionStatus('disconnected');
    }

    // Clear the websocket event handlers and the socket itself.
    this._clearSocket();
  };

  private _id = '';
  private _name = '';
  private _status: Kernel.Status = 'unknown';
  private _connectionStatus: Kernel.ConnectionStatus = 'connecting';
  private _kernelSession = '';
  private _clientId = '';
  private _isDisposed = false;
  /**
   * Websocket to communicate with kernel.
   */
  private _ws: WebSocket | null = null;
  private _username = '';
  private _reconnectLimit = 7;
  private _reconnectAttempt = 0;

  private _futures = new Map<
    string,
    KernelFutureHandler<
      KernelMessage.IShellControlMessage,
      KernelMessage.IShellControlMessage
    >
  >();
  private _comms = new Map<string, Kernel.IComm>();
  private _targetRegistry: {
    [key: string]: (
      comm: Kernel.IComm,
      msg: KernelMessage.ICommOpenMsg
    ) => void;
  } = Object.create(null);
  private _info = new PromiseDelegate<KernelMessage.IInfoReply>();
  private _pendingMessages: KernelMessage.IMessage[] = [];
  private _specPromise: Promise<KernelSpec.ISpecModel>;
  private _statusChanged = new Signal<this, Kernel.Status>(this);
  private _connectionStatusChanged = new Signal<this, Kernel.ConnectionStatus>(
    this
  );
  private _disposed = new Signal<this, void>(this);
  private _iopubMessage = new Signal<this, KernelMessage.IIOPubMessage>(this);
  private _anyMessage = new Signal<this, Kernel.IAnyMessageArgs>(this);
  private _unhandledMessage = new Signal<this, KernelMessage.IMessage>(this);
  private _displayIdToParentIds = new Map<string, string[]>();
  private _msgIdToDisplayIds = new Map<string, string[]>();
  private _msgChain: Promise<void> | null = Promise.resolve();
  private _noOp = () => {
    /* no-op */
  };
}

/**
 * The namespace for `DefaultKernel` statics.
 */
export namespace KernelConnection {
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
  export function startNew(
    options: Kernel.IOptions
  ): Promise<Kernel.IKernelConnection> {
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
  ): Kernel.IKernelConnection {
    let serverSettings = settings || ServerConnection.makeSettings();
    return new KernelConnection({ name: model.name, serverSettings }, model.id);
  }
}

/**
 * A private namespace for the Kernel.
 */
namespace Private {
  /**
   * TODO: We need some way to coordinate between kernels which one is
   * handling comms. If we are going to keep track of each kernel and whether
   * it has comms handled - we might as well keep track of the actual kernel
   * connections themselves. And if we do that, we might as well update the
   * kernel connections in listRunning, etc.
   *
   * The other option is to have persistent kernel models, but then we require
   * a persistent list of models which would be maintained in the manager, but
   * that means that we really need the manager here.
   *
   * A lot of this goes away if we just insist that people use a manager with
   * persistent models.
   * 
   * Let's just say you must manually guarantee this.
   * 
   *       // If there is already a kernel connection handling comms, don't handle
      // them in our clone, since the comm message protocol has implicit
      // assumptions that only one connection is handling comm messages.
      // See https://github.com/jupyter/jupyter_client/issues/263

   */

  /**
   * Start a new kernel.
   */
  export async function startNew(
    options: Kernel.IOptions
  ): Promise<Kernel.IKernelConnection> {
    options.serverSettings =
      options.serverSettings || ServerConnection.makeSettings();
    const data = await restapi.startNew(options);
    return new KernelConnection(
      {
        ...options,
        name: data.name
      },
      data.id
    );
  }

  /**
   * Log the current kernel status.
   */
  export function logKernelStatus(kernel: Kernel.IKernelConnection): void {
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
  export async function handleShellMessage<
    T extends KernelMessage.ShellMessageType
  >(kernel: Kernel.IKernelConnection, msg: KernelMessage.IShellMessage<T>) {
    let future = kernel.sendShellMessage(msg, true);
    return future.done;
  }

  /**
   * Try to load an object from a module or a registry.
   *
   * Try to load an object from a module asynchronously if a module
   * is specified, otherwise tries to load an object from the global
   * registry, if the global registry is provided.
   *
   * #### Notes
   * Loading a module uses requirejs.
   */
  export function loadObject(
    name: string,
    moduleName: string | undefined,
    registry?: { [key: string]: any }
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      // Try loading the module using require.js
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
