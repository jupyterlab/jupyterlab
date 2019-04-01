// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IPoll, Poll } from '@jupyterlab/coreutils';

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
      // Initialize internal data then start polling.
      this._ready = this._refreshRunning()
        .catch(_ => undefined)
        .then(() => {
          this._isReady = true;
        });

      // Start polling with exponential backoff.
      this._pollModels = new Poll({
        factory: () => this._refreshRunning(),
        frequency: {
          interval: 10 * 1000,
          jitter: true,
          max: 300 * 1000,
          min: 100
        },
        name: `@jupyterlab/services:TerminalManager#models`,
        standby: options.standby || 'when-hidden',
        when: this.ready
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
    return this._ready || Promise.reject('Terminals unavailable');
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
   * Force a refresh of the running sessions.
   *
   * #### Notes
   * This is intended to be called only in response to a user action,
   * since the manager maintains its internal state.
   */
  async refreshRunning(): Promise<void> {
    await this._pollModels.refresh();
    await this._pollModels.tick;
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

    // Shut down the remote session.
    await TerminalSession.shutdown(name, this.serverSettings);

    // Emit the model list.
    this._runningChanged.emit(models.slice());
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

    // Repopulate list of models silently then shut down every session.
    let error: any;
    try {
      await this._refreshRunning(true);
      await Promise.all(
        this._models.map(({ name }) =>
          TerminalSession.shutdown(name, this.serverSettings)
        )
      );
    } catch (reason) {
      error = reason;
    }

    // Dispose every session and clear the set.
    this._sessions.forEach(session => {
      session.dispose();
    });
    this._sessions.clear();

    // Remove all models even if the API returned with some models.
    if (this._models.length) {
      this._models.length = 0;
    }

    // If the API requests failed, reject the promise.
    if (error) {
      throw error;
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
   * Refresh the running sessions.
   */
  private async _refreshRunning(silent = false): Promise<void> {
    const models = await TerminalSession.listRunning(this.serverSettings);
    if (!JSONExt.deepEqual(models, this._models)) {
      const names = models.map(({ name }) => name);
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

  private _isDisposed = false;
  private _isReady = false;
  private _models: TerminalSession.IModel[] = [];
  private _pollModels: Poll;
  private _sessions = new Set<TerminalSession.ISession>();
  private _ready: Promise<void>;
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

    /**
     * When the manager stops polling the API. Defaults to `when-hidden`.
     */
    standby?: IPoll.Standby;
  }
}
