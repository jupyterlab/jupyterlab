// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ArrayExt, IIterator, iter } from '@phosphor/algorithm';

import { JSONExt } from '@phosphor/coreutils';

import { ISignal, Signal } from '@phosphor/signaling';

import { ServerConnection } from '..';

import { TerminalSession } from './terminal';
import { Poll } from '@jupyterlab/coreutils';

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
      // Initialize internal data then start polling.
      this._readyPromise = this._refreshRunning();

      // Start polling with exponential backoff.
      this._pollModels = new Poll({
        interval: 10 * 1000,
        max: 300 * 1000,
        name: `@jupyterlab/services:TerminalManager#models`,
        poll: () => this._refreshRunning(),
        when: this._readyPromise
      });
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
    this._models.length = 0;
    this._pollModels.dispose();
    Signal.clearData(this);
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
  async startNew(
    options?: TerminalSession.IOptions
  ): Promise<TerminalSession.ISession> {
    const session = await TerminalSession.startNew(this._getOptions(options));
    this._onStarted(session);
    return session;
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
  async connectTo(
    name: string,
    options?: TerminalSession.IOptions
  ): Promise<TerminalSession.ISession> {
    const session = await TerminalSession.connectTo(
      name,
      this._getOptions(options)
    );
    this._onStarted(session);
    return session;
  }

  /**
   * Shut down a terminal session by name.
   */
  async shutdown(name: string): Promise<void> {
    const models = this._models;
    const sessions = this._sessions;
    const index = ArrayExt.findFirstIndex(models, model => model.name === name);

    if (index === -1) {
      return;
    }

    // Proactively remove the model.
    models.splice(index, 1);

    // Delete and dispose the session locally.
    sessions.forEach(session => {
      if (session.name === name) {
        sessions.delete(session);
        session.dispose();
      }
    });

    // Emit the new model list without waiting for API request.
    this._runningChanged.emit(models.slice());

    // Shut down the remote session.
    await TerminalSession.shutdown(name, this.serverSettings);
  }

  /**
   * Shut down all terminal sessions.
   *
   * @returns A promise that resolves when all of the sessions are shut down.
   */
  async shutdownAll(): Promise<void> {
    // Remove all models.
    if (this._models.length) {
      this._models.length = 0;
    }

    // Emit the new model list without waiting for API requests.
    this._runningChanged.emit([]);

    // Repopulate list of models silently.
    await this._refreshRunning(true);

    // Shut down every model.
    await Promise.all(
      this._models.map(({ name }) =>
        TerminalSession.shutdown(name, this.serverSettings)
      )
    );

    // Dispose every session and clear the set.
    this._sessions.forEach(session => {
      session.dispose();
    });
    this._sessions.clear();

    // Remove all models even if the API returned with some models.
    if (this._models.length) {
      this._models.length = 0;
    }
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
  private async _refreshRunning(silent = false): Promise<void> {
    const models = await TerminalSession.listRunning(this.serverSettings);
    this._isReady = true;
    if (!JSONExt.deepEqual(models, this._models)) {
      const names = models.map(model => model.name);
      const sessions = this._sessions;
      sessions.forEach(session => {
        if (names.indexOf(session.name) === -1) {
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
   * Get a set of options to pass.
   */
  private _getOptions(
    options: TerminalSession.IOptions = {}
  ): TerminalSession.IOptions {
    return { ...options, serverSettings: this.serverSettings };
  }

  private _isDisposed = false;
  private _isReady = false;
  private _models: TerminalSession.IModel[] = [];
  private _pollModels: Poll;
  private _sessions = new Set<TerminalSession.ISession>();
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
