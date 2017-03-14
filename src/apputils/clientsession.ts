// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Kernel, KernelMessage, Session, utils
} from '@jupyterlab/services';

import {
  ArrayExt, toArray
} from '@phosphor/algorithm';

import {
  PromiseDelegate
} from '@phosphor/coreutils';

import {
  IDisposable
} from '@phosphor/disposable';

import {
  ISignal, Signal
} from '@phosphor/signaling';

import {
  showDialog, Dialog
} from '../apputils';


/**
 * The interface of client session object.
 *
 * The client session represents the link between
 * a path and its kernel for the duration of the lifetime
 * of the session object.  The session can have no current
 * kernel, and can start a new kernel at any time.
 */
export
class ClientSession implements IDisposable {
  /**
   * Construct a new client session.
   */
  constructor(options: ClientSession.IOptions) {
    let manager = this._manager = options.manager;
    manager.runningChanged.connect(this._onSessionsChanged, this);
    this._path = options.path;
    this._type = options.type || '';
    this._name = options.name || '';
    this._preferredKernelName = options.preferredKernelName || '';
    this._preferredKernelLanguage = (
      options.preferredKernelLanguage || ''
    );
    this._onSessionsChanged(manager, toArray(manager.running()));
  }

  /**
   * A signal emitted when the session is shut down.
   */
  get terminated(): ISignal<this, void> {
    return this._terminated;
  }

  /**
   * A signal emitted when the kernel changes.
   */
  get kernelChanged(): ISignal<this, Kernel.IKernel> {
    return this._kernelChanged;
  }

  /**
   * A signal emitted when the kernel status changes.
   */
  get statusChanged(): ISignal<this, Kernel.Status> {
    return this._statusChanged;
  }

  /**
   * A signal emitted for a kernel messages.
   */
  get iopubMessage(): ISignal<this, KernelMessage.IMessage> {
    return this._iopubMessage;
  }

  /**
   * A signal emitted for an unhandled kernel message.
   */
  get unhandledMessage(): ISignal<this, KernelMessage.IMessage> {
    return this._unhandledMessage;
  }

  /**
   * A signal emitted when the session path changes.
   */
  get pathChanged(): ISignal<this, string> {
    return this._pathChanged;
  }

  /**
   * The current kernel associated with the document.
   */
  get kernel(): Kernel.IKernel {
    return this._session ? this._session.kernel : null;
  }

  /**
   * The current path associated with the client sesssion.
   */
  get path(): string {
    return this._path;
  }

  /**
   * The current name associated with the client sesssion.
   */
  get name(): string {
    return this._name;
  }

  /**
   * The current status of the client session.
   */
  get status(): Kernel.Status {
    if (this._promise) {
      return 'starting';
    }
    return this._session ? this._session.status : 'dead';
  }

  /**
   * The preferred kernel name.
   */
  get preferredKernelName(): string {
    return this._preferredKernelName;
  }
  set preferredKernelName(value: string) {
    this._preferredKernelName = value;
  }

  /**
   * The desired kernel language.
   */
  get preferredKernelLanguage(): string {
    return this._preferredKernelLanguage;
  }
  set preferredKernelLanguage(value: string) {
    this._preferredKernelLanguage = value;
  }

  /**
   * The type of the client session.
   */
  get type(): string {
    return this._type;
  }

  /**
   * Test whether the context is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Dispose of the resources held by the context.
   */
  dispose(): void {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    if (this._session) {
      this._session.dispose();
    }
    Signal.clearData(this);
  }

  /**
   * Change the current kernel associated with the document.
   */
  changeKernel(options: Kernel.IModel): Promise<Kernel.IKernel> {
    let session = this._session;
    if (session) {
      return session.changeKernel(options);
    } else if (this._promise) {
      return this._promise.promise.then(() => {
        return session.changeKernel(options);
      });
    } else {
      return this._startSession(options);
    }
  }

  /**
   * Kill the kernel and shutdown the session.
   *
   * @returns A promise that resolves when the session is shut down.
   */
  shutdown(): Promise<void> {
    if (this._session) {
      return this._session.shutdown();
    } else if (this._promise) {
      return this._promise.promise.then(() => {
        return this._session.shutdown();
      });
    }
    return Promise.resolve(void 0);
  }

  /**
   * Restart the session.
   *
   * @returns A promise that resolves with the kernel model.
   *
   * #### Notes
   * If there is a running kernel, present a dialog.
   * If there is no kernel, we start a kernel with the last run
   * kernel name.  If no kernel has been started, this is a no-op.
   */
  restart(): Promise<Kernel.IKernel | null> {
    let kernel = this.kernel;
    if (!kernel) {
      if (this._prevKernelName) {
        return this.changeKernel({ name: this._prevKernelName });
      }
      return Promise.resolve(null);
    }
    return ClientSession.restartKernel(kernel);
  }

  /**
   * Select a kernel for the session.
   */
  selectKernel(): Promise<void> {
    return Private.selectKernel(this, this._manager).then(kernel => {
      if (kernel) {
        return this.changeKernel(kernel);
      } else {
        return this.shutdown() as Promise<null>;
      }
    }).then(() => void 0);
  }

  /**
   * Get a kernel select node for the session.
   */
  getKernelSelect(): HTMLSelectElement {
    return Private.getKernelSelect(this, this._manager);
  }

  /**
   * Change the session path.
   *
   * @param path - The new session path.
   *
   * @returns A promise that resolves when the session has renamed.
   *
   * #### Notes
   * This uses the Jupyter REST API, and the response is validated.
   * The promise is fulfilled on a valid response and rejected otherwise.
   */
  setPath(path: string): Promise<void> {
    this._path = path;
    if (this._session) {
      return this._session.rename(path);
    }
    return Promise.resolve(void 0);
  }

  /**
   * Change the session name.
   */
  setName(name: string): Promise<void> {
    // no-op until supported.
    this._name = name;
    return Promise.resolve(void 0);
  }

  /**
   * Change the session type.
   */
  setType(type: string): Promise<void> {
    // no-op until supported.
    this._type = type;
    return Promise.resolve(void 0);
  }

  /**
   * Start a session and set up its signals.
   */
  private _startSession(model: Kernel.IModel): Promise<Kernel.IKernel> {
    this._promise = new PromiseDelegate<void>();
    return this._manager.startNew({
      path: this._path,
      kernelName: model.name,
      kernelId: model.id
    }).then(session => {
      return this._handleNewSession(session);
    }).catch(err => {
      return this._handleSessionError(err);
    });
  }

  /**
   * Handle a new session object.
   */
  private _handleNewSession(session: Session.ISession): Kernel.IKernel {
    if (this.isDisposed) {
      return null;
    }
    if (this._session) {
      this._session.dispose();
    }
    this._promise.resolve(void 0);
    this._promise = null;
    this._session = session;
    session.terminated.connect(this._onTerminated, this);
    session.pathChanged.connect(this._onPathChanged, this);
    session.kernelChanged.connect(this._onKernelChanged, this);
    session.statusChanged.connect(this._onStatusChanged, this);
    session.iopubMessage.connect(this._onIopubMessage, this);
    session.unhandledMessage.connect(this._onUnhandledMessage, this);
    this._kernelChanged.emit(session.kernel);
    this._prevKernelName = session.kernel.name;
    return session.kernel;
  }

  /**
   * Handle an error in session startup.
   */
  private _handleSessionError(err: utils.IAjaxError): Promise<void> {
    this._promise.resolve(void 0);
    this._promise = null;
    let response = JSON.parse(err.xhr.response);
    let body = document.createElement('pre');
    body.textContent = response['traceback'];
    return showDialog({
      title: 'Error Starting Kernel',
      body,
      buttons: [Dialog.okButton()]
    }).then(() => {
      return Promise.reject<void>(err);
    });
  }

  /**
   * Handle a session termination.
   */
  private _onTerminated(): void {
    this._session.dispose();
    this._session = null;
    this._terminated.emit(void 0);
  }

  /**
   * Handle a change to a session path.
   */
  private _onPathChanged(sender: Session.ISession, path: string) {
    if (path !== this._path) {
      this._path = path;
      this._pathChanged.emit(path);
    }
  }

  /**
   * Handle a change to the kernel.
   */
  private _onKernelChanged(sender: Session.ISession): void {
    this._kernelChanged.emit(sender.kernel);
  }

  /**
   * Handle a change to the session status.
   */
  private _onStatusChanged(): void {
    this._statusChanged.emit(this.status);
  }

  /**
   * Handle an iopub message.
   */
  private _onIopubMessage(sender: Session.ISession, message: KernelMessage.IIOPubMessage): void {
    this._iopubMessage.emit(message);
  }

  /**
   * Handle an unhandled message.
   */
  private _onUnhandledMessage(sender: Session.ISession, message: KernelMessage.IMessage): void {
    this._unhandledMessage.emit(message);
  }

  /**
   * Handle a change to the running sessions.
   */
  private _onSessionsChanged(sender: Session.IManager, models: Session.IModel[]): void {
    let index = ArrayExt.findFirstIndex(models, model => {
      return model.notebook.path === this._path;
    });
    if (index !== -1 && !this._session && !this._promise) {
      let id = models[index].id;
      this._promise = new PromiseDelegate<void>();
      this._manager.connectTo(id).then(session => {
        this._handleNewSession(session);
      }).catch(err => {
        this._handleSessionError(err);
      });
    }
  }

  private _manager: Session.IManager;
  private _path = '';
  private _name = '';
  private _type = '';
  private _preferredKernelName = '';
  private _preferredKernelLanguage = '';
  private _prevKernelName = '';
  private _isDisposed = false;
  private _session: Session.ISession | null = null;
  private _promise: PromiseDelegate<void> | null;
  private _terminated = new Signal<this, void>(this);
  private _kernelChanged = new Signal<this, Kernel.IKernel>(this);
  private _statusChanged = new Signal<this, Kernel.Status>(this);
  private _iopubMessage = new Signal<this, KernelMessage.IMessage>(this);
  private _unhandledMessage = new Signal<this, KernelMessage.IMessage>(this);
  private _pathChanged = new Signal<this, string>(this);
}


/**
 * A namespace for `ClientSession` statics.
 */
export namespace ClientSession {
  /**
   * The options used to initialize a context.
   */
  export
  interface IOptions {
    /**
     * A session manager instance.
     */
    manager: Session.IManager;

    /**
     * The initial path of the file.
     */
    path: string;

    /**
     * The name of with the session.
     */
    name?: string;

    /**
     * The type of the session.
     */
    type?: string;

    /**
     * The preferred kernel name.
     */
    preferredKernelName?: string;

    /**
     * The desired kernel language.
     */
    preferredKernelLanguage?: string;
  }

  /**
   * Restart a kernel if the user accepts the risk.
   */
  export
  function restartKernel(kernel: Kernel.IKernel): Promise<Kernel.IKernel | null> {
    let restartBtn = Dialog.warnButton({ label: 'RESTART '});
    return showDialog({
      title: 'Restart Kernel?',
      body: 'Do you want to restart the current kernel? All variables will be lost.',
      buttons: [Dialog.cancelButton(), restartBtn]
    }).then(result => {
      if (kernel.isDisposed) {
        return null;
      }
      if (result.accept) {
        return kernel.restart().then(() => {
          return kernel;
        });
      } else {
        return kernel;
      }
    });
  }
}


/**
 * The namespace for module private data.
 */
namespace Private {
  /**
   * Select a kernel for the session.
   */
  export
  function selectKernel(session: ClientSession, manager: Session.IManager): Promise<Kernel.IModel | null> {
    return Promise.resolve<Kernel.IModel | null>(null);
  }

  /**
   * Get a kernel select node for the session.
   */
  export
  function getKernelSelect(session: ClientSession, manager: Session.IManager): HTMLSelectElement {
    return null;
  }
}
