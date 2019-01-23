// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

// TODO: the current lab is very session-focused. I think we should instead be
// focused on the kernels, and list the sessions hooked to each kernel. This
// lets you see at a glance what is hooked up to what. A kernel can be "named"
// whatever the first session path was, if there is one.

import { PathExt } from '@jupyterlab/coreutils';

import { UUID } from '@phosphor/coreutils';

import { Kernel, ServerConnection, Session } from '@jupyterlab/services';

import { IterableOrArrayLike, each, find } from '@phosphor/algorithm';

import { PromiseDelegate } from '@phosphor/coreutils';

import { IDisposable } from '@phosphor/disposable';

import { ISignal, Signal } from '@phosphor/signaling';

import { Widget } from '@phosphor/widgets';

import * as React from 'react';

import { showDialog, Dialog } from './dialog';

/**
 * The interface of client session object.
 *
 * The client session represents the link between a path and its kernel for the
 * duration of the lifetime of the session object.  The session can have no
 * current kernel, and can start a new kernel at any time.
 *
 * TODO: what is the difference between this and the services Session? It seems
 * there is a lot of duplicated code here.
 *
 * A client session maintains a separate path/name/type state, and can connect
 * to or start new service Sessions. Many things are proxied through the service
 * session. It looks like one of the main usecases for a ClientSession is to be able to have a single object with logic to start a new session if needed.
 *
 * This is messy if, for example, the session terminates, I think you can restart a session.
 *
 * Perhaps the big question here is: does ClientSession provide a "better" session object when working in JLab? Or does it provide capabilities on top of the services session object (and so the services session object should be exposed to the user)? Put another way, are there services.session capabilities we do *not* want the user to use directly, instead preferring our way of doing things? Or is there just an unnecessary duplication of code between the two concepts, and clearly separating what the services object provides, and what the jlab layer on top provides, is less confusing to everyone? I think I'm in the expose-the-services-session camp - less concepts to deal with, especially when switching in and out of jlab.
 */
export interface IClientSession extends IDisposable {
  /**
   * A signal emitted when the kernel changes.
   */
  readonly sessionChanged: ISignal<this, IClientSession.ISessionChangedArgs>;

  /**
   * The current session
   */
  readonly session: Session.ISession | null;

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
  changeKernel(
    options: Partial<Kernel.IModel>
  ): Promise<Kernel.IKernelConnection>;

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
}

/**
 * The namespace for Client Session related interfaces.
 */
export namespace IClientSession {
  /**
   * A kernel preference.
   */
  export interface IKernelPreference {
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

  /**
   * An arguments object for the session changed signal.
   */
  export interface ISessionChangedArgs {
    /**
     * The old session.
     */
    oldValue: Session.ISession;
    /**
     * The new session.
     */
    newValue: Session.ISession | null;
  }
}

/**
 * The default implementation of client session object.
 */
export class ClientSession implements IClientSession {
  /**
   * Construct a new client session.
   */
  constructor(options: ClientSession.IOptions) {
    this.manager = options.manager;
    // These values are only for defaults, as in the user can't change them directly?
    this._path = options.path || UUID.uuid4();
    this._type = options.type || '';
    this._name = options.name || '';
    this._setBusy = options.setBusy;
    this._kernelPreference = options.kernelPreference || {};
  }

  /**
   * A signal emitted when the kernel changes.
   */
  get sessionChanged(): ISignal<this, IClientSession.ISessionChangedArgs> {
    return this._sessionChanged;
  }

  // Terminated signal - listen to this.session.terminated

  // kernelChanged signal: listen to this.session.kernelChanged

  // propertyChanged: listen to this.session.propertyChanged

  // kernel: Get it from this._session ? this._session.kernel : null;

  // path, type, name: get from this.session - TODO: do we *need* to get these from this object when it doesn't have a session?

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
   *
   * TODO: find what uses this manager - pull out?
   */
  readonly manager: Session.IManager;

  /**
   * The display name of the current kernel.
   *
   * TODO: Could be a static function somewhere, or a function on the manager.
   */
  get kernelDisplayName(): string {
    const kernel = this.session && this.session.kernel;
    if (!kernel) {
      return 'No Kernel!';
    }
    const specs = this.manager.specs;
    if (!specs) {
      return 'Unknown!';
    }
    const spec = specs.kernelspecs[kernel.name];
    return spec ? spec.display_name : kernel.name;
  }

  /**
   * Test whether the session is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Dispose of the resources held by the session.
   */
  dispose(): void {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    if (this._session) {
      // TODO: This preserves the behavior of *not* disposing the old session.
      // Was that to prevent killing a kernel when an owning widget was closed? Should we be disposing the current session?
      const oldValue = this._session;
      this._session = null;

      // Emit the session changed signal so listeners can disconnect their
      // callbacks. Our callbacks will be disconnected when we clear our signal
      // data below.
      this._sessionChanged.emit({ oldValue, newValue: this._session });
    }

    if (this._dialog) {
      this._dialog.dispose();
      this._dialog = null;
    }
    Signal.clearData(this);
  }

  /**
   * Change the current kernel associated with the document.
   *
   * @params options - The name or id of the new kernel.
   *
   * #### Notes
   * This shuts down the existing kernel and creates a new kernel,
   * keeping the existing session ID and session path.
   *
   * TODO: FROM SESSION?
   */
  async changeKernel(
    options: Partial<Kernel.IModel>
  ): Promise<Kernel.IKernelConnection> {
    await this.initialize();
    return this._changeKernel(options);
  }

  /**
   * Select a kernel for the session.
   */
  async selectKernel(): Promise<void> {
    // TODO: in this and many other functions, we first await the initialize.
    // Should we just say that you have to initialize the session before using
    // it, and take out these steps?
    await this.initialize();
    return this._selectKernel(true);
  }

  /**
   * Restart the kernel.
   *
   * @returns A promise that resolves with whether the kernel has restarted.
   *
   * #### Notes
   * If there is a running kernel, present a confirmation dialog, then restart.
   * If there is no kernel, we start a kernel with the last run
   * kernel name and resolves with `true`.
   *
   * TODO: should we rename this function to indicate we are doing more than this.session.kernel.restart?
   */
  async restart(): Promise<boolean> {
    await this.initialize();
    if (this.isDisposed) {
      throw new Error('session already disposed');
    }
    const kernel = this.session && this.session.kernel;
    if (kernel) {
      return ClientSession.restartKernel(kernel);
    }
    if (!this._prevKernelName) {
      // Bail if there is no previous kernel to start.
      throw new Error('No kernel to restart');
    }
    await this.changeKernel({ name: this._prevKernelName });
    return true;
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
  async initialize(): Promise<void> {
    if (this._initializing || this._isReady) {
      return this._ready.promise;
    }
    this._initializing = true;
    let manager = this.manager;
    await manager.ready;
    let model = find(manager.running(), item => {
      return item.path === this._path;
    });
    if (model) {
      try {
        let session = manager.connectTo(model);
        this._handleNewSession(session);
      } catch (err) {
        this._handleSessionError(err);
      }
    }
    await this._startIfNecessary();
    this._isReady = true;
    this._ready.resolve(undefined);
  }

  /**
   * Start the session kernel if necessary.
   */
  private async _startIfNecessary(): Promise<void> {
    let preference = this.kernelPreference;
    if (
      this.isDisposed ||
      (this.session && this.session.kernel) ||
      preference.shouldStart === false ||
      preference.canStart === false
    ) {
      return;
    }

    try {
      if (preference.id) {
        await this._changeKernel({ id: preference.id });
        return;
      }
      let name = ClientSession.getDefaultKernel({
        specs: this.manager.specs,
        sessions: this.manager.running(),
        preference
      });
      if (name) {
        await this._changeKernel({ name });
        return;
      }
    } catch (e) {
      // no-op
    }

    // Fall through to selecting the kernel and starting it.
    await this._selectKernel(false);
    return;
  }

  /**
   * Change the kernel.
   *
   * TODO: this has logic to either restart a kernel, or start a new session...
   */
  private async _changeKernel(
    options: Partial<Kernel.IModel>
  ): Promise<Kernel.IKernelConnection> {
    if (this.isDisposed) {
      throw new Error('Session is disposed');
    }
    let session = this._session;
    // TODO: a dead kernel disposes the kernel, which may dispose the session?
    if (session && session.kernel.status !== 'dead') {
      return session.changeKernel(options);
    } else {
      // If the session kernel is dead, we need a new session.
      await session.dispose();
      return this._startSession(options);
    }
  }

  /**
   * Select a kernel.
   *
   * @param cancelable: whether the dialog should have a cancel button.
   */
  private async _selectKernel(cancelable: boolean): Promise<void> {
    if (this.isDisposed) {
      throw new Error('Session is disposed');
    }
    const buttons = cancelable
      ? [Dialog.cancelButton(), Dialog.okButton({ label: 'SELECT' })]
      : [Dialog.okButton({ label: 'SELECT' })];

    let dialog = (this._dialog = new Dialog({
      title: 'Select Kernel',
      body: new Private.KernelSelector(this),
      buttons
    }));

    let result: Dialog.IResult<Kernel.IModel>;
    try {
      result = await dialog.launch();
    } finally {
      this._dialog.dispose();
      this._dialog = null;
    }
    if (this.isDisposed) {
      throw new Error('Session is disposed');
    }
    if (!result.button.accept) {
      return;
    }
    let model = result.value;
    if (model === null && this.session) {
      // User explicitly chose no session, so shutdown an existing session.
      await this.session.shutdown();
      return;
    }
    if (model) {
      await this._changeKernel(model);
      return;
    }
  }

  /**
   * Start a session and set up its signals.
   */
  private async _startSession(
    model: Partial<Kernel.IModel>
  ): Promise<Kernel.IKernelConnection> {
    if (this.isDisposed) {
      throw new Error('Session is disposed.');
    }
    try {
      const session = await this.manager.startNew({
        path: this._path,
        type: this._type,
        name: this._name,
        kernelName: model ? model.name : undefined,
        kernelId: model ? model.id : undefined
      });
      if (this.session) {
        this.session.dispose();
      }
      this._handleNewSession(session);
      return session.kernel;
    } catch (err) {
      this._handleSessionError(err);
      throw err;
    }
  }

  /**
   * Handle a new session object.
   */
  private _handleNewSession(session: Session.ISession | null): void {
    if (this.isDisposed) {
      throw new Error('Session is disposed');
    }
    // TODO: we took out here disposal of the old session. It seemed the only place we were really using it was in _startSession, so I just did an explicit disposal there.
    const oldValue = this._session;
    this._session = session;
    this._sessionChanged.emit({ oldValue, newValue: session });

    if (session) {
      session.terminated.connect(
        this._onTerminated,
        this
      );
    }

    // TODO: there are probably going to be a lot of things that need to do
    // the bookkeeping below. Should we have a convenience function? This is the bookkeeping that
    // was avoided before with our own kernel status signal, which we managed to
    // point to the current kernel status, whatever it was.

    // Transfer the kernel listeners to the new kernel.
    // How much do we need to in disconnecting if we are disposing the old session above?
    if (oldValue) {
      oldValue.kernelChanged.disconnect(this._onKernelChanged, this);
    }
    if (session) {
      session.kernelChanged.connect(
        this._onKernelChanged,
        this
      );
      if (session.kernel) {
        this._onKernelChanged(session, {
          oldValue: (oldValue && oldValue.kernel) || null,
          newValue: session.kernel
        });
      }
    }

    this._prevKernelName =
      session && session.kernel ? session.kernel.name : null;
  }

  /**
   * Handle an error in session startup.
   */
  private async _handleSessionError(
    err: ServerConnection.ResponseError
  ): Promise<void> {
    const text = await err.response.text();
    let message = err.message;
    try {
      message = JSON.parse(text)['traceback'];
    } catch (err) {
      // no-op
    }
    let dialog = (this._dialog = new Dialog({
      title: 'Error Starting Kernel',
      body: <pre>{message}</pre>,
      buttons: [Dialog.okButton()]
    }));
    try {
      await dialog.launch();
    } finally {
      this._dialog.dispose();
      this._dialog = null;
    }
  }

  /**
   * Handle a session termination.
   */
  private _onTerminated(): void {
    // Session is already disposed
    this._handleNewSession(null);
  }

  private _onKernelChanged(
    sender: Session.ISession,
    { oldValue, newValue }: Session.IKernelChangedArgs
  ) {
    if (oldValue) {
      oldValue.statusChanged.disconnect(this._onStatusChanged, this);
    }
    if (newValue) {
      newValue.statusChanged.connect(
        this._onStatusChanged,
        this
      );
    }
  }

  /**
   * Handle a change to the session kernel status.
   */
  private _onStatusChanged(
    sender: Kernel.IKernelConnection,
    status: Kernel.Status
  ): void {
    // Set that this kernel is busy, if we haven't already
    // If we have already, and now we aren't busy, dispose
    // of the busy disposable.
    if (this._setBusy) {
      if (status === 'busy') {
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
  }

  /**
   * Get the current session.
   */
  get session(): Session.ISession | null {
    return this._session;
  }
  private _session: Session.ISession | null = null;

  private _path = '';
  private _name = '';
  private _type = '';
  private _prevKernelName = '';
  private _kernelPreference: IClientSession.IKernelPreference;
  private _isDisposed = false;
  private _ready = new PromiseDelegate<void>();
  private _initializing = false;
  private _isReady = false;
  private _sessionChanged = new Signal<
    this,
    IClientSession.ISessionChangedArgs
  >(this);
  private _dialog: Dialog<any> | null = null;
  private _setBusy: () => IDisposable | undefined;
  private _busyDisposable: IDisposable | null = null;
}

/**
 * A namespace for `ClientSession` statics.
 */
export namespace ClientSession {
  /**
   * The options used to initialize a context.
   */
  export interface IOptions {
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
  export async function restartKernel(
    kernel: Kernel.IKernelConnection
  ): Promise<boolean> {
    let restartBtn = Dialog.warnButton({ label: 'RESTART ' });
    const result = await showDialog({
      title: 'Restart Kernel?',
      body:
        'Do you want to restart the current kernel? All variables will be lost.',
      buttons: [Dialog.cancelButton(), restartBtn]
    });
    if (kernel.isDisposed) {
      return false;
    }
    if (result.button.accept) {
      await kernel.restart();
      return true;
    }
    return false;
  }

  /**
   * An interface for populating a kernel selector.
   */
  export interface IKernelSearch {
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
  export function getDefaultKernel(options: IKernelSearch): string | null {
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
  export function populateKernelSelect(
    node: HTMLSelectElement,
    options: IKernelSearch
  ): void {
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
  export class KernelSelector extends Widget {
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
    text.innerHTML = `Select kernel for: "${session.session.name}"`;
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
  export function getDefaultKernel(
    options: ClientSession.IKernelSearch
  ): string | null {
    let { specs, preference } = options;
    let {
      name,
      language,
      shouldStart,
      canStart,
      autoStartDefault
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
      console.log(
        'No exact match found for ' +
          specName +
          ', using kernel ' +
          specName +
          ' that matches ' +
          'language=' +
          language
      );
      return specName;
    }

    // No matches found.
    return defaultName;
  }

  /**
   * Populate a kernel select node for the session.
   */
  export function populateKernelSelect(
    node: HTMLSelectElement,
    options: ClientSession.IKernelSearch
  ): void {
    while (node.firstChild) {
      node.removeChild(node.firstChild);
    }

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
      if (
        language &&
        languages[session.kernel.name] === language &&
        session.kernel.id !== id
      ) {
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
        matching.appendChild(optionForSession(session, name));
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
        otherSessionsNode.appendChild(optionForSession(session, name));
      });
    }
  }

  /**
   * Get the kernel search options given a client session and sesion manager.
   */
  function getKernelSearch(
    session: ClientSession
  ): ClientSession.IKernelSearch {
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
  function optionForSession(
    session: Session.IModel,
    displayName: string
  ): HTMLOptionElement {
    let option = document.createElement('option');
    let sessionName = session.name || PathExt.basename(session.path);
    option.text = sessionName;
    option.value = JSON.stringify({ id: session.kernel.id });
    option.title =
      `Path: ${session.path}\n` +
      `Name: ${sessionName}\n` +
      `Kernel Name: ${displayName}\n` +
      `Kernel Id: ${session.kernel.id}`;
    return option;
  }
}
