// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IDisposable
} from '@phosphor/disposable';

import {
  ISignal, Signal
} from '@phosphor/signaling';

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
    this._sessionManager = new SessionManager(options);
    this._contentsManager = new ContentsManager(options);
    this._terminalManager = new TerminalManager(options);
    this._sessionManager.specsChanged.connect((sender, specs) => {
      this._specsChanged.emit(specs);
    });
    this._readyPromise = this._sessionManager.ready.then(() => {
      if (this._terminalManager.isAvailable()) {
        return this._terminalManager.ready;
      }
    });
  }

  /**
   * A signal emitted when the kernel specs change.
   */
  get specsChanged(): ISignal<this, Kernel.ISpecModels> {
    return this._specsChanged;
  }

  /**
   * Test whether the terminal manager is disposed.
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
    this._sessionManager.dispose();
    this._contentsManager.dispose();
    this._sessionManager.dispose();
  }

  /**
   * The kernel spec models.
   */
  get specs(): Kernel.ISpecModels | null {
    return this._sessionManager.specs;
  }

  /**
   * The server settings of the manager.
   */
  readonly serverSettings: ServerConnection.ISettings;

  /**
   * Get the session manager instance.
   */
  get sessions(): SessionManager {
    return this._sessionManager;
  }

  /**
   * Get the contents manager instance.
   */
  get contents(): ContentsManager {
    return this._contentsManager;
  }

  /**
   * Get the terminal manager instance.
   */
  get terminals(): TerminalManager {
    return this._terminalManager;
  }

  /**
   * Test whether the manager is ready.
   */
  get isReady(): boolean {
    return this._sessionManager.isReady || this._terminalManager.isReady;
  }

  /**
   * A promise that fulfills when the manager is ready.
   */
  get ready(): Promise<void> {
    return this._readyPromise;
  }

  private _sessionManager: SessionManager = null;
  private _contentsManager: ContentsManager = null;
  private _terminalManager: TerminalManager = null;
  private _isDisposed = false;
  private _readyPromise: Promise<void>;
  private _specsChanged = new Signal<this, Kernel.ISpecModels>(this);
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
