// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ContentsManager, Kernel, Session
} from '@jupyterlab/services';

import {
  IterableOrArrayLike
} from '@phosphor/algorithm';

import {
  IDisposable
} from '@phosphor/disposable';

import {
  ISignal, Signal
} from '@phosphor/signaling';

import {
  showDialog, okButton, cancelButton, warnButton
} from './dialog';


/**
 * A context for kernel actions.
 *
 * Manages session(s) associated with a path.
 */
export
interface IKernelContext extends IDisposable {
  /**
   * A signal emitted when the kernel changes.
   */
  kernelChanged: ISignal<this, Kernel.IKernel>;

  /**
   * The current kernel associated with the context.
   */
  readonly kernel: Kernel.IKernel;

  /**
   * The context path.
   */
  readonly path: string;

  /**
   * The context name.
   */
  readonly name: string;

  /**
   * The context type.
   */
  readonly type: string;

  /**
   * Start the default kernel for the context.
   *
   * #### Notes
   * Will use [[selectKernel]] if the default is not available.
   */
  startDefaultKernel(): Promise<Kernel.IKernel>

  /**
   * Change the current kernel associated with the document.
   *
   * #### Notes
   * If no options are given, the kernel is shut down.
   */
  changeKernel(options?: Kernel.IModel): Promise<Kernel.IKernel>;

  /**
   * Select the kernel using a dialog.
   */
  selectKernel(message?: string): Promise<Kernel.IKernel>;

  /**
   * Restart the kernel after presenting a dialog.
   */
  restartKernel(message?: string): Promise<boolean>;
}


/**
 * A concrete implemetation of a kernel handler.
 */
export
class KernelContext implements IKernelContext {
  /**
   * Create a new kernel handler.
   */
  constructor(options: KernelContext.IOptions) {
    this._manager = options.manager;
    this._path = options.path;
    this._type = options.type;
    this._name = options.name || '';
    this._preferredName = options.preferredKernelName || '';
    this._preferredLanguage = options.preferredKernelLanguage || '';
  }

  /**
   * A signal emitted when the kernel changes.
   */
  get kernelChanged(): ISignal<this, Kernel.IKernel> {
    return this._changed;
  }

  /**
   * The current kernel.
   */
  get kernel(): Kernel.IKernel {
    return this._session && this._session.kernel;
  }

  /**
   * The path of the session.
   */
  get path(): string {
    return this._path;
  }

  /**
   * The name of the session.
   */
  get name(): string {
    return this._name || ContentsManager.basename(this._path);
  }

  /**
   * The type of the session.
   */
  get type(): string {
    return this._type;
  }

  /**
   * The preferred kernel name.
   */
  get preferredKernelName(): string {
    return this._preferredName;
  }
  set preferredKernelName(value: string) {
    this._preferredName = value;
  }

  /**
   * The preferred kernel language.
   */
  get preferredKernelLanguage(): string {
    return this._preferredLanguage;
  }
  set preferredKernelLanguage(value: string) {
    this._preferredLanguage = value;
  }

  /**
   * Test whether the context is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed === null;
  }

  /**
   * Dispose of the resources held by the context.
   */
  dispose(): void {
    this._isDisposed = true;
    Signal.clearData(this);
  }

  /**
   * Change the current kernel associated with the handler.
   *
   * #### Notes
   * If no options are given, the kernel is shut down.
   */
  changeKernel(options?: Kernel.IModel): Promise<Kernel.IKernel> {
    if (!options) {
      return this._ensureNoSession();
    }
    // Make sure we are actually switching kernels.
    let kernel = this.kernel;
    if (kernel && options.id === kernel.id) {
      return Promise.resolve(kernel);
    }
    return this._ensureSession(options).catch(err => {
      let response = JSON.parse(err.xhr.response);
      let body = document.createElement('pre');
      body.textContent = response['traceback'];
      showDialog({
        title: 'Error Starting Kernel',
        body,
        buttons: [okButton]
      });
      return Promise.reject(err);
    });
  }

  /**
   * Start the default kernel for the context.
   *
   * #### Notes
   * Will use [[selectKernel]] if the default is not available.
   */
  startDefaultKernel(): Promise<Kernel.IKernel> {
    let name = KernelContext.getDefaultKernel({
      preferredName: this._preferredName,
      preferredLanguage: this._preferredLanguage,
      specs: this._manager.specs
    });
    if (!name) {
      name = this._preferredName || this._preferredLanguage;
      let msg = `Could not find a kernel matching ${name}.`;
      msg += '\nPlease select a kernel:';
      return this.selectKernel(msg);
    }
  }

  /**
   * Select the kernel using a dialog.
   */
  selectKernel(message?: string): Promise<Kernel.IKernel> {
    return KernelContext.selectKernel({
      specs: this._manager.specs,
      sessions: this._manager.running,
      kernel: this.kernel && this.kernel.model,
      preferredName: this._preferredName,
      preferredLanguage: this._preferredLanguage,
      message
    }).then(selection => {
      return this.changeKernel(selection);
    });
  }

  /**
   * Restart the kernel after presenting a dialog.
   */
  restartKernel(message?: string): Promise<boolean> {
    if (!this.kernel) {
      return Promise.resolve(false);
    }
    return KernelContext.restartKernel(this.kernel, message);
  }

  /**
   * Rename the path.
   */
  rename(path: string): Promise<void> {
    this._path = path;
    if (!this._session) {
      return Promise.resolve(void 0);
    }
    return this._session.rename(path);
  }

  /**
   * Ensure there is a session with the given options.
   */
  private _ensureSession(options: Kernel.IModel): Promise<Kernel.IKernel> {
    if (this._session) {
      return this._session.changeKernel(options);
    }
    return this._startSession({
      path: this._path,
      kernelName: options.name,
      kernelId: options.id
    });
  }

  /**
   * Start a session with the given options.
   */
  private _startSession(options: Session.IOptions): Promise<Kernel.IKernel> {
    return this._manager.startNew(options).then(session => {
      if (this.isDisposed) {
        return;
      }
      if (this._session) {
        this._session.dispose();
      }
      this._session = session;
      this._changed.emit(session.kernel);
      session.kernelChanged.connect(this._onKernelChanged, this);
      return session.kernel;
    });
  }

  /**
   * Ensure there is not session.
   */
  private _ensureNoSession(): Promise<Kernel.IKernel> {
    if (!this._session) {
      return Promise.resolve(null);
    }
    let session = this._session;
    this._session = null;
    this._changed.emit(null);
    return session.shutdown().then(() => {
      session.dispose();
      return Promise.resolve<Kernel.IKernel>(null);
    });
  }

  /**
   * Handle a change of kernel on the session.
   */
  private _onKernelChanged(): void {
    this._changed.emit(this.kernel);
  }

  private _manager: Session.IManager;
  private _path = '';
  private _name = '';
  private _type = '';
  private _preferredLanguage = '';
  private _preferredName = '';
  private _session: Session.ISession;
  private _changed = new Signal<this, Kernel.IKernel>(this);
  private _isDisposed = false;
}


/**
 * The namespace for kernel handler statics.
 */
export
namespace KernelContext {
  /**
   * The options used to create a kernel handler.
   */
  export 
  interface IOptions {
    /**
     * A session manager instance.
     */
    manager: Session.IManager;

    /**
     * The context path.
     */
    path: string;

    /**
     * The context type.
     */
    type: string;

    /**
     * The context name.
     */
    name?: string;

    /**
     * The preferred kernel name.
     */
    preferredKernelName?: string;

    /**
     * The preferred kernel language.
     */
    preferredKernelLanguage?: string;
  }

  /**
   * An interface for a kernel search.
   */
  export
  interface IKernelSearch {
    /**
     * The preferred name of the kernel.
     */
    preferredName?: string;

    /**
     * The preferred language of the kernel.
     */
    preferredLanguage?: string;

    /**
     * The kernel specs models.
     */
    specs: Kernel.ISpecModels;
  }

  /**
   * The interface for a kernel switch.
   */
  export
  interface IKernelSelection extends IKernelSearch {
    /**
     * The current running sessions.
     */
    sessions: IterableOrArrayLike<Session.IModel>;

    /**
     * The optional to display.
     */
    message?: string;

    /**
     * The optional existing kernel model.
     */
    kernel?: Kernel.IModel;
  }

  /**
   * Get the name of the default kernel for the context.
   *
   * #### Notes
   * Will return `none` if no suitable kernel is available.
   * If neither a name nor a language is given, the default kernel
   * name is returned.
   * If the name is given and there is an exact match, the 
   * name is returned.
   * Otherwise if the language is given and only one kernel 
   * matches the language, that kernel name will be returned.
   * If `null` is returned, it is expected that the user should
   * be prompted 
   */
  export
  function getDefaultKernel(options: IKernelSearch): string | null {
    return Private.getDefaultKernel(options);
  }

  /**
   * Bring up a dialog to select a kernel.
   */
  export
  function selectKernel(options: IKernelSelection): Promise<Kernel.IModel> {
    return Private.selectKernel(options);
  }

  /**
   * Restart a kernel after presenting a dialog.
   *
   * @param kernel - The kernel to restart.
   *
   * @param host - The optional host widget that should be activated.
   *
   * @returns A promise that resolves to `true` if a restart occurred.
   *
   * #### Notes
   * This is a no-op if there is no kernel.
   */
  export
  function restartKernel(kernel: Kernel.IKernel, message?: string): Promise<boolean> {
    return Private.restartKernel(kernel, message);
  }
}


/**
 * The namespace for Private module data.
 */
namespace Private {
  /**
   * Get the default kernel given search options.
   */
  export
  function getDefaultKernel(options: KernelContext.IKernelSearch): string | null {
    let { preferredName, preferredLanguage, specs } = options;
    if (!preferredName && !preferredLanguage) {
      return specs.default;
    }
    // Look for an exact match.
    for (let specName in specs.kernelspecs) {
      if (specName === preferredName) {
        return preferredName;
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
        matches.push[specName];
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
    return null;
  }

  /**
   * Bring up a dialog to select a kernel.
   */
  export
  function selectKernel(options: IKernelSelection): Promise<Kernel.IModel> {
    // Create the dialog body.
    let body = document.createElement('div');
    let text = document.createElement('label');
    text.textContent = options.message ||  'Select kernel';
    body.appendChild(text);

    let selector = document.createElement('select');
    body.appendChild(selector);

    // Get the current sessions, populate the kernels, and show the dialog.
    populateKernels(selector, options);
    return showDialog({
      title: 'Select Kernel',
      body,
      okText: 'SELECT'
    }).then(result => {
      // Change the kernel if a kernel was selected.
      if (result.text === 'SELECT') {
        return JSON.parse(selector.value) as Kernel.IModel;
      }
      return void 0;
    });
  }

  /**
   * Restart a kernel after presenting a dialog.
   */
  export
  function restartKernel(kernel: Kernel.IKernel, message?: string): Promise<boolean> {
    if (!kernel) {
      return Promise.resolve(false);
    }
    let body = (
      message || 
      'Do you want to restart the current kernel? All variables will be lost.'
    );
    return showDialog({
      title: 'Restart Kernel?',
      body,
      buttons: [cancelButton, warnButton]
    }).then(result => {
      if (!kernel.isDisposed && result.text === 'OK') {
        return kernel.restart().then(() => { return true; });
      } else {
        return false;
      }
    });
  }

  /**
   * Populate a kernel dropdown list.
   *
   * @param node - The host node.
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
  function populateKernels(node: HTMLSelectElement, options: KernelContext.IKernelSelection): void {
    // Clear any existing options.
    while (node.firstChild) {
      node.removeChild(node.firstChild);
    }
    let maxLength = 10;

    let { preferredName, preferredLanguage, sessions, specs, kernel } = options;
    let existing = kernel ? kernel.id : void 0;

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
    if (preferredName && preferredName in specs.kernelspecs) {
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
          session.kernel.id !== existing) {
        matchingSessions.push(session);
      } else if (session.kernel.id !== existing) {
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
