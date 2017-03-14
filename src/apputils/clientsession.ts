// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Kernel, KernelMessage, Session, utils
} from '@jupyterlab/services';

import {
  ArrayExt, IterableOrArrayLike, each, toArray
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

  /**
   * An interface for populating a kernel selector.
   */
  export
  interface IKernelSearch {
     /**
      * The Kernel specs.
      */
    specs: Kernel.ISpecModels;

    /**
     * The current running sessions.
     */
    sessions?: IterableOrArrayLike<Session.IModel>;

    /**
     * The optional existing kernel model.
     */
    existing?: Kernel.IModel;

    /**
     * The preferred kernel name.
     */
    preferredName?: string;

    /**
     * The preferred kernel language.
     */
    preferredLanguage?: string;
  }

  /**
   * Get the default kernel name given select options.
   */
  export
  function getDefaultKernel(options: IKernelSearch): string {
    return Private.getDefaultKernel(options);
  }

  /**
   * Create a kernel dropdown list.
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
  function createKernelSelect(options: IKernelSearch): HTMLSelectElement {
    return Private.createKernelSelect(options);
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
   * Get the default kernel name given select options.
   */
  export
  function getDefaultKernel(options: ClientSession.IKernelSearch): string {
    let { preferredName, preferredLanguage, specs, existing } = options;
    let existingName = existing && existing.name;
    if (!existingName && !preferredName && !preferredLanguage) {
      return specs.default;
    }
    // Look for an exact match of preferred name.
    for (let specName in specs.kernelspecs) {
      if (specName === preferredName) {
        return preferredName;
      }
    }

    // Look for an exact match of existing name.
    for (let specName in specs.kernelspecs) {
      if (specName === existingName) {
        return existing.name;
      }
    }

    // Bail if there is no language.
    if (!preferredLanguage) {
      return null;
    }

    // Check for a single kernel matching the language.
    let matches: string[] = [];
    for (let specName in specs.kernelspecs) {
      let kernelLanguage = specs.kernelspecs[specName].language;
      if (preferredLanguage === kernelLanguage) {
        matches.push(specName);
      }
    }
    if (matches.length === 1) {
      let specName = matches[0];
      console.log('No exact match found for ' + specName +
                  ', using kernel ' + specName + ' that matches ' +
                  'language=' + preferredLanguage);
      return specName;
    }

    // No matches found.
    return null;
  }

  /**
   * Get a kernel select node for the session.
   */
  export
  function createKernelSelect(options: ClientSession.IKernelSearch): HTMLSelectElement {
    let node = document.createElement('select');
    let maxLength = 10;

    let {
      preferredName, preferredLanguage, sessions, specs, existing
    } = options;
    let existingName = existing && existing.name;
    let existingId = existing && existing.id;

    if (existingName === preferredName) {
      existingName = '';
    }

    // Create mappings of display names and languages for kernel name.
    let displayNames: { [key: string]: string } = Object.create(null);
    let languages: { [key: string]: string } = Object.create(null);
    for (let name in specs.kernelspecs) {
      let spec = specs.kernelspecs[name];
      displayNames[name] = spec.display_name;
      maxLength = Math.max(maxLength, displayNames[name].length);
      languages[name] = spec.language;
    }

    // Handle a preferred kernel by name.
    let names: string[] = [];
    if (preferredName && preferredName in specs.kernelspecs) {
      names.push(name);
    }

    // Handle an existing kernel by name.
    if (existingName && existingName in specs.kernelspecs) {
      names.push(name);
    }

    // Handle a preferred kernel language in order of display name.
    let preferred = document.createElement('optgroup');
    preferred.label = 'Start Preferred Kernel';

    if (preferredLanguage && specs) {
      for (let name in specs.kernelspecs) {
        if (languages[name] === preferredLanguage) {
          names.push(name);
        }
      }
      names.sort((a, b) => displayNames[a].localeCompare(displayNames[b]));
      for (let name of names) {
        preferred.appendChild(optionForName(name, displayNames[name]));
      }
    }
    // Use the default kernel if no preferred language or none were found.
    if (!names.length) {
      let name = specs.default;
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
    for (let name in specs.kernelspecs) {
      if (names.indexOf(name) !== -1) {
        continue;
      }
      otherNames.push(name);
    }
    otherNames.sort((a, b) => displayNames[a].localeCompare(displayNames[b]));
    for (let name of otherNames) {
      other.appendChild(optionForName(name, displayNames[name]));
    }
    // Add a separator option if there were any other names.
    if (otherNames.length) {
      node.appendChild(other);
    }

    // Add the sessions using the preferred language first.
    let matchingSessions: Session.IModel[] = [];
    let otherSessions: Session.IModel[] = [];

    each(sessions, session => {
      if (preferredLanguage &&
          languages[session.kernel.name] === preferredLanguage &&
          session.kernel.id !== existingId) {
        matchingSessions.push(session);
      } else if (session.kernel.id !== existingId) {
        otherSessions.push(session);
      }
    });

    let matching = document.createElement('optgroup');
    matching.label = 'Use Kernel from Preferred Session';
    node.appendChild(matching);

    if (matchingSessions.length) {
      matchingSessions.sort((a, b) => {
        return a.notebook.path.localeCompare(b.notebook.path);
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
        return a.notebook.path.localeCompare(b.notebook.path);
      });

      each(otherSessions, session => {
        let name = displayNames[session.kernel.name] || session.kernel.name;
        otherSessionsNode.appendChild(optionForSession(session, name, maxLength));
      });
    }
    node.selectedIndex = 0;
    return node;
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
    option.value = JSON.stringify({id: null, name: null});
    group.appendChild(option);
    return group;
  }

  /**
   * Create an option element for a session.
   */
  function optionForSession(session: Session.IModel, displayName: string, maxLength: number): HTMLOptionElement {
    let option = document.createElement('option');
    let sessionName = session.notebook.path.split('/').pop();
    const CONSOLE_REGEX = /^console-(\d)+-[0-9a-f]+$/;
    if (CONSOLE_REGEX.test(sessionName)) {
      sessionName = `Console ${sessionName.match(CONSOLE_REGEX)[1]}`;
    }
    if (sessionName.length > maxLength) {
      sessionName = sessionName.slice(0, maxLength - 3) + '...';
    }
    option.text = sessionName;
    option.value = JSON.stringify({ id: session.kernel.id });
    option.title = `Path: ${session.notebook.path}\n` +
      `Kernel Name: ${displayName}\n` +
      `Kernel Id: ${session.kernel.id}`;
    return option;
  }
}
