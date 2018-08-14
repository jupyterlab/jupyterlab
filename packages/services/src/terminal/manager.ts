// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ArrayExt, IIterator, iter } from '@phosphor/algorithm';

import { JSONExt } from '@phosphor/coreutils';

import { ISignal, Signal } from '@phosphor/signaling';

import { ServerConnection } from '..';

import { TerminalSession } from './terminal';

/**
 * A terminal session manager.
 */
export class TerminalManager implements TerminalSession.IManager {
  /**
   * Construct a new terminal manager.
   */
  constructor(options: TerminalManager.IOptions = {}) {
    this.serverSettings =
      options.serverSettings || ServerConnection.makeSettings();

    // Set up state handling if terminals are available.
    if (TerminalSession.isAvailable()) {
      // Initialize internal data.
      this._readyPromise = this._refreshRunning();

      // Set up polling.
      this._refreshTimer = (setInterval as any)(() => {
        if (typeof document !== 'undefined' && document.hidden) {
          // Don't poll when nobody's looking.
          return;
        }
        this._refreshRunning();
      }, 10000);
    }
  }

  /**
   * A signal emitted when the running terminals change.
   */
  get runningChanged(): ISignal<this, TerminalSession.IModel[]> {
    return this._runningChanged;
  }

  /**
   * Test whether the terminal manager is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * The server settings of the manager.
   */
  readonly serverSettings: ServerConnection.ISettings;

  /**
   * Test whether the manager is ready.
   */
  get isReady(): boolean {
    return this._isReady;
  }

  /**
   * Dispose of the resources used by the manager.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;
    clearInterval(this._refreshTimer);
    Signal.clearData(this);
    this._models = [];
  }

  /**
   * A promise that fulfills when the manager is ready.
   */
  get ready(): Promise<void> {
    return this._readyPromise || Promise.reject('Terminals unavailable');
  }

  /**
   * Whether the terminal service is available.
   */
  isAvailable(): boolean {
    return TerminalSession.isAvailable();
  }

  /**
   * Create an iterator over the most recent running terminals.
   *
   * @returns A new iterator over the running terminals.
   */
  running(): IIterator<TerminalSession.IModel> {
    return iter(this._models);
  }

  /**
   * Create a new terminal session.
   *
   * @param options - The options used to connect to the session.
   *
   * @returns A promise that resolves with the terminal instance.
   *
   * #### Notes
   * The manager `serverSettings` will be used unless overridden in the
   * options.
   */
  startNew(
    options?: TerminalSession.IOptions
  ): Promise<TerminalSession.ISession> {
    return TerminalSession.startNew(this._getOptions(options)).then(session => {
      this._onStarted(session);
      return session;
    });
  }

  /*
   * Connect to a running session.
   *
   * @param name - The name of the target session.
   *
   * @param options - The options used to connect to the session.
   *
   * @returns A promise that resolves with the new session instance.
   *
   * #### Notes
   * The manager `serverSettings` will be used unless overridden in the
   * options.
   */
  connectTo(
    name: string,
    options?: TerminalSession.IOptions
  ): Promise<TerminalSession.ISession> {
    return TerminalSession.connectTo(name, this._getOptions(options)).then(
      session => {
        this._onStarted(session);
        return session;
      }
    );
  }

  /**
   * Shut down a terminal session by name.
   */
  shutdown(name: string): Promise<void> {
    let index = ArrayExt.findFirstIndex(
      this._models,
      value => value.name === name
    );
    if (index === -1) {
      return;
    }

    // Proactively remove the model.
    this._models.splice(index, 1);
    this._runningChanged.emit(this._models.slice());

    return TerminalSession.shutdown(name, this.serverSettings).then(() => {
      let toRemove: TerminalSession.ISession[] = [];
      this._sessions.forEach(s => {
        if (s.name === name) {
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
   * Shut down all terminal sessions.
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
          return TerminalSession.shutdown(model.name, this.serverSettings).then(
            () => {
              let toRemove: TerminalSession.ISession[] = [];
              this._sessions.forEach(s => {
                s.dispose();
                toRemove.push(s);
              });
              toRemove.forEach(s => {
                this._sessions.delete(s);
              });
            }
          );
        })
      ).then(() => {
        return undefined;
      });
    });
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
   * Handle a session terminating.
   */
  private _onTerminated(name: string): void {
    let index = ArrayExt.findFirstIndex(
      this._models,
      value => value.name === name
    );
    if (index !== -1) {
      this._models.splice(index, 1);
      this._runningChanged.emit(this._models.slice());
    }
  }

  /**
   * Handle a session starting.
   */
  private _onStarted(session: TerminalSession.ISession): void {
    let name = session.name;
    this._sessions.add(session);
    let index = ArrayExt.findFirstIndex(
      this._models,
      value => value.name === name
    );
    if (index === -1) {
      this._models.push(session.model);
      this._runningChanged.emit(this._models.slice());
    }
    session.terminated.connect(() => {
      this._onTerminated(name);
    });
  }

  /**
   * Refresh the running sessions.
   */
  private _refreshRunning(): Promise<void> {
    return TerminalSession.listRunning(this.serverSettings).then(models => {
      this._isReady = true;
      if (!JSONExt.deepEqual(models, this._models)) {
        let names = models.map(r => r.name);
        let toRemove: TerminalSession.ISession[] = [];
        this._sessions.forEach(s => {
          if (names.indexOf(s.name) === -1) {
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

  /**
   * Get a set of options to pass.
   */
  private _getOptions(
    options: TerminalSession.IOptions = {}
  ): TerminalSession.IOptions {
    return { ...options, serverSettings: this.serverSettings };
  }

  private _models: TerminalSession.IModel[] = [];
  private _sessions = new Set<TerminalSession.ISession>();
  private _isDisposed = false;
  private _isReady = false;
  private _refreshTimer = -1;
  private _readyPromise: Promise<void>;
  private _runningChanged = new Signal<this, TerminalSession.IModel[]>(this);
}

/**
 * The namespace for TerminalManager statics.
 */
export namespace TerminalManager {
  /**
   * The options used to initialize a terminal manager.
   */
  export interface IOptions {
    /**
     * The server settings used by the manager.
     */
    serverSettings?: ServerConnection.ISettings;
  }
}
