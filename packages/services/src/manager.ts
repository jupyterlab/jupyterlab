// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Poll } from '@jupyterlab/coreutils';

import { IDisposable } from '@phosphor/disposable';

import { ISignal, Signal } from '@phosphor/signaling';

import { Builder, BuildManager } from './builder';

import { NbConvert, NbConvertManager } from './nbconvert';

import { Contents, ContentsManager } from './contents';

import { Kernel } from './kernel';

import { Session, SessionManager } from './session';

import { Setting, SettingManager } from './setting';

import { TerminalSession, TerminalManager } from './terminal';

import { ServerConnection } from './serverconnection';

import { Workspace, WorkspaceManager } from './workspace';

/**
 * A Jupyter services manager.
 */
export class ServiceManager implements ServiceManager.IManager {
  /**
   * Construct a new services provider.
   */
  constructor(options: ServiceManager.IOptions = {}) {
    const defaultDrive = options.defaultDrive;
    const serverSettings =
      options.serverSettings || ServerConnection.makeSettings();
    const standby = options.standby || 'when-hidden';
    const normalized = { defaultDrive, serverSettings, standby };

    this.serverSettings = serverSettings;
    this.contents = new ContentsManager(normalized);
    this.sessions = new SessionManager(normalized);
    this.settings = new SettingManager(normalized);
    this.terminals = new TerminalManager(normalized);
    this.builder = new BuildManager(normalized);
    this.workspaces = new WorkspaceManager(normalized);
    this.nbconvert = new NbConvertManager(normalized);

    this.sessions.specsChanged.connect((_, specs) => {
      this._specsChanged.emit(specs);
    });

    // Relay connection failures from the service managers that poll
    // the server for running sessions.
    // TODO: should we also relay connection failures from other managers?
    this.sessions.connectionFailure.connect(this._onConnectionFailure, this);
    this.terminals.connectionFailure.connect(this._onConnectionFailure, this);

    this._readyPromise = this.sessions.ready.then(() => {
      if (this.terminals.isAvailable()) {
        return this.terminals.ready;
      }
    });
    void this._readyPromise.then(() => {
      this._isReady = true;
    });
  }

  /**
   * A signal emitted when the kernel specs change.
   */
  get specsChanged(): ISignal<this, Kernel.ISpecModels> {
    return this._specsChanged;
  }

  /**
   * A signal emitted when there is a connection failure with the kernel.
   */
  get connectionFailure(): ISignal<this, ServerConnection.NetworkError> {
    return this._connectionFailure;
  }

  /**
   * Test whether the service manager is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Dispose of the resources used by the manager.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }

    this._isDisposed = true;
    Signal.clearData(this);

    this.contents.dispose();
    this.sessions.dispose();
    this.terminals.dispose();
  }

  /**
   * The kernel spec models.
   */
  get specs(): Kernel.ISpecModels | null {
    return this.sessions.specs;
  }

  /**
   * The server settings of the manager.
   */
  readonly serverSettings: ServerConnection.ISettings;

  /**
   * Get the session manager instance.
   */
  readonly sessions: SessionManager;

  /**
   * Get the setting manager instance.
   */
  readonly settings: SettingManager;

  /**
   * The builder for the manager.
   */
  readonly builder: BuildManager;

  /**
   * Get the contents manager instance.
   */
  readonly contents: ContentsManager;

  /**
   * Get the terminal manager instance.
   */
  readonly terminals: TerminalManager;

  /**
   * Get the workspace manager instance.
   */
  readonly workspaces: WorkspaceManager;

  /**
   * Get the nbconvert manager instance.
   */
  readonly nbconvert: NbConvertManager;

  /**
   * Test whether the manager is ready.
   */
  get isReady(): boolean {
    return this._isReady;
  }

  /**
   * A promise that fulfills when the manager is ready.
   */
  get ready(): Promise<void> {
    return this._readyPromise;
  }

  private _onConnectionFailure(
    sender: any,
    err: ServerConnection.NetworkError
  ): void {
    this._connectionFailure.emit(err);
  }

  private _isDisposed = false;
  private _readyPromise: Promise<void>;
  private _specsChanged = new Signal<this, Kernel.ISpecModels>(this);
  private _connectionFailure = new Signal<this, ServerConnection.NetworkError>(
    this
  );
  private _isReady = false;
}

/**
 * The namespace for `ServiceManager` statics.
 */
export namespace ServiceManager {
  /**
   * A service manager interface.
   */
  export interface IManager extends IDisposable {
    /**
     * The builder for the manager.
     */
    readonly builder: Builder.IManager;

    /**
     * The contents manager for the manager.
     */
    readonly contents: Contents.IManager;

    /**
     * Test whether the manager is ready.
     */
    readonly isReady: boolean;

    /**
     * A promise that fulfills when the manager is initially ready.
     */
    readonly ready: Promise<void>;

    /**
     * The server settings of the manager.
     */
    readonly serverSettings: ServerConnection.ISettings;

    /**
     * The session manager for the manager.
     */
    readonly sessions: Session.IManager;

    /**
     * The setting manager for the manager.
     */
    readonly settings: Setting.IManager;

    /**
     * The kernel spec models.
     */
    readonly specs: Kernel.ISpecModels | null;

    /**
     * A signal emitted when the kernel specs change.
     */
    readonly specsChanged: ISignal<IManager, Kernel.ISpecModels>;

    /**
     * The terminals manager for the manager.
     */
    readonly terminals: TerminalSession.IManager;

    /**
     * The workspace manager for the manager.
     */
    readonly workspaces: Workspace.IManager;

    /**
     * The nbconvert manager for the manager.
     */
    readonly nbconvert: NbConvert.IManager;

    /**
     * A signal emitted when there is a connection failure with the server.
     */
    readonly connectionFailure: ISignal<
      IManager,
      ServerConnection.NetworkError
    >;
  }

  /**
   * The options used to create a service manager.
   */
  export interface IOptions {
    /**
     * The server settings of the manager.
     */
    readonly serverSettings?: ServerConnection.ISettings;

    /**
     * The default drive for the contents manager.
     */
    readonly defaultDrive?: Contents.IDrive;

    /**
     * When the manager stops polling the API. Defaults to `when-hidden`.
     */
    standby?: Poll.Standby;
  }
}
