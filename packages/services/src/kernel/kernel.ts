// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IIterator } from '@phosphor/algorithm';

import { JSONObject, JSONValue } from '@phosphor/coreutils';

import { IDisposable } from '@phosphor/disposable';

import { ISignal } from '@phosphor/signaling';

import { ServerConnection } from '..';

import { DefaultKernel } from './default';

import { KernelMessage } from './messages';

/**
 * A namespace for kernel types, interfaces, and type checker functions.
 */
export namespace Kernel {
  /**
   * Interface of a Kernel connection that is managed by a session.
   *
   * #### Notes
   * The Kernel object is tied to the lifetime of the Kernel id, which is a
   * unique id for the Kernel session on the server.  The Kernel object manages
   * a websocket connection internally, and will auto-restart if the websocket
   * temporarily loses connection.  Restarting creates a new Kernel process on
   * the server, but preserves the Kernel id.
   */
  export interface IKernelConnection extends IDisposable {
    /**
     * The id of the server-side kernel.
     */
    readonly id: string;

    /**
     * The name of the server-side kernel.
     */
    readonly name: string;

    /**
     * The model associated with the kernel.
     */
    readonly model: Kernel.IModel;

    /**
     * The client username.
     */
    readonly username: string;

    /**
     * The client unique id.
     *
     * #### Notes
     * This should be unique for a particular kernel connection object.
     */
    readonly clientId: string;

    /**
     * The current status of the kernel.
     */
    readonly status: Kernel.Status;

    /**
     * The cached kernel info.
     *
     * #### Notes
     * This value will be null until the kernel is ready.
     */
    readonly info: KernelMessage.IInfoReply | null;

    /**
     * Test whether the kernel is ready.
     *
     * #### Notes
     * A kernel is ready when the communication channel is active and we have
     * cached the kernel info.
     */
    readonly isReady: boolean;

    /**
     * A promise that resolves when the kernel is initially ready after a start
     * or restart.
     *
     * #### Notes
     * A kernel is ready when the communication channel is active and we have
     * cached the kernel info.
     */
    readonly ready: Promise<void>;

    /**
     * Get the kernel spec.
     *
     * @returns A promise that resolves with the kernel spec for this kernel.
     */
    getSpec(): Promise<Kernel.ISpecModel>;

    /**
     * Send a shell message to the kernel.
     *
     * @param msg - The fully-formed shell message to send.
     *
     * @param expectReply - Whether to expect a shell reply message.
     *
     * @param disposeOnDone - Whether to dispose of the future when done.
     *
     * #### Notes
     * Send a message to the kernel's shell channel, yielding a future object
     * for accepting replies.
     *
     * If `expectReply` is given and `true`, the future is done when both a
     * shell reply and an idle status message are received with the appropriate
     * parent header, in which case the `.done` promise resolves to the reply.
     * If `expectReply` is not given or is `false`, the future is done when an
     * idle status message with the appropriate parent header is received, in
     * which case the `.done` promise resolves to `undefined`.
     *
     * If `disposeOnDone` is given and `false`, the future will not be disposed
     * of when the future is done, instead relying on the caller to dispose of
     * it. This allows for the handling of out-of-order output from ill-behaved
     * kernels.
     *
     * All replies are validated as valid kernel messages.
     *
     * If the kernel status is `'dead'`, this will throw an error.
     */
    sendShellMessage(
      msg: KernelMessage.IShellMessage,
      expectReply?: boolean,
      disposeOnDone?: boolean
    ): Kernel.IFuture;

    /**
     * Reconnect to a disconnected kernel.
     *
     * @returns A promise that resolves when the kernel has reconnected.
     *
     * #### Notes
     * This just refreshes the connection to an existing kernel, and does not
     * perform an HTTP request to the server or restart the kernel.
     */
    reconnect(): Promise<void>;

    /**
     * Interrupt a kernel.
     *
     * @returns A promise that resolves when the kernel has interrupted.
     *
     * #### Notes
     * Uses the [Jupyter Notebook API](http://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter/notebook/master/notebook/services/api/api.yaml#!/kernels).
     *
     * The promise is fulfilled on a valid response and rejected otherwise.
     *
     * It is assumed that the API call does not mutate the kernel id or name.
     *
     * The promise will be rejected if the kernel status is `'dead'` or if the
     * request fails or the response is invalid.
     */
    interrupt(): Promise<void>;

    /**
     * Restart a kernel.
     *
     * @returns A promise that resolves when the kernel has restarted.
     *
     * #### Notes
     * Uses the [Jupyter Notebook API](http://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter/notebook/master/notebook/services/api/api.yaml#!/kernels) and validates the response model.
     *
     * Any existing Future or Comm objects are cleared.
     *
     * It is assumed that the API call does not mutate the kernel id or name.
     *
     * The promise will be rejected if the kernel status is `'dead'` or if the
     * request fails or the response is invalid.
     */
    restart(): Promise<void>;

    /**
     * Send a `kernel_info_request` message.
     *
     * @param content - The content of the request.
     *
     * @returns A promise that resolves with the response message.
     *
     * #### Notes
     * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#kernel-info).
     *
     * Fulfills with the `kernel_info_response` content when the shell reply is
     * received and validated.
     */
    requestKernelInfo(): Promise<KernelMessage.IInfoReplyMsg>;

    /**
     * Send a `complete_request` message.
     *
     * @param content - The content of the request.
     *
     * @returns A promise that resolves with the response message.
     *
     * #### Notes
     * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#completion).
     *
     * Fulfills with the `complete_reply` content when the shell reply is
     * received and validated.
     */
    requestComplete(
      content: KernelMessage.ICompleteRequest
    ): Promise<KernelMessage.ICompleteReplyMsg>;

    /**
     * Send an `inspect_request` message.
     *
     * @param content - The content of the request.
     *
     * @returns A promise that resolves with the response message.
     *
     * #### Notes
     * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#introspection).
     *
     * Fulfills with the `inspect_reply` content when the shell reply is
     * received and validated.
     */
    requestInspect(
      content: KernelMessage.IInspectRequest
    ): Promise<KernelMessage.IInspectReplyMsg>;

    /**
     * Send a `history_request` message.
     *
     * @param content - The content of the request.
     *
     * @returns A promise that resolves with the response message.
     *
     * #### Notes
     * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#history).
     *
     * Fulfills with the `history_reply` content when the shell reply is
     * received and validated.
     */
    requestHistory(
      content: KernelMessage.IHistoryRequest
    ): Promise<KernelMessage.IHistoryReplyMsg>;

    /**
     * Send an `execute_request` message.
     *
     * @param content - The content of the request.
     *
     * @param disposeOnDone - Whether to dispose of the future when done.
     *
     * @returns A kernel future.
     *
     * #### Notes
     * See [Messaging in
     * Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#execute).
     *
     * This method returns a kernel future, rather than a promise, since execution may
     * have many response messages (for example, many iopub display messages).
     *
     * Future `onReply` is called with the `execute_reply` content when the
     * shell reply is received and validated.
     *
     * **See also:** [[IExecuteReply]]
     */
    requestExecute(
      content: KernelMessage.IExecuteRequest,
      disposeOnDone?: boolean
    ): Kernel.IFuture;

    /**
     * Send an `is_complete_request` message.
     *
     * @param content - The content of the request.
     *
     * @returns A promise that resolves with the response message.
     *
     * #### Notes
     * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#code-completeness).
     *
     * Fulfills with the `is_complete_response` content when the shell reply is
     * received and validated.
     */
    requestIsComplete(
      content: KernelMessage.IIsCompleteRequest
    ): Promise<KernelMessage.IIsCompleteReplyMsg>;

    /**
     * Send a `comm_info_request` message.
     *
     * @param content - The content of the request.
     *
     * @returns A promise that resolves with the response message.
     *
     * #### Notes
     * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#comm_info).
     *
     * Fulfills with the `comm_info_reply` content when the shell reply is
     * received and validated.
     */
    requestCommInfo(
      content: KernelMessage.ICommInfoRequest
    ): Promise<KernelMessage.ICommInfoReplyMsg>;

    /**
     * Send an `input_reply` message.
     *
     * @param content - The content of the reply.
     *
     * #### Notes
     * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#messages-on-the-stdin-router-dealer-sockets).
     */
    sendInputReply(content: KernelMessage.IInputReply): void;

    /**
     * Connect to a comm, or create a new one.
     *
     * @param targetName - The name of the comm target.
     *
     * @param id - The comm id.
     *
     * @returns A comm instance.
     */
    connectToComm(targetName: string, commId?: string): Kernel.IComm;

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
     * existing callback for the same target name will be overidden.  A registered
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
    ): IDisposable;

    /**
     * Register an IOPub message hook.
     *
     * @param msg_id - The parent_header message id in messages the hook should
     * intercept.
     *
     * @param hook - The callback invoked for the message.
     *
     * @returns A disposable used to unregister the message hook.
     *
     * #### Notes
     * The IOPub hook system allows you to preempt the handlers for IOPub
     * messages with a given parent_header message id. The most recently
     * registered hook is run first. If a hook return value resolves to false,
     * any later hooks and the future's onIOPub handler will not run. If a hook
     * throws an error, the error is logged to the console and the next hook is
     * run. If a hook is registered during the hook processing, it will not run
     * until the next message. If a hook is disposed during the hook processing,
     * it will be deactivated immediately.
     *
     * See also [[IFuture.registerMessageHook]].
     */
    registerMessageHook(
      msgId: string,
      hook: (msg: KernelMessage.IIOPubMessage) => boolean | PromiseLike<boolean>
    ): IDisposable;
  }

  /**
   * The full interface of a kernel.
   */
  export interface IKernel extends IKernelConnection {
    /**
     * A signal emitted when the kernel is shut down.
     */
    terminated: ISignal<this, void>;

    /**
     * A signal emitted when the kernel status changes.
     */
    statusChanged: ISignal<this, Kernel.Status>;

    /**
     * A signal emitted after an iopub kernel message is handled.
     */
    iopubMessage: ISignal<this, KernelMessage.IIOPubMessage>;

    /**
     * A signal emitted for unhandled non-iopub kernel messages that claimed to
     * be responses for messages we sent using this kernel object.
     */
    unhandledMessage: ISignal<this, KernelMessage.IMessage>;

    /**
     * A signal emitted when any kernel message is sent or received.
     *
     * #### Notes
     * This signal is emitted before any message handling has happened. The
     * message should be treated as read-only.
     */
    anyMessage: ISignal<this, IAnyMessageArgs>;

    /**
     * The server settings for the kernel.
     */
    readonly serverSettings: ServerConnection.ISettings;

    /**
     * Shutdown a kernel.
     *
     * @returns A promise that resolves when the kernel has shut down.
     *
     * #### Notes
     * Uses the [Jupyter Notebook
     * API](http://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter/notebook/master/notebook/services/api/api.yaml#!/kernels).
     *
     * On a valid response, closes the websocket, emits the [[terminated]]
     * signal, disposes of the kernel object, and fulfills the promise.
     *
     * The promise will be rejected if the kernel status is `'dead'`, the
     * request fails, or the response is invalid.
     */
    shutdown(): Promise<void>;
  }

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
   * `Kernel.IModel`. Otherwise, we attempt to find the existing kernel. The
   * promise is fulfilled when the kernel is found, otherwise the promise is
   * rejected.
   */
  export function findById(
    id: string,
    settings?: ServerConnection.ISettings
  ): Promise<IModel> {
    return DefaultKernel.findById(id, settings);
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
    return DefaultKernel.getSpecs(settings);
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
    return DefaultKernel.listRunning(settings);
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
  export function startNew(options: Kernel.IOptions = {}): Promise<IKernel> {
    return DefaultKernel.startNew(options);
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
  ): IKernel {
    return DefaultKernel.connectTo(model, settings);
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
    return DefaultKernel.shutdown(id, settings);
  }

  /**
   * Shut down all kernels.
   *
   * @returns A promise that resolves when all of the kernels are shut down.
   */
  export function shutdownAll(
    settings?: ServerConnection.ISettings
  ): Promise<void> {
    return DefaultKernel.shutdownAll(settings);
  }

  /**
   * The options object used to initialize a kernel.
   */
  export interface IOptions {
    /**
     * The kernel type (e.g. python3).
     */
    name?: string;

    /**
     * The server settings for the kernel.
     */
    serverSettings?: ServerConnection.ISettings;

    /**
     * The username of the kernel client.
     */
    username?: string;

    /**
     * The unique identifier for the kernel client.
     */
    clientId?: string;
  }

  /**
   * Object which manages kernel instances for a given base url.
   *
   * #### Notes
   * The manager is responsible for maintaining the state of running
   * kernels and the initial fetch of kernel specs.
   */
  export interface IManager extends IDisposable {
    /**
     * A signal emitted when the kernel specs change.
     */
    specsChanged: ISignal<IManager, ISpecModels>;

    /**
     * A signal emitted when the running kernels change.
     */
    runningChanged: ISignal<IManager, IModel[]>;

    /**
     * The server settings for the manager.
     */
    serverSettings?: ServerConnection.ISettings;

    /**
     * The kernel spec models.
     *
     * #### Notes
     * The value will be null until the manager is ready.
     */
    readonly specs: Kernel.ISpecModels | null;

    /**
     * Whether the manager is ready.
     */
    readonly isReady: boolean;

    /**
     * A promise that resolves when the manager is initially ready.
     */
    readonly ready: Promise<void>;

    /**
     * Create an iterator over the known running kernels.
     *
     * @returns A new iterator over the running kernels.
     */
    running(): IIterator<IModel>;

    /**
     * Force a refresh of the specs from the server.
     *
     * @returns A promise that resolves when the specs are fetched.
     *
     * #### Notes
     * This is intended to be called only in response to a user action,
     * since the manager maintains its internal state.
     */
    refreshSpecs(): Promise<void>;

    /**
     * Force a refresh of the running kernels.
     *
     * @returns A promise that resolves when the models are refreshed.
     *
     * #### Notes
     * This is intended to be called only in response to a user action,
     * since the manager maintains its internal state.
     */
    refreshRunning(): Promise<void>;

    /**
     * Start a new kernel.
     *
     * @param options - The kernel options to use.
     *
     * @returns A promise that resolves with the kernel instance.
     *
     * #### Notes
     * The manager `serverSettings` will be always be used.
     */
    startNew(options?: IOptions): Promise<IKernel>;

    /**
     * Find a kernel by id.
     *
     * @param id - The id of the target kernel.
     *
     * @returns A promise that resolves with the kernel's model.
     */
    findById(id: string): Promise<IModel>;

    /**
     * Connect to an existing kernel.
     *
     * @param model - The model of the target kernel.
     *
     * @returns A promise that resolves with the new kernel instance.
     */
    connectTo(model: Kernel.IModel): IKernel;

    /**
     * Shut down a kernel by id.
     *
     * @param id - The id of the target kernel.
     *
     * @returns A promise that resolves when the operation is complete.
     */
    shutdown(id: string): Promise<void>;

    /**
     * Shut down all kernels.
     *
     * @returns A promise that resolves when all of the kernels are shut down.
     */
    shutdownAll(): Promise<void>;
  }

  /**
   * A Future interface for responses from the kernel.
   *
   * When a message is sent to a kernel, a Future is created to handle any
   * responses that may come from the kernel.
   */
  export interface IFuture extends IDisposable {
    /**
     * The original outgoing message.
     */
    readonly msg: KernelMessage.IShellMessage;

    /**
     * A promise that resolves when the future is done.
     *
     * #### Notes
     * The future is done when there are no more responses expected from the
     * kernel.
     *
     * The `done` promise resolves to the reply message if there is one,
     * otherwise it resolves to `undefined`.
     */
    readonly done: Promise<KernelMessage.IShellMessage | undefined>;

    /**
     * The reply handler for the kernel future.
     *
     * #### Notes
     * If the handler returns a promise, all kernel message processing pauses
     * until the promise is resolved. If there is a reply message, the future
     * `done` promise also resolves to the reply message after this handler has
     * been called.
     */
    onReply: (msg: KernelMessage.IShellMessage) => void | PromiseLike<void>;

    /**
     * The stdin handler for the kernel future.
     *
     * #### Notes
     * If the handler returns a promise, all kernel message processing pauses
     * until the promise is resolved.
     */
    onStdin: (msg: KernelMessage.IStdinMessage) => void | PromiseLike<void>;

    /**
     * The iopub handler for the kernel future.
     *
     * #### Notes
     * If the handler returns a promise, all kernel message processing pauses
     * until the promise is resolved.
     */
    onIOPub: (msg: KernelMessage.IIOPubMessage) => void | PromiseLike<void>;

    /**
     * Register hook for IOPub messages.
     *
     * @param hook - The callback invoked for an IOPub message.
     *
     * #### Notes
     * The IOPub hook system allows you to preempt the handlers for IOPub
     * messages handled by the future.
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
     */
    registerMessageHook(
      hook: (msg: KernelMessage.IIOPubMessage) => boolean | PromiseLike<boolean>
    ): void;

    /**
     * Remove a hook for IOPub messages.
     *
     * @param hook - The hook to remove.
     *
     * #### Notes
     * If a hook is removed during the hook processing, it will be deactivated immediately.
     */
    removeMessageHook(
      hook: (msg: KernelMessage.IIOPubMessage) => boolean | PromiseLike<boolean>
    ): void;

    /**
     * Send an `input_reply` message.
     */
    sendInputReply(content: KernelMessage.IInputReply): void;
  }

  /**
   * A client side Comm interface.
   */
  export interface IComm extends IDisposable {
    /**
     * The unique id for the comm channel.
     */
    readonly commId: string;

    /**
     * The target name for the comm channel.
     */
    readonly targetName: string;

    /**
     * Callback for a comm close event.
     *
     * #### Notes
     * This is called when the comm is closed from either the server or client.
     * If this is called in response to a kernel message and the handler returns
     * a promise, all kernel message processing pauses until the promise is
     * resolved.
     */
    onClose: (msg: KernelMessage.ICommCloseMsg) => void | PromiseLike<void>;

    /**
     * Callback for a comm message received event.
     *
     * #### Notes
     * If the handler returns a promise, all kernel message processing pauses
     * until the promise is resolved.
     */
    onMsg: (msg: KernelMessage.ICommMsgMsg) => void | PromiseLike<void>;

    /**
     * Open a comm with optional data and metadata.
     *
     * @param data - The data to send to the server on opening.
     *
     * @param metadata - Additional metatada for the message.
     *
     * @returns A future for the generated message.
     *
     * #### Notes
     * This sends a `comm_open` message to the server.
     */
    open(
      data?: JSONValue,
      metadata?: JSONObject,
      buffers?: (ArrayBuffer | ArrayBufferView)[]
    ): IFuture;

    /**
     * Send a `comm_msg` message to the kernel.
     *
     * @param data - The data to send to the server on opening.
     *
     * @param metadata - Additional metatada for the message.
     *
     * @param buffers - Optional buffer data.
     *
     * @param disposeOnDone - Whether to dispose of the future when done.
     *
     * @returns A future for the generated message.
     *
     * #### Notes
     * This is a no-op if the comm has been closed.
     */
    send(
      data: JSONValue,
      metadata?: JSONObject,
      buffers?: (ArrayBuffer | ArrayBufferView)[],
      disposeOnDone?: boolean
    ): IFuture;

    /**
     * Close the comm.
     *
     * @param data - The data to send to the server on opening.
     *
     * @param metadata - Additional metatada for the message.
     *
     * @returns A future for the generated message.
     *
     * #### Notes
     * This will send a `comm_close` message to the kernel, and call the
     * `onClose` callback if set.
     *
     * This is a no-op if the comm is already closed.
     */
    close(
      data?: JSONValue,
      metadata?: JSONObject,
      buffers?: (ArrayBuffer | ArrayBufferView)[]
    ): IFuture;
  }

  /**
   * The valid Kernel status states.
   */
  export type Status =
    | 'unknown'
    | 'starting'
    | 'reconnecting'
    | 'idle'
    | 'busy'
    | 'restarting'
    | 'dead'
    | 'connected';

  /**
   * The kernel model provided by the server.
   *
   * #### Notes
   * See the [Jupyter Notebook API](http://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter/notebook/master/notebook/services/api/api.yaml#!/kernels).
   */
  export interface IModel extends JSONObject {
    /**
     * Unique identifier of the kernel server session.
     */
    readonly id: string;

    /**
     * The name of the kernel.
     */
    readonly name: string;
  }

  /**
   * Kernel Spec interface.
   *
   * #### Notes
   * See [Kernel specs](https://jupyter-client.readthedocs.io/en/latest/kernels.html#kernelspecs).
   */
  export interface ISpecModel extends JSONObject {
    /**
     * The name of the kernel spec.
     */
    readonly name: string;

    /**
     * The name of the language of the kernel.
     */
    readonly language: string;

    /**
     * A list of command line arguments used to start the kernel.
     */
    readonly argv: string[];

    /**
     * The kernel’s name as it should be displayed in the UI.
     */
    readonly display_name: string;

    /**
     * A dictionary of environment variables to set for the kernel.
     */
    readonly env?: JSONObject;

    /**
     * A mapping of resource file name to download path.
     */
    readonly resources: { [key: string]: string };
  }

  /**
   * The available kernelSpec models.
   *
   * #### Notes
   * See the [Jupyter Notebook API](http://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter/notebook/master/notebook/services/api/api.yaml#!/kernelspecs).
   */
  export interface ISpecModels extends JSONObject {
    /**
     * The name of the default kernel spec.
     */
    default: string;

    /**
     * A mapping of kernel spec name to spec.
     */
    readonly kernelspecs: { [key: string]: ISpecModel };
  }

  /**
   * Arguments interface for the anyMessage signal.
   */
  export interface IAnyMessageArgs {
    /**
     * The message that is being signaled.
     */
    msg: Readonly<KernelMessage.IMessage>;

    /**
     * The direction of the message.
     */
    direction: 'send' | 'recv';
  }
}
