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
  IAjaxSettings
} from '../utils';

import * as utils
  from '../utils';

import {
  TerminalSession
} from './terminal';


/**
 * A terminal session manager.
 */
export
class TerminalManager implements TerminalSession.IManager {
  /**
   * Construct a new terminal manager.
   */
  constructor(options: TerminalManager.IOptions = {}) {
    this._baseUrl = options.baseUrl || utils.getBaseUrl();
    this._wsUrl = options.wsUrl || utils.getWsUrl(this._baseUrl);
    this._ajaxSettings = JSON.stringify(options.ajaxSettings || {});

    // Set up state handling if terminals are available.
    if (TerminalSession.isAvailable()) {
      // Initialize internal data.
      this._readyPromise = this._refreshRunning();

      // Set up polling.
      this._refreshTimer = (setInterval as any)(() => {
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
   * Test whether the manger is ready.
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
    this._running = [];
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
    return iter(this._running);
  }

  /**
   * Create a new terminal session.
   *
   * @param ajaxSettings - The ajaxSettings to use, overrides manager
   *   settings.
   *
   * @returns A promise that resolves with the terminal instance.
   *
   * #### Notes
   * The baseUrl and wsUrl of the options will be forced
   * to the ones used by the manager. The ajaxSettings of the manager
   * will be used unless overridden.
   */
  startNew(options?: TerminalSession.IOptions): Promise<TerminalSession.ISession> {
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
   * @param ajaxSettings - The ajaxSettings to use, overrides manager
   *   settings.
   *
   * @returns A promise that resolves with the new session instance.
   *
   * #### Notes
   * The baseUrl and wsUrl of the options will be forced
   * to the ones used by the manager. The ajaxSettings of the manager
   * will be used unless overridden.
   */
  connectTo(name: string, options?: IAjaxSettings): Promise<TerminalSession.ISession> {
    return TerminalSession.connectTo(name, this._getOptions(options)).then(session => {
      this._onStarted(session);
      return session;
    });
  }

  /**
   * Shut down a terminal session by name.
   */
  shutdown(name: string): Promise<void> {
    return TerminalSession.shutdown(name, this._getOptions()).then(() => {
      this._onTerminated(name);
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
    let index = ArrayExt.findFirstIndex(this._running, value => value.name === name);
    if (index !== -1) {
      this._running.splice(index, 1);
      this._runningChanged.emit(this._running.slice());
    }
  }

  /**
   * Handle a session starting.
   */
  private _onStarted(session: TerminalSession.ISession): void {
    let name = session.name;
    let index = ArrayExt.findFirstIndex(this._running, value => value.name === name);
    if (index === -1) {
      this._running.push(session.model);
      this._runningChanged.emit(this._running.slice());
    }
    session.terminated.connect(() => {
      this._onTerminated(name);
    });
  }

  /**
   * Refresh the running sessions.
   */
  private _refreshRunning(): Promise<void> {
    return TerminalSession.listRunning(this._getOptions({})).then(running => {
      this._isReady = true;
      if (!JSONExt.deepEqual(running, this._running)) {
        this._running = running.slice();
        this._runningChanged.emit(running);
      }
    });
  }

  /**
   * Get a set of options to pass.
   */
  private _getOptions(options: TerminalSession.IOptions = {}): TerminalSession.IOptions {
    options.baseUrl = this.baseUrl;
    options.wsUrl = this.wsUrl;
    options.ajaxSettings = options.ajaxSettings || this.ajaxSettings;
    return options;
  }

  private _baseUrl = '';
  private _wsUrl = '';
  private _ajaxSettings = '';
  private _running: TerminalSession.IModel[] = [];
  private _isDisposed = false;
  private _isReady = false;
  private _refreshTimer = -1;
  private _readyPromise: Promise<void>;
  private _runningChanged = new Signal<this, TerminalSession.IModel[]>(this);
}



/**
 * The namespace for TerminalManager statics.
 */
export
namespace TerminalManager {
  /**
   * The options used to initialize a terminal manager.
   */
  export
  interface IOptions {
    /**
     * The base url.
     */
    baseUrl?: string;

    /**
     * The base websocket url.
     */
    wsUrl?: string;

    /**
     * The authentication token for the API.
     */
    token?: string;

    /**
     * The Ajax settings used for server requests.
     */
    ajaxSettings?: utils.IAjaxSettings;
  }
}
