// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  PathExt, uuid
} from '@jupyterlab/coreutils';

import {
  Kernel, KernelMessage, ServerConnection, Session
} from '@jupyterlab/services';

import {
  IterableOrArrayLike, each, find
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
  Widget
} from '@phosphor/widgets';

import * as React from 'react';

import {
  showDialog, Dialog
} from './dialog';


/**
 * The interface of client session object.
 *
 * The client session represents the link between
 * a path and its kernel for the duration of the lifetime
 * of the session object.  The session can have no current
 * kernel, and can start a new kernel at any time.
 */
export
interface IClientSession extends IDisposable {
  /**
   * A signal emitted when the session is shut down.
   */
  readonly terminated: ISignal<this, void>;

  /**
   * A signal emitted when the kernel changes.
   */
  readonly kernelChanged: ISignal<this, Kernel.IKernelConnection | null>;

  /**
   * A signal emitted when the kernel status changes.
   */
  readonly statusChanged: ISignal<this, Kernel.Status>;

  /**
   * A signal emitted for a kernel messages.
   */
  readonly iopubMessage: ISignal<this, KernelMessage.IMessage>;

  /**
   * A signal emitted for an unhandled kernel message.
   */
  readonly unhandledMessage: ISignal<this, KernelMessage.IMessage>;

  /**
   * A signal emitted when a session property changes.
   */
  readonly propertyChanged: ISignal<this, 'path' | 'name' | 'type'>;

  /**
   * The current kernel associated with the document.
   */
  readonly kernel: Kernel.IKernelConnection | null;

  /**
   * The current path associated with the client sesssion.
   */
  readonly path: string;

  /**
   * The current name associated with the client sesssion.
   */
  readonly name: string;

  /**
   * The type of the client session.
   */
  readonly type: string;

  /**
   * The current status of the client session.
   */
  readonly status: Kernel.Status;

  /**
   * Whether the session is ready.
   */
  readonly isReady: boolean;

 /**
  * A promise that is fulfilled when the session is ready.
  */
  readonly ready: Promise<void>;

  /**
   * The kernel preference.
   */
  kernelPreference: IClientSession.IKernelPreference;

  /**
   * The display name of the kernel.
   */
  readonly kernelDisplayName: string;

  /**
   * Change the current kernel associated with the document.
   */
  changeKernel(options: Partial<Kernel.IModel>): Promise<Kernel.IKernelConnection>;

  /**
   * Kill the kernel and shutdown the session.
   *
   * @returns A promise that resolves when the session is shut down.
   */
  shutdown(): Promise<void>;

  /**
   * Select a kernel for the session.
   */
  selectKernel(): Promise<void>;

  /**
   * Restart the session.
   *
   * @returns A promise that resolves with whether the kernel has restarted.
   *
   * #### Notes
   * If there is a running kernel, present a dialog.
   * If there is no kernel, we start a kernel with the last run
   * kernel name and resolves with `true`. If no kernel has been started,
   * this is a no-op, and resolves with `false`.
   */
  restart(): Promise<boolean>;

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
  setPath(path: string): Promise<void>;

  /**
   * Change the session name.
   */
  setName(name: string): Promise<void>;

  /**
   * Change the session type.
   */
  setType(type: string): Promise<void>;
}


/**
 * The namespace for Client Session related interfaces.
 */
export
namespace IClientSession {
  /**
   * A kernel preference.
   */
  export
  interface IKernelPreference {
    /**
     * The name of the kernel.
     */
    readonly name?: string;

    /**
     * The preferred kernel language.
     */
    readonly language?: string;

    /**
     * The id of an existing kernel.
     */
    readonly id?: string;

    /**
     * Whether to prefer starting a kernel.
     */
    readonly shouldStart?: boolean;

    /**
     * Whether a kernel can be started.
     */
    readonly canStart?: boolean;

    /**
     * Whether to auto-start the default kernel if no matching kernel is found.
     */
    readonly autoStartDefault?: boolean;
  }
}


/**
 * The default implementation of client session object.
 */
export
class ClientSession implements IClientSession {
  /**
   * Construct a new client session.
   */
  constructor(options: ClientSession.IOptions) {
    this.manager = options.manager;
    this._path = options.path || uuid();
    this._type = options.type || '';
    this._name = options.name || '';
    this._setBusy = options.setBusy;
    this._kernelPreference = options.kernelPreference || {};
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
  get kernelChanged(): ISignal<this, Kernel.IKernelConnection | null> {
    return this._kernelChanged;
  }

  /**
   * A signal emitted when the status changes.
   */
  get statusChanged(): ISignal<this, Kernel.Status> {
    return this._statusChanged;
  }

  /**
   * A signal emitted for iopub kernel messages.
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
   * A signal emitted when a session property changes.
   */
  get propertyChanged(): ISignal<this, 'path' | 'name' | 'type'> {
    return this._propertyChanged;
  }

  /**
   * The current kernel of the session.
   */
  get kernel(): Kernel.IKernelConnection | null {
    return this._session ? this._session.kernel : null;
  }

  /**
   * The current path of the session.
   */
  get path(): string {
    return this._path;
  }

  /**
   * The current name of the session.
   */
  get name(): string {
    return this._name;
  }

  /**
   * The type of the client session.
   */
  get type(): string {
    return this._type;
  }

  /**
   * The kernel preference of the session.
   */
  get kernelPreference(): IClientSession.IKernelPreference {
    return this._kernelPreference;
  }
  set kernelPreference(value: IClientSession.IKernelPreference) {
    this._kernelPreference = value;
  }

  /**
   * The session manager used by the session.
   */
  readonly manager: Session.IManager;

  /**
   * The current status of the session.
   */
  get status(): Kernel.Status {
    if (!this.isReady) {
      return 'starting';
    }
    return this._session ? this._session.status : 'dead';
  }

  /**
   * Whether the session is ready.
   */
  get isReady(): boolean {
    return this._isReady;
  }

 /**
  * A promise that is fulfilled when the session is ready.
  */
  get ready(): Promise<void> {
    return this._ready.promise;
  }

  /**
   * The display name of the current kernel.
   */
  get kernelDisplayName(): string {
    let kernel = this.kernel;
    if (!kernel) {
      return 'No Kernel!';
    }
    let specs = this.manager.specs;
    if (!specs  ) {
      return 'Unknown!';
    }
    let spec = specs.kernelspecs[kernel.name];
    return spec ? spec.display_name : kernel.name;
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
      this._session = null;
    }
    if (this._dialog) {
      this._dialog.dispose();
    }
    Signal.clearData(this);
  }

  /**
   * Change the current kernel associated with the document.
   */
  changeKernel(options: Partial<Kernel.IModel>): Promise<Kernel.IKernelConnection> {
    return this.initialize().then(() => {
      if (this.isDisposed) {
        return Promise.reject('Disposed');
      }
      return this._changeKernel(options);
    });
  }

  /**
   * Select a kernel for the session.
   */
  selectKernel(): Promise<void> {
    return this.initialize().then(() => {
      if (this.isDisposed) {
        return Promise.reject('Disposed');
      }
      return this._selectKernel(true);
    });
  }

  /**
   * Kill the kernel and shutdown the session.
   *
   * @returns A promise that resolves when the session is shut down.
   */
  shutdown(): Promise<void> {
    const session = this._session;
    if (this.isDisposed || !session) {
      return Promise.resolve(void 0);
    }
    this._session = null;
    return session.shutdown();
  }

  /**
   * Restart the session.
   *
   * @returns A promise that resolves with whether the kernel has restarted.
   *
   * #### Notes
   * If there is a running kernel, present a dialog.
   * If there is no kernel, we start a kernel with the last run
   * kernel name and resolves with `true`.
   */
  restart(): Promise<boolean> {
    return this.initialize().then(() => {
      if (this.isDisposed) {
        return Promise.reject(void 0);
      }
      let kernel = this.kernel;
      if (!kernel) {
        if (this._prevKernelName) {
          return this.changeKernel({ name: this._prevKernelName })
            .then(() => true);
        }
        // Bail if there is no previous kernel to start.
        return Promise.reject('No kernel to restart');
      }
      return ClientSession.restartKernel(kernel);
    });
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
    if (this.isDisposed || this._path === path) {
      return Promise.resolve(void 0);
    }
    this._path = path;
    if (this._session) {
      return this._session.setPath(path);
    }
    this._propertyChanged.emit('path');
    return Promise.resolve(void 0);
  }

  /**
   * Change the session name.
   */
  setName(name: string): Promise<void> {
    if (this.isDisposed || this._name === name) {
      return Promise.resolve(void 0);
    }
    this._name = name;
    if (this._session) {
      return this._session.setName(name);
    }
    this._propertyChanged.emit('name');
    return Promise.resolve(void 0);
  }

  /**
   * Change the session type.
   */
  setType(type: string): Promise<void> {
    if (this.isDisposed || this._type === type) {
      return Promise.resolve(void 0);
    }
    this._type = type;
    if (this._session) {
      return this._session.setType(name);
    }
    this._propertyChanged.emit('type');
    return Promise.resolve(void 0);
  }

  /**
   * Initialize the session.
   *
   * #### Notes
   * If a server session exists on the current path, we will connect to it.
   * If preferences include disabling `canStart` or `shouldStart`, no
   * server session will be started.
   * If a kernel id is given, we attempt to start a session with that id.
   * If a default kernel is available, we connect to it.
   * Otherwise we ask the user to select a kernel.
   */
  initialize(): Promise<void> {
    if (this._initializing || this._isReady) {
      return this._ready.promise;
    }
    this._initializing = true;
    let manager = this.manager;
    return manager.ready.then(() => {
      let model = find(manager.running(), item => {
        return item.path === this._path;
      });
      if (!model) {
        return;
      }
      return manager.connectTo(model).then(session => {
        this._handleNewSession(session);
      }).catch(err => {
        this._handleSessionError(err);
      });
    }).then(() => {
      return this._startIfNecessary();
    }).then(() => {
      this._isReady = true;
      this._ready.resolve(void 0);
    });
  }

  /**
   * Start the session if necessary.
   */
  private _startIfNecessary(): Promise<void> {
    let preference = this.kernelPreference;
    if (this.isDisposed ||
        this.kernel || preference.shouldStart === false ||
        preference.canStart === false) {
      return Promise.resolve(void 0);
    }
    // Try to use an existing kernel.
    if (preference.id) {
      return this._changeKernel({ id: preference.id }).then(
        () => void 0,
        () => this._selectKernel(false)
      );
    }
    let name = ClientSession.getDefaultKernel({
      specs: this.manager.specs,
      sessions: this.manager.running(),
      preference
    });
    if (name) {
      return this._changeKernel({ name }).then(
        () => void 0,
        () => this._selectKernel(false)
      );
    }
    return this._selectKernel(false);
  }

  /**
   * Change the kernel.
   */
  private _changeKernel(options: Partial<Kernel.IModel>): Promise<Kernel.IKernelConnection> {
    if (this.isDisposed) {
      return Promise.reject('Disposed');
    }
    let session = this._session;
    if (session) {
      return session.changeKernel(options);
    } else {
      return this._startSession(options);
    }
  }

  /**
   * Select a kernel.
   *
   * @param cancellable: whether the dialog should have a cancel button.
   */
  private _selectKernel(cancellable: boolean): Promise<void> {
    if (this.isDisposed) {
      return Promise.resolve(void 0);
    }
    const buttons = cancellable ?
      [ Dialog.cancelButton(), Dialog.okButton({ label: 'SELECT' }) ] :
      [ Dialog.okButton({ label: 'SELECT' }) ];

    let dialog = this._dialog = new Dialog({
      title: 'Select Kernel',
      body: new Private.KernelSelector(this),
      buttons
    });

    return dialog.launch().then(result => {
      if (this.isDisposed || !result.button.accept) {
        return;
      }
      let model = result.value;
      if (model === null && this._session) {
        return this.shutdown().then(() => this._kernelChanged.emit(null));
      }
      if (model) {
        return this._changeKernel(model).then(() => void 0);
      }
    }).then(() => { this._dialog = null; });
  }

  /**
   * Start a session and set up its signals.
   */
  private _startSession(model: Partial<Kernel.IModel>): Promise<Kernel.IKernelConnection> {
    if (this.isDisposed) {
      return Promise.reject('Session is disposed.');
    }
    return this.manager.startNew({
      path: this._path,
      type: this._type,
      name: this._name,
      kernelName: model ? model.name : undefined,
      kernelId: model ? model.id : undefined
    }).then(session => {
      return this._handleNewSession(session);
    }).catch(err => {
      this._handleSessionError(err);
      return Promise.reject(err);
    });
  }

  /**
   * Handle a new session object.
   */
  private _handleNewSession(session: Session.ISession): Kernel.IKernelConnection {
    if (this.isDisposed) {
      throw Error('Disposed');
    }
    if (this._session) {
      this._session.dispose();
    }
    this._session = session;
    if (session.path !== this._path) {
      this._path = session.path;
      this._propertyChanged.emit('path');
    }
    if (session.name !== this._name) {
      this._name = session.name;
      this._propertyChanged.emit('name');
    }
    if (session.type !== this._type) {
      this._type = session.type;
      this._propertyChanged.emit('type');
    }

    session.terminated.connect(this._onTerminated, this);
    session.propertyChanged.connect(this._onPropertyChanged, this);
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
  private _handleSessionError(err: ServerConnection.ResponseError): Promise<void> {
    return err.response.text().then(text => {
      let message = err.message;
      try {
        message = JSON.parse(text)['traceback'];
      } catch (err) {
        // no-op
      }
      let dialog = this._dialog = new Dialog({
        title: 'Error Starting Kernel',
        body: <pre>{message}</pre>,
        buttons: [Dialog.okButton()]
      });
      return dialog.launch();
    }).then(() => { this._dialog = null; });
  }

  /**
   * Handle a session termination.
   */
  private _onTerminated(): void {
    let kernel = this.kernel;
    if (this._session) {
      this._session.dispose();
    }
    this._session = null;
    this._terminated.emit(void 0);
    if (kernel) {
      this._kernelChanged.emit(null);
    }
  }

  /**
   * Handle a change to a session property.
   */
  private _onPropertyChanged(sender: Session.ISession, property: 'path' | 'name' | 'type') {
    switch (property) {
    case 'path':
      this._path = sender.path;
      break;
    case 'name':
      this._name = sender.name;
      break;
    default:
      this._type = sender.type;
      break;
    }
    this._propertyChanged.emit(property);
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

    // Set that this kernel is busy, if we haven't already
    // If we have already, and now we aren't busy, dispose
    // of the busy disposable.
    if (this._setBusy) {
      if (this.status === 'busy') {
        if (!this._busyDisposable) {
          this._busyDisposable = this._setBusy();
        }
      } else {
        if (this._busyDisposable) {
          this._busyDisposable.dispose();
          this._busyDisposable = null;
        }
      }
    }

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

  private _path = '';
  private _name = '';
  private _type = '';
  private _prevKernelName = '';
  private _kernelPreference: IClientSession.IKernelPreference;
  private _isDisposed = false;
  private _session: Session.ISession | null = null;
  private _ready = new PromiseDelegate<void>();
  private _initializing = false;
  private _isReady = false;
  private _terminated = new Signal<this, void>(this);
  private _kernelChanged = new Signal<this, Kernel.IKernelConnection | null>(this);
  private _statusChanged = new Signal<this, Kernel.Status>(this);
  private _iopubMessage = new Signal<this, KernelMessage.IMessage>(this);
  private _unhandledMessage = new Signal<this, KernelMessage.IMessage>(this);
  private _propertyChanged = new Signal<this, 'path' | 'name' | 'type'>(this);
  private _dialog: Dialog<any> | null = null;
  private _setBusy: () => IDisposable | undefined;
  private _busyDisposable: IDisposable | null = null;
}


/**
 * A namespace for `ClientSession` statics.
 */
export
namespace ClientSession {
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
    path?: string;

    /**
     * The name of the session.
     */
    name?: string;

    /**
     * The type of the session.
     */
    type?: string;

    /**
     * A kernel preference.
     */
    kernelPreference?: IClientSession.IKernelPreference;

    /**
     * A function to call when the session becomes busy.
     */
    setBusy?: () => IDisposable;
  }

  /**
   * Restart a kernel if the user accepts the risk.
   *
   * Returns a promise resolving with whether the kernel was restarted.
   */
  export
  function restartKernel(kernel: Kernel.IKernelConnection): Promise<boolean> {
    let restartBtn = Dialog.warnButton({ label: 'RESTART '});
    return showDialog({
      title: 'Restart Kernel?',
      body: 'Do you want to restart the current kernel? All variables will be lost.',
      buttons: [Dialog.cancelButton(), restartBtn]
    }).then(result => {
      if (kernel.isDisposed) {
        return Promise.resolve(false);
      }
      if (result.button.accept) {
        return kernel.restart().then(() => {
          return true;
        });
      }
      return false;
    });
  }

  /**
   * An interface for populating a kernel selector.
   */
  export
  interface IKernelSearch {
    /**
     * The Kernel specs.
     */
    specs: Kernel.ISpecModels | null;

    /**
     * The kernel preference.
     */
    preference: IClientSession.IKernelPreference;

    /**
     * The current running sessions.
     */
    sessions?: IterableOrArrayLike<Session.IModel>;
  }

  /**
   * Get the default kernel name given select options.
   */
  export
  function getDefaultKernel(options: IKernelSearch): string | null {
    return Private.getDefaultKernel(options);
  }

  /**
   * Populate a kernel dropdown list.
   *
   * @param node - The node to populate.
   *
   * @param options - The options used to populate the kernels.
   *
   * #### Notes
   * Populates the list with separated sections:
   *   - Kernels matching the preferred language (display names).
   *   - "None" signifying no kernel.
   *   - The remaining kernels.
   *   - Sessions matching the preferred language (file names).
   *   - The remaining sessions.
   * If no preferred language is given or no kernels are found using
   * the preferred language, the default kernel is used in the first
   * section.  Kernels are sorted by display name.  Sessions display the
   * base name of the file with an ellipsis overflow and a tooltip with
   * the explicit session information.
   */
  export
  function populateKernelSelect(node: HTMLSelectElement, options: IKernelSearch): void {
    return Private.populateKernelSelect(node, options);
  }
}


/**
 * The namespace for module private data.
 */
namespace Private {
  /**
   * A widget that provides a kernel selection.
   */
  export
  class KernelSelector extends Widget {
    /**
     * Create a new kernel selector widget.
     */
    constructor(session: ClientSession) {
      super({ node: createSelectorNode(session) });
    }

    /**
     * Get the value of the kernel selector widget.
     */
    getValue(): Kernel.IModel {
      let selector = this.node.querySelector('select') as HTMLSelectElement;
      return JSON.parse(selector.value) as Kernel.IModel;
    }
  }

  /**
   * Create a node for a kernel selector widget.
   */
  function createSelectorNode(session: ClientSession) {
    // Create the dialog body.
    let body = document.createElement('div');
    let text = document.createElement('label');
    text.innerHTML = `Select kernel for: "${session.name}"`;
    body.appendChild(text);

    let options = getKernelSearch(session);
    let selector = document.createElement('select');
    ClientSession.populateKernelSelect(selector, options);
    body.appendChild(selector);
    return body;
  }

  /**
   * Get the default kernel name given select options.
   */
  export
  function getDefaultKernel(options: ClientSession.IKernelSearch): string | null {
    let { specs, preference } = options;
    let {
      name, language, shouldStart, canStart, autoStartDefault
    } = preference;

    if (!specs || shouldStart === false || canStart === false) {
      return null;
    }

    let defaultName = autoStartDefault ? specs.default : null;

    if (!name && !language) {
      return defaultName;
    }

    // Look for an exact match of a spec name.
    for (let specName in specs.kernelspecs) {
      if (specName === name) {
        return name;
      }
    }

    // Bail if there is no language.
    if (!language) {
      return defaultName;
    }

    // Check for a single kernel matching the language.
    let matches: string[] = [];
    for (let specName in specs.kernelspecs) {
      let kernelLanguage = specs.kernelspecs[specName].language;
      if (language === kernelLanguage) {
        matches.push(specName);
      }
    }

    if (matches.length === 1) {
      let specName = matches[0];
      console.log('No exact match found for ' + specName +
                  ', using kernel ' + specName + ' that matches ' +
                  'language=' + language);
      return specName;
    }

    // No matches found.
    return defaultName;
  }

  /**
   * Populate a kernel select node for the session.
   */
  export
  function populateKernelSelect(node: HTMLSelectElement, options: ClientSession.IKernelSearch): void {
    while (node.firstChild) {
      node.removeChild(node.firstChild);
    }
    let maxLength = 10;

    let { preference, sessions, specs } = options;
    let { name, id, language, canStart, shouldStart } = preference;

    if (!specs || canStart === false) {
      node.appendChild(optionForNone());
      node.value = 'null';
      node.disabled = true;
      return;
    }

    node.disabled = false;

    // Create mappings of display names and languages for kernel name.
    let displayNames: { [key: string]: string } = Object.create(null);
    let languages: { [key: string]: string } = Object.create(null);
    for (let name in specs.kernelspecs) {
      let spec = specs.kernelspecs[name];
      displayNames[name] = spec.display_name;
      maxLength = Math.max(maxLength, displayNames[name].length);
      languages[name] = spec.language;
    }

    // Handle a kernel by name.
    let names: string[] = [];
    if (name && name in specs.kernelspecs) {
      names.push(name);
    }

    // Then look by language.
    if (language) {
      for (let specName in specs.kernelspecs) {
        if (name !== specName && languages[specName] === language) {
          names.push(specName);
        }
      }
    }

    // Use the default kernel if no kernels were found.
    if (!names.length) {
      names.push(specs.default);
    }

    // Handle a preferred kernels in order of display name.
    let preferred = document.createElement('optgroup');
    preferred.label = 'Start Preferred Kernel';

    names.sort((a, b) => displayNames[a].localeCompare(displayNames[b]));
    for (let name of names) {
      preferred.appendChild(optionForName(name, displayNames[name]));
    }

    if (preferred.firstChild) {
      node.appendChild(preferred);
    }

    // Add an option for no kernel
    node.appendChild(optionForNone());

    let other = document.createElement('optgroup');
    other.label = 'Start Other Kernel';

    // Add the rest of the kernel names in alphabetical order.
    let otherNames: string[] = [];
    for (let specName in specs.kernelspecs) {
      if (names.indexOf(specName) !== -1) {
        continue;
      }
      otherNames.push(specName);
    }
    otherNames.sort((a, b) => displayNames[a].localeCompare(displayNames[b]));
    for (let otherName of otherNames) {
      other.appendChild(optionForName(otherName, displayNames[otherName]));
    }
    // Add a separator option if there were any other names.
    if (otherNames.length) {
      node.appendChild(other);
    }

    // Handle the default value.
    if (shouldStart === false) {
      node.value = 'null';
    } else {
      node.selectedIndex = 0;
    }

    // Bail if there are no sessions.
    if (!sessions) {
      return;
    }

    // Add the sessions using the preferred language first.
    let matchingSessions: Session.IModel[] = [];
    let otherSessions: Session.IModel[] = [];

    each(sessions, session => {
      if (language &&
          languages[session.kernel.name] === language &&
          session.kernel.id !== id) {
        matchingSessions.push(session);
      } else if (session.kernel.id !== id) {
        otherSessions.push(session);
      }
    });

    let matching = document.createElement('optgroup');
    matching.label = 'Use Kernel from Preferred Session';
    node.appendChild(matching);

    if (matchingSessions.length) {
      matchingSessions.sort((a, b) => {
        return a.path.localeCompare(b.path);
      });

      each(matchingSessions, session => {
        let name = displayNames[session.kernel.name];
        matching.appendChild(optionForSession(session, name, maxLength));
      });

    }

    let otherSessionsNode = document.createElement('optgroup');
    otherSessionsNode.label = 'Use Kernel from Other Session';
    node.appendChild(otherSessionsNode);

    if (otherSessions.length) {
      otherSessions.sort((a, b) => {
        return a.path.localeCompare(b.path);
      });

      each(otherSessions, session => {
        let name = displayNames[session.kernel.name] || session.kernel.name;
        otherSessionsNode.appendChild(optionForSession(session, name, maxLength));
      });
    }
  }

  /**
   * Get the kernel search options given a client session and sesion manager.
   */
  function getKernelSearch(session: ClientSession): ClientSession.IKernelSearch {
    return {
      specs: session.manager.specs,
      sessions: session.manager.running(),
      preference: session.kernelPreference
    };
  }

  /**
   * Create an option element for a kernel name.
   */
  function optionForName(name: string, displayName: string): HTMLOptionElement {
    let option = document.createElement('option');
    option.text = displayName;
    option.value = JSON.stringify({ name });
    return option;
  }

  /**
   * Create an option for no kernel.
   */
  function optionForNone(): HTMLOptGroupElement {
    let group = document.createElement('optgroup');
    group.label = 'Use No Kernel';
    let option = document.createElement('option');
    option.text = 'No Kernel';
    option.value = 'null';
    group.appendChild(option);
    return group;
  }

  /**
   * Create an option element for a session.
   */
  function optionForSession(session: Session.IModel, displayName: string, maxLength: number): HTMLOptionElement {
    let option = document.createElement('option');
    let sessionName = session.name || PathExt.basename(session.path);
    if (sessionName.length > maxLength) {
      sessionName = sessionName.slice(0, maxLength - 3) + '...';
    }
    option.text = sessionName;
    option.value = JSON.stringify({ id: session.kernel.id });
    option.title = `Path: ${session.path}\n` +
      `Name: ${sessionName}\n` +
      `Kernel Name: ${displayName}\n` +
      `Kernel Id: ${session.kernel.id}`;
    return option;
  }
}
