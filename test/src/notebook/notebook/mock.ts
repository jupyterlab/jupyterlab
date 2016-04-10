import {
  IAjaxSettings
} from 'jupyter-js-utils';

import * as utils
  from 'jupyter-js-utils';

import {
  IComm, ICommInfoRequest, ICommInfoReply, ICommOpen, ICompleteReply,
  ICompleteRequest, IExecuteRequest, IInspectReply,
  IInspectRequest, IIsCompleteReply, IIsCompleteRequest, IInputReply, IKernel,
  IKernelFuture, IKernelId, IKernelInfo, IKernelManager, IKernelMessage,
  IKernelMessageHeader, IKernelMessageOptions, IKernelOptions, IKernelSpecIds,
  KernelStatus, IKernelIOPubCommOpenMessage, IKernelSpec, createKernelMessage,
  INotebookSession, ISessionOptions
} from 'jupyter-js-services';

import {
  DisposableDelegate, IDisposable
} from 'phosphor-disposable';

import {
  ISignal, Signal, clearSignalData
} from 'phosphor-signaling';


/**
 * Implementation of a kernel future.
 */
export
class KernelFutureHandler extends DisposableDelegate implements IKernelFuture {

  /**
   * Construct a new KernelFutureHandler.
   */
  constructor(cb: () => void, msg: IKernelMessage, expectShell: boolean, disposeOnDone: boolean) {
    super(cb);
    this._msg = msg;
    if (!expectShell) {
      this._setFlag(KernelPrivate.KernelFutureFlag.GotReply);
    }
    this._disposeOnDone = disposeOnDone;
  }

  /**
   * Get the original outgoing message.
   */
  get msg(): IKernelMessage {
    return this._msg;
  }

  /**
   * Check for message done state.
   */
  get isDone(): boolean {
    return this._testFlag(KernelPrivate.KernelFutureFlag.IsDone);
  }

  /**
   * Get the reply handler.
   */
  get onReply(): (msg: IKernelMessage) => void {
    return this._reply;
  }

  /**
   * Set the reply handler.
   */
  set onReply(cb: (msg: IKernelMessage) => void) {
    this._reply = cb;
  }

  /**
   * Get the iopub handler.
   */
  get onIOPub(): (msg: IKernelMessage) => void {
    return this._iopub;
  }

  /**
   * Set the iopub handler.
   */
  set onIOPub(cb: (msg: IKernelMessage) => void) {
    this._iopub = cb;
  }

  /**
   * Get the done handler.
   */
  get onDone(): (msg: IKernelMessage) => void  {
    return this._done;
  }

  /**
   * Set the done handler.
   */
  set onDone(cb: (msg: IKernelMessage) => void) {
    this._done = cb;
  }

  /**
   * Get the stdin handler.
   */
  get onStdin(): (msg: IKernelMessage) => void {
    return this._stdin;
  }

  /**
   * Set the stdin handler.
   */
  set onStdin(cb: (msg: IKernelMessage) => void) {
    this._stdin = cb;
  }

  /**
   * Dispose and unregister the future.
   */
  dispose(): void {
    this._stdin = null;
    this._iopub = null;
    this._reply = null;
    this._done = null;
    this._msg = null;
    super.dispose();
  }

  /**
   * Handle an incoming kernel message.
   */
  handleMsg(msg: IKernelMessage): void {
    switch (msg.channel) {
    case 'shell':
      this._handleReply(msg);
      break;
    case 'stdin':
      this._handleStdin(msg);
      break;
    case 'iopub':
      this._handleIOPub(msg);
      break;
    }
  }

  private _handleReply(msg: IKernelMessage): void {
    let reply = this._reply;
    if (reply) reply(msg);
    this._setFlag(KernelPrivate.KernelFutureFlag.GotReply);
    if (this._testFlag(KernelPrivate.KernelFutureFlag.GotIdle)) {
      this._handleDone(msg);
    }
  }

  private _handleStdin(msg: IKernelMessage): void {
    let stdin = this._stdin;
    if (stdin) stdin(msg);
  }

  private _handleIOPub(msg: IKernelMessage): void {
    let iopub = this._iopub;
    if (iopub) iopub(msg);
    if (msg.header.msg_type === 'status' &&
        msg.content.execution_state === 'idle') {
      this._setFlag(KernelPrivate.KernelFutureFlag.GotIdle);
      if (this._testFlag(KernelPrivate.KernelFutureFlag.GotReply)) {
        this._handleDone(msg);
      }
    }
  }

  private _handleDone(msg: IKernelMessage): void {
    if (this.isDone) {
      return;
    }
    this._setFlag(KernelPrivate.KernelFutureFlag.IsDone);
    let done = this._done;
    if (done) done(msg);
    this._done = null;
    if (this._disposeOnDone) {
      this.dispose();
    }
  }

  /**
   * Test whether the given future flag is set.
   */
  private _testFlag(flag: KernelPrivate.KernelFutureFlag): boolean {
    return (this._status & flag) !== 0;
  }

  /**
   * Set the given future flag.
   */
  private _setFlag(flag: KernelPrivate.KernelFutureFlag): void {
    this._status |= flag;
  }

  private _msg: IKernelMessage = null;
  private _status = 0;
  private _stdin: (msg: IKernelMessage) => void = null;
  private _iopub: (msg: IKernelMessage) => void = null;
  private _reply: (msg: IKernelMessage) => void = null;
  private _done: (msg: IKernelMessage) => void = null;
  private _disposeOnDone = true;
}


/**
 * A mock kernel object that only handles execution requests.
 */
export
class MockKernel implements IKernel {

  constructor(options?: IKernelId) {
    options = options || {};
    this._id = options.id || '';
    this._name = options.name || 'python';
    this._status = KernelStatus.Idle;
  }

  /**
   * A signal emitted when the kernel status changes.
   */
  get statusChanged(): ISignal<IKernel, KernelStatus> {
    return KernelPrivate.statusChangedSignal.bind(this);
  }

  /**
   * A signal emitted for unhandled kernel message.
   */
  get unhandledMessage(): ISignal<IKernel, IKernelMessage> {
    return KernelPrivate.unhandledMessageSignal.bind(this);
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
     return '';
   }

  /**
   * The client unique id.
   */
  get clientId(): string {
    return '';
  }

  /**
   * The current status of the kernel.
   */
  get status(): KernelStatus {
    return this._status;
  }

  /**
   * Get a copy of the default ajax settings for the kernel.
   */
  get ajaxSettings(): IAjaxSettings {
    return {};
  }

  /**
   * Set the default ajax settings for the kernel.
   */
  set ajaxSettings(value: IAjaxSettings) { }

  /**
   * Test whether the kernel has been disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed
  }

  /**
   * Dispose of the resources held by the kernel.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;
  }

  /**
   * Send a shell message to the kernel.
   */
  sendShellMessage(msg: IKernelMessage, expectReply=false, disposeOnDone=true): KernelFutureHandler {
    return new KernelFutureHandler(() => {}, msg, expectReply, disposeOnDone);
  }

  /**
   * Interrupt a kernel.
   */
  interrupt(): Promise<void> {
    return Promise.resolve(void 0);
  }

  /**
   * Restart a kernel.
   */
  restart(): Promise<void> {
    return Promise.resolve(void 0);
  }

  /**
   * Shutdown a kernel.
   */
  shutdown(): Promise<void> {
    return Promise.resolve(void 0);
  }

  /**
   * Send a `kernel_info_request` message.
   */
  kernelInfo(): Promise<IKernelInfo> {
    return Promise.resolve(void 0);
  }

  /**
   * Send a `complete_request` message.
   */
  complete(contents: ICompleteRequest): Promise<ICompleteReply> {
    return Promise.resolve(void 0);
  }

  /**
   * Send an `inspect_request` message.
   */
  inspect(contents: IInspectRequest): Promise<IInspectReply> {
    return Promise.resolve(void 0);
  }

  /**
   * Send an `execute_request` message.
   */
  execute(contents: IExecuteRequest, disposeOnDone: boolean = true): IKernelFuture {
    let options: IKernelMessageOptions = {
      msgType: 'execute_request',
      channel: 'shell',
      username: '',
      session: ''
    };
    let defaults = {
      silent : false,
      store_history : true,
      user_expressions : {},
      allow_stdin : true,
      stop_on_error : false
    };
    contents = utils.extend(defaults, contents);
    let msg = createKernelMessage(options, contents);
    return this.sendShellMessage(msg, true, disposeOnDone);
  }

  /**
   * Send an `is_complete_request` message.
   */
  isComplete(contents: IIsCompleteRequest): Promise<IIsCompleteReply> {
    return Promise.resolve(void 0);
  }

  /**
   * Send a `comm_info_request` message.
   */
  commInfo(contents: ICommInfoRequest): Promise<ICommInfoReply> {
    return Promise.resolve(void 0);
  }

  /**
   * Send an `input_reply` message.
   */
  sendInputReply(contents: IInputReply): void { }

  /**
   * Register a comm target handler.
   */
  registerCommTarget(targetName: string, callback: (comm: IComm, msg: IKernelIOPubCommOpenMessage) => void): IDisposable {
    return void 0;
  }

  /**
   * Connect to a comm, or create a new one.
   */
  connectToComm(targetName: string, commId?: string): IComm {
    return void 0;
  }

  /**
   * Get the kernel spec associated with the kernel.
   */
  getKernelSpec(): Promise<IKernelSpec> {
    return Promise.resolve(void 0);
  }

  private _id = '';
  private _name = '';
  private _status = KernelStatus.Unknown;
  private _isDisposed = false;
}


/**
 * A mock notebook session object that uses a mock kernel.
 */
export
class MockSession implements INotebookSession {

  constructor(path: string, kernel?: MockKernel) {
    this._notebookPath = path;
    this._kernel = kernel || new MockKernel();
    this._kernel.statusChanged.connect(this.onKernelStatus, this);
    this._kernel.unhandledMessage.connect(this.onUnhandledMessage, this);
  }

  /**
   * A signal emitted when the session dies.
   */
  get sessionDied(): ISignal<INotebookSession, void> {
    return SessionPrivate.sessionDiedSignal.bind(this);
  }

  /**
   * A signal emitted when the kernel changes.
   */
  get kernelChanged(): ISignal<INotebookSession, IKernel> {
    return SessionPrivate.kernelChangedSignal.bind(this);
  }

  /**
   * A signal emitted when the kernel status changes.
   */
  get statusChanged(): ISignal<INotebookSession, KernelStatus> {
    return SessionPrivate.statusChangedSignal.bind(this);
  }

  /**
   * A signal emitted for an unhandled kernel message.
   */
  get unhandledMessage(): ISignal<INotebookSession, IKernelMessage> {
    return SessionPrivate.unhandledMessageSignal.bind(this);
  }

  /**
   * Get the session id.
   *
   * #### Notes
   * This is a read-only property.
   */
  get id(): string {
    return this._id;
  }

  /**
   * Get the session kernel object.
   */
  get kernel() : IKernel {
    return this._kernel;
  }

  /**
   * Get the notebook path.
   */
  get notebookPath(): string {
    return this._notebookPath;
  }

  /**
   * The current status of the session.
   */
  get status(): KernelStatus {
    return this._kernel.status;
  }

  /**
   * Get a copy of the default ajax settings for the session.
   */
  get ajaxSettings(): IAjaxSettings {
    return {};
  }

  /**
   * Set the default ajax settings for the session.
   */
  set ajaxSettings(value: IAjaxSettings) { }

  /**
   * Test whether the session has been disposed.
   *
   * #### Notes
   * This is a read-only property which is always safe to access.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Dispose of the resources held by the session.
   */
  dispose(): void {
    this._isDisposed = true;
  }

  /**
   * Rename or move a notebook.
   */
  renameNotebook(path: string): Promise<void> {
    this._notebookPath = path;
    return Promise.resolve(void 0);
  }

  /**
   * Change the kernel.
   */
  changeKernel(options: IKernelId): Promise<IKernel> {
    this._kernel.dispose();
    this._kernel = new MockKernel(options);
    this.kernelChanged.emit(this._kernel);
    return Promise.resolve(this._kernel);
  }

  /**
   * Kill the kernel and shutdown the session.
   */
  shutdown(): Promise<void> {
    this._kernel.dispose();
    this._kernel = null;
    this.sessionDied.emit(void 0);
    return Promise.resolve(void 0);
  }

  /**
   * Handle to changes in the Kernel status.
   */
  protected onKernelStatus(sender: IKernel, state: KernelStatus) {
    this.statusChanged.emit(state);
  }

  /**
   * Handle unhandled kernel messages.
   */
  protected onUnhandledMessage(sender: IKernel, msg: IKernelMessage) {
    this.unhandledMessage.emit(msg);
  }

  private _isDisposed = false;
  private _id = '';
  private _notebookPath = '';
  private _kernel: IKernel = null;
}


/**
 * A namespace for notebook session private data.
 */
namespace SessionPrivate {
  /**
   * A signal emitted when the session is shut down.
   */
  export
  const sessionDiedSignal = new Signal<INotebookSession, void>();

  /**
   * A signal emitted when the kernel changes.
   */
  export
  const kernelChangedSignal = new Signal<INotebookSession, IKernel>();

  /**
   * A signal emitted when the session kernel status changes.
   */
  export
  const statusChangedSignal = new Signal<INotebookSession, KernelStatus>();

  /**
   * A signal emitted for an unhandled kernel message.
   */
  export
  const unhandledMessageSignal = new Signal<INotebookSession, IKernelMessage>();
}


namespace KernelPrivate {
  /**
   * A signal emitted when the kernel status changes.
   */
  export
  const statusChangedSignal = new Signal<IKernel, KernelStatus>();

  /**
   * A signal emitted for unhandled kernel message.
   */
  export
  const unhandledMessageSignal = new Signal<IKernel, IKernelMessage>();

  /**
   * Bit flags for the kernel future state.
   */
  export
  enum KernelFutureFlag {
    GotReply = 0x1,
    GotIdle = 0x2,
    IsDone = 0x4,
    DisposeOnDone = 0x8,
  }
}
