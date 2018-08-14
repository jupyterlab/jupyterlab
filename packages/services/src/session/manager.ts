// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ArrayExt, IIterator, iter } from '@phosphor/algorithm';

import { JSONExt } from '@phosphor/coreutils';

import { ISignal, Signal } from '@phosphor/signaling';

import { Kernel } from '../kernel';

import { ServerConnection } from '..';

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
    this._readyPromise = this._refreshSpecs().then(() => {
      return this._refreshRunning();
    });

    // Set up polling.
    this._modelsTimer = (setInterval as any)(() => {
      if (typeof document !== 'undefined' && document.hidden) {
        // Don't poll when nobody's looking.
        return;
      }
      this._refreshRunning();
    }, 10000);
    this._specsTimer = (setInterval as any)(() => {
      if (typeof document !== 'undefined' && document.hidden) {
        // Don't poll when nobody's looking.
        return;
      }
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
    return this._specs !== null;
  }

  /**
   * A promise that fulfills when the manager is ready.
   */
  get ready(): Promise<void> {
    return this._readyPromise;
  }

  /**
   * Dispose of the resources used by the manager.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;
    clearInterval(this._modelsTimer);
    clearInterval(this._specsTimer);
    Signal.clearData(this);
    this._models.length = 0;
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
    let serverSettings = this.serverSettings;
    return Session.startNew({ ...options, serverSettings }).then(session => {
      this._onStarted(session);
      return session;
    });
  }

  /**
   * Find a session associated with a path and stop it if it is the only session
   * using that kernel.
   *
   * @param path - The path in question.
   *
   * @returns A promise that resolves when the relevant sessions are stopped.
   */
  stopIfNeeded(path: string): Promise<void> {
    return Session.listRunning(this.serverSettings)
      .then(sessions => {
        const matches = sessions.filter(value => value.path === path);
        if (matches.length === 1) {
          const id = matches[0].id;
          return this.shutdown(id).catch(() => {
            /* no-op */
          });
        }
      })
      .catch(() => Promise.resolve(void 0)); // Always succeed.
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
  shutdown(id: string): Promise<void> {
    let index = ArrayExt.findFirstIndex(this._models, value => value.id === id);
    if (index === -1) {
      return;
    }
    // Proactively remove the model.
    this._models.splice(index, 1);
    this._runningChanged.emit(this._models.slice());

    return Session.shutdown(id, this.serverSettings).then(() => {
      let toRemove: Session.ISession[] = [];
      this._sessions.forEach(s => {
        if (s.id === id) {
          s.dispose();
          toRemove.push(s);
        }
      });
      toRemove.forEach(s => {
        this._sessions.delete(s);
      });
    });
  }

  /**
   * Shut down all sessions.
   *
   * @returns A promise that resolves when all of the sessions are shut down.
   */
  shutdownAll(): Promise<void> {
    // Proactively remove all models.
    let models = this._models;
    if (models.length > 0) {
      this._models = [];
      this._runningChanged.emit([]);
    }

    return this._refreshRunning().then(() => {
      return Promise.all(
        models.map(model => {
          return Session.shutdown(model.id, this.serverSettings).then(() => {
            let toRemove: Session.ISession[] = [];
            this._sessions.forEach(s => {
              s.dispose();
              toRemove.push(s);
            });
            toRemove.forEach(s => {
              this._sessions.delete(s);
            });
          });
        })
      ).then(() => {
        return undefined;
      });
    });
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

  /**
   * Refresh the specs.
   */
  private _refreshSpecs(): Promise<void> {
    return Kernel.getSpecs(this.serverSettings).then(specs => {
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
    return Session.listRunning(this.serverSettings).then(models => {
      if (!JSONExt.deepEqual(models, this._models)) {
        let ids = models.map(r => r.id);
        let toRemove: Session.ISession[] = [];
        this._sessions.forEach(s => {
          if (ids.indexOf(s.id) === -1) {
            s.dispose();
            toRemove.push(s);
          }
        });
        toRemove.forEach(s => {
          this._sessions.delete(s);
        });
        this._models = models.slice();
        this._runningChanged.emit(models);
      }
    });
  }

  private _isDisposed = false;
  private _models: Session.IModel[] = [];
  private _sessions = new Set<Session.ISession>();
  private _specs: Kernel.ISpecModels | null = null;
  private _modelsTimer = -1;
  private _specsTimer = -1;
  private _readyPromise: Promise<void>;
  private _specsChanged = new Signal<this, Kernel.ISpecModels>(this);
  private _runningChanged = new Signal<this, Session.IModel[]>(this);
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
  }
}
