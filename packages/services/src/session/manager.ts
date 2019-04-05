// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Poll } from '@jupyterlab/coreutils';

import { ArrayExt, IIterator, iter } from '@phosphor/algorithm';

import { JSONExt } from '@phosphor/coreutils';

import { ISignal, Signal } from '@phosphor/signaling';

import { Kernel } from '../kernel';

import { ServerConnection } from '../serverconnection';

import { Session } from './session';

/**
 * An implementation of a session manager.
 */
export class SessionManager implements Session.IManager {
  /**
   * Construct a new session manager.
   *
   * @param options - The default options for each session.
   */
  constructor(options: SessionManager.IOptions = {}) {
    this.serverSettings =
      options.serverSettings || ServerConnection.makeSettings();

    // Initialize internal data.
    this._ready = Promise.all([this.requestRunning(), this.requestSpecs()])
      .then(_ => undefined)
      .catch(_ => undefined)
      .then(() => {
        if (this.isDisposed) {
          return;
        }
        this._isReady = true;
      });

    // Start model and specs polling with exponential backoff.
    this._pollModels = new Poll({
      factory: () => this.requestRunning(),
      frequency: {
        interval: 10 * 1000,
        jitter: true,
        max: 300 * 1000,
        min: 100
      },
      name: `@jupyterlab/services:SessionManager#models`,
      standby: options.standby || 'when-hidden',
      when: this.ready
    });
    this._pollSpecs = new Poll({
      factory: () => this.requestSpecs(),
      frequency: {
        interval: 61 * 1000,
        jitter: true,
        max: 300 * 1000,
        min: 100
      },
      name: `@jupyterlab/services:SessionManager#specs`,
      standby: options.standby || 'when-hidden',
      when: this.ready
    });
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
   * Test whether the manager is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * The server settings of the manager.
   */
  readonly serverSettings: ServerConnection.ISettings;

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
    return this._isReady;
  }

  /**
   * A promise that fulfills when the manager is ready.
   */
  get ready(): Promise<void> {
    return this._ready;
  }

  /**
   * Dispose of the resources used by the manager.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;
    this._models.length = 0;
    this._pollModels.dispose();
    this._pollSpecs.dispose();
    Signal.clearData(this);
  }

  /**
   * Create an iterator over the most recent running sessions.
   *
   * @returns A new iterator over the running sessions.
   */
  running(): IIterator<Session.IModel> {
    return iter(this._models);
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
  async refreshSpecs(): Promise<void> {
    await this._pollSpecs.refresh();
    await this._pollSpecs.tick;
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
  async refreshRunning(): Promise<void> {
    await this._pollModels.refresh();
    await this._pollModels.tick;
  }

  /**
   * Start a new session.  See also [[startNewSession]].
   *
   * @param options - Overrides for the default options, must include a `path`.
   */
  async startNew(options: Session.IOptions): Promise<Session.ISession> {
    const { serverSettings } = this;
    const session = await Session.startNew({ ...options, serverSettings });
    this._onStarted(session);
    return session;
  }

  /**
   * Find a session associated with a path and stop it if it is the only session
   * using that kernel.
   *
   * @param path - The path in question.
   *
   * @returns A promise that resolves when the relevant sessions are stopped.
   */
  async stopIfNeeded(path: string): Promise<void> {
    try {
      const sessions = await Session.listRunning(this.serverSettings);
      const matches = sessions.filter(value => value.path === path);
      if (matches.length === 1) {
        const id = matches[0].id;
        return this.shutdown(id).catch(() => {
          /* no-op */
        });
      }
    } catch (error) {
      /* Always succeed. */
    }
  }

  /**
   * Find a session by id.
   */
  findById(id: string): Promise<Session.IModel> {
    return Session.findById(id, this.serverSettings);
  }

  /**
   * Find a session by path.
   */
  findByPath(path: string): Promise<Session.IModel> {
    return Session.findByPath(path, this.serverSettings);
  }

  /*
   * Connect to a running session.  See also [[connectToSession]].
   */
  connectTo(model: Session.IModel): Session.ISession {
    const session = Session.connectTo(model, this.serverSettings);
    this._onStarted(session);
    return session;
  }

  /**
   * Shut down a session by id.
   */
  async shutdown(id: string): Promise<void> {
    const models = this._models;
    const sessions = this._sessions;
    const index = ArrayExt.findFirstIndex(models, model => model.id === id);

    if (index === -1) {
      return;
    }

    // Proactively remove the model.
    models.splice(index, 1);
    this._runningChanged.emit(models.slice());

    await Session.shutdown(id, this.serverSettings);
    sessions.forEach(session => {
      if (session.id === id) {
        sessions.delete(session);
        session.dispose();
      }
    });
  }

  /**
   * Shut down all sessions.
   *
   * @returns A promise that resolves when all of the sessions are shut down.
   */
  async shutdownAll(): Promise<void> {
    // Proactively remove all models.
    const models = this._models;

    if (models.length) {
      this._models.length = 0;
    }

    try {
      await this.requestRunning(true);
    } catch (error) {
      // Continue attempting to shutdown the known models.
    }
    await Promise.all(
      models.map(async model => {
        await Session.shutdown(model.id, this.serverSettings);
      })
    );

    const sessions = this._sessions;
    sessions.forEach(session => {
      session.dispose();
    });
    sessions.clear();

    if (models.length) {
      this._runningChanged.emit([]);
    }
  }

  /**
   * Execute a request to the server to poll running kernels and update state.
   */
  protected async requestRunning(silent = false): Promise<void> {
    const models = await Session.listRunning(this.serverSettings);
    if (this.isDisposed) {
      return;
    }
    if (!JSONExt.deepEqual(models, this._models)) {
      const ids = models.map(model => model.id);
      const sessions = this._sessions;
      sessions.forEach(session => {
        if (ids.indexOf(session.id) === -1) {
          session.dispose();
          sessions.delete(session);
        }
      });
      this._models = models.slice();
      if (!silent) {
        this._runningChanged.emit(models);
      }
    }
  }

  /**
   * Execute a request to the server to poll specs and update state.
   */
  protected async requestSpecs(silent = false): Promise<void> {
    const specs = await Kernel.getSpecs(this.serverSettings);
    if (this.isDisposed) {
      return;
    }
    if (!JSONExt.deepEqual(specs, this._specs)) {
      this._specs = specs;
      if (!silent) {
        this._specsChanged.emit(specs);
      }
    }
  }

  /**
   * Handle a session terminating.
   */
  private _onTerminated(id: string): void {
    let index = ArrayExt.findFirstIndex(this._models, value => value.id === id);
    if (index !== -1) {
      this._models.splice(index, 1);
      this._runningChanged.emit(this._models.slice());
    }
  }

  /**
   * Handle a session starting.
   */
  private _onStarted(session: Session.ISession): void {
    let id = session.id;
    let index = ArrayExt.findFirstIndex(this._models, value => value.id === id);
    this._sessions.add(session);
    if (index === -1) {
      this._models.push(session.model);
      this._runningChanged.emit(this._models.slice());
    }
    session.terminated.connect(s => {
      this._onTerminated(id);
    });
    session.propertyChanged.connect((sender, prop) => {
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
    let index = ArrayExt.findFirstIndex(
      this._models,
      value => value.id === model.id
    );
    if (index !== -1) {
      this._models[index] = model;
      this._runningChanged.emit(this._models.slice());
    }
  }

  private _isDisposed = false;
  private _isReady = false;
  private _models: Session.IModel[] = [];
  private _pollModels: Poll;
  private _pollSpecs: Poll;
  private _ready: Promise<void>;
  private _runningChanged = new Signal<this, Session.IModel[]>(this);
  private _sessions = new Set<Session.ISession>();
  private _specs: Kernel.ISpecModels | null = null;
  private _specsChanged = new Signal<this, Kernel.ISpecModels>(this);
}

/**
 * The namespace for `SessionManager` class statics.
 */
export namespace SessionManager {
  /**
   * The options used to initialize a SessionManager.
   */
  export interface IOptions {
    /**
     * The server settings for the manager.
     */
    serverSettings?: ServerConnection.ISettings;

    /**
     * When the manager stops polling the API. Defaults to `when-hidden`.
     */
    standby?: Poll.Standby;
  }
}
