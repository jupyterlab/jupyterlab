// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ArrayExt, IIterator, iter
} from '@phosphor/algorithm';

import {
  JSONExt
} from '@phosphor/coreutils';

import {
  ISignal, Signal
} from '@phosphor/signaling';

import {
  Kernel
} from '../kernel';

import * as utils
  from '../utils';

import {
  IAjaxSettings
} from '../utils';

import {
  Session
} from './session';


/**
 * An implementation of a session manager.
 */
export
class SessionManager implements Session.IManager {
  /**
   * Construct a new session manager.
   *
   * @param options - The default options for each session.
   */
  constructor(options: Session.IOptions = {}) {
    this._baseUrl = options.baseUrl || utils.getBaseUrl();
    this._wsUrl = options.wsUrl || utils.getWsUrl(this._baseUrl);
    this._ajaxSettings = JSON.stringify(options.ajaxSettings || {});

    // Initialize internal data.
    this._readyPromise = this._refreshSpecs().then(() => {
      return this._refreshRunning();
    });

    // Set up polling.
    this._runningTimer = (setInterval as any)(() => {
      this._refreshRunning();
    }, 10000);
    this._specsTimer = (setInterval as any)(() => {
      this._refreshSpecs();
    }, 61000);
  }

  /**
   * A signal emitted when the kernel specs change.
   */
  get specsChanged(): ISignal<this, Kernel.ISpecModels> {
    return this._specsChanged;
  }

  /**
   * A signal emitted when the running sessions change.
   */
  get runningChanged(): ISignal<this, Session.IModel[]> {
    return this._runningChanged;
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
    clearInterval(this._runningTimer);
    clearInterval(this._specsTimer);
    Signal.clearData(this);
    this._running = [];
  }

  /**
   * The base url of the manager.
   */
  get baseUrl(): string {
    return this._baseUrl;
  }

  /**
   * The base ws url of the manager.
   */
  get wsUrl(): string {
    return this._wsUrl;
  }

  /**
   * The default ajax settings for the manager.
   */
  get ajaxSettings(): IAjaxSettings {
    return JSON.parse(this._ajaxSettings);
  }

  /**
   * Set the default ajax settings for the manager.
   */
  set ajaxSettings(value: IAjaxSettings) {
    this._ajaxSettings = JSON.stringify(value);
  }

  /**
   * Get the most recently fetched kernel specs.
   */
  get specs(): Kernel.ISpecModels | null {
    return this._specs;
  }

  /**
   * Test whether the manager is ready.
   */
  get isReady(): boolean {
    return this._specs !== null;
  }

  /**
   * A promise that fulfills when the manager is ready.
   */
  get ready(): Promise<void> {
    return this._readyPromise;
  }

  /**
   * Create an iterator over the most recent running sessions.
   *
   * @returns A new iterator over the running sessions.
   */
  running(): IIterator<Session.IModel> {
    return iter(this._running);
  }

  /**
   * Force a refresh of the specs from the server.
   *
   * @returns A promise that resolves when the specs are fetched.
   *
   * #### Notes
   * This is intended to be called only in response to a user action,
   * since the manager maintains its internal state.
   */
  refreshSpecs(): Promise<void> {
    return this._refreshSpecs();
  }

  /**
   * Force a refresh of the running sessions.
   *
   * @returns A promise that with the list of running sessions.
   *
   * #### Notes
   * This is not typically meant to be called by the user, since the
   * manager maintains its own internal state.
   */
  refreshRunning(): Promise<void> {
    return this._refreshRunning();
  }

  /**
   * Start a new session.  See also [[startNewSession]].
   *
   * @param options - Overrides for the default options, must include a
   *   `'path'`.
   */
  startNew(options: Session.IOptions): Promise<Session.ISession> {
    return Session.startNew(this._getOptions(options)).then(session => {
      this._onStarted(session);
      return session;
    });
  }

  /**
   * Find a session by id.
   */
  findById(id: string, options?: Session.IOptions): Promise<Session.IModel> {
    return Session.findById(id, this._getOptions(options));
  }

  /**
   * Find a session by path.
   */
  findByPath(path: string, options?: Session.IOptions): Promise<Session.IModel> {
    return Session.findByPath(path, this._getOptions(options));
  }

  /*
   * Connect to a running session.  See also [[connectToSession]].
   */
  connectTo(id: string, options?: Session.IOptions): Promise<Session.ISession> {
    return Session.connectTo(id, this._getOptions(options)).then(session => {
      this._onStarted(session);
      return session;
    });
  }

  /**
   * Shut down a session by id.
   */
  shutdown(id: string, options?: Session.IOptions): Promise<void> {
    return Session.shutdown(id, this._getOptions(options)).then(() => {
      this._onTerminated(id);
    });
  }

  /**
   * Get optionally overidden options.
   */
  private _getOptions(options: Session.IOptions = {}): Session.IOptions {
    options.baseUrl = this._baseUrl;
    options.wsUrl = this._wsUrl;
    options.ajaxSettings = options.ajaxSettings || this.ajaxSettings;
    return options;
  }

  /**
   * Handle a session terminating.
   */
  private _onTerminated(id: string): void {
    let index = ArrayExt.findFirstIndex(this._running, value => value.id === id);
    if (index !== -1) {
      this._running.splice(index, 1);
      this._runningChanged.emit(this._running.slice());
    }
  }

  /**
   * Handle a session starting.
   */
  private _onStarted(session: Session.ISession): void {
    let id = session.id;
    let index = ArrayExt.findFirstIndex(this._running, value => value.id === id);
    if (index === -1) {
      this._running.push(session.model);
      this._runningChanged.emit(this._running.slice());
    }
    session.terminated.connect(() => {
      this._onTerminated(id);
    });
    session.pathChanged.connect(() => {
      this._onChanged(session.model);
    });
    session.kernelChanged.connect(() => {
      this._onChanged(session.model);
    });
  }

  /**
   * Handle a change to a session.
   */
  private _onChanged(model: Session.IModel): void {
    let index = ArrayExt.findFirstIndex(this._running, value => value.id === model.id);
    if (index !== -1) {
      this._running[index] = model;
      this._runningChanged.emit(this._running.slice());
    }
  }

  /**
   * Refresh the specs.
   */
  private _refreshSpecs(): Promise<void> {
    let options = {
      baseUrl: this._baseUrl,
      ajaxSettings: this.ajaxSettings
    };
    return Kernel.getSpecs(options).then(specs => {
      if (!JSONExt.deepEqual(specs, this._specs)) {
        this._specs = specs;
        this._specsChanged.emit(specs);
      }
    });
  }

  /**
   * Refresh the running sessions.
   */
  private _refreshRunning(): Promise<void> {
    return Session.listRunning(this._getOptions({})).then(running => {
      if (!JSONExt.deepEqual(running, this._running)) {
        this._running = running.slice();
        this._runningChanged.emit(running);
      }
    });
  }

  private _baseUrl = '';
  private _wsUrl = '';
  private _ajaxSettings = '';
  private _isDisposed = false;
  private _running: Session.IModel[] = [];
  private _specs: Kernel.ISpecModels = null;
  private _runningTimer = -1;
  private _specsTimer = -1;
  private _readyPromise: Promise<void>;
  private _specsChanged = new Signal<this, Kernel.ISpecModels>(this);
  private _runningChanged = new Signal<this, Session.IModel[]>(this);
}
