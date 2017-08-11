// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IDisposable
} from '@phosphor/disposable';

import {
  ISignal, Signal
} from '@phosphor/signaling';

import {
  Builder, BuildManager
} from './builder';

import {
  Contents, ContentsManager
} from './contents';

import {
  Kernel
} from './kernel';

import {
  Session, SessionManager
} from './session';

import {
  Setting, SettingManager
} from './setting';

import {
  TerminalSession, TerminalManager
} from './terminal';

import {
  ServerConnection
} from './serverconnection';


/**
 * A Jupyter services manager.
 */
export
class ServiceManager implements ServiceManager.IManager {
  /**
   * Construct a new services provider.
   */
  constructor(options: ServiceManager.IOptions = {}) {
    this.serverSettings = (
      options.serverSettings || ServerConnection.makeSettings()
    );

    this.contents = new ContentsManager(options);
    this.sessions = new SessionManager(options);
    this.settings = new SettingManager(options);
    this.terminals = new TerminalManager(options);
    this.builder = new BuildManager(options);

    this.sessions.specsChanged.connect((sender, specs) => {
      this._specsChanged.emit(specs);
    });
    this._readyPromise = this.sessions.ready.then(() => {
      if (this.terminals.isAvailable()) {
        return this.terminals.ready;
      }
    });
    this._readyPromise.then(() => { this._isReady = true; });
  }

  /**
   * A signal emitted when the kernel specs change.
   */
  get specsChanged(): ISignal<this, Kernel.ISpecModels> {
    return this._specsChanged;
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

  private _isDisposed = false;
  private _readyPromise: Promise<void>;
  private _specsChanged = new Signal<this, Kernel.ISpecModels>(this);
  private _isReady = false;
}


/**
 * The namespace for `ServiceManager` statics.
 */
export
namespace ServiceManager {
  /**
   * A service manager interface.
   */
  export
  interface IManager extends IDisposable {
    /**
     * A signal emitted when the kernel specs change.
     */
    specsChanged: ISignal<IManager, Kernel.ISpecModels>;

    /**
     * The kernel spec models.
     */
    readonly specs: Kernel.ISpecModels | null;

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
     * The builder for the manager.
     */
    readonly builder: Builder.IManager;

    /**
     * The contents manager for the manager.
     */
    readonly contents: Contents.IManager;

    /**
     * The terminals manager for the manager.
     */
    readonly terminals: TerminalSession.IManager;

    /**
     * Test whether the manager is ready.
     */
    readonly isReady: boolean;

    /**
     * A promise that fulfills when the manager is initially ready.
     */
    readonly ready: Promise<void>;
  }

  /**
   * The options used to create a service manager.
   */
  export
  interface IOptions {
    /**
     * The server settings of the manager.
     */
    readonly serverSettings?: ServerConnection.ISettings;

    /**
     * The default drive for the contents manager.
     */
    readonly defaultDrive?: Contents.IDrive;
  }
}
