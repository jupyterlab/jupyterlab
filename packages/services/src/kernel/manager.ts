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

import * as utils
  from '../utils';

import {
  IAjaxSettings
} from '../utils';

import {
  Kernel
} from './kernel';


/**
 * An implementation of a kernel manager.
 */
export
class KernelManager implements Kernel.IManager {
  /**
   * Construct a new kernel manager.
   *
   * @param options - The default options for kernel.
   */
  constructor(options: Kernel.IOptions = {}) {
    this._baseUrl = options.baseUrl || utils.getBaseUrl();
    this._wsUrl = options.wsUrl || utils.getWsUrl(this._baseUrl);
    this._token = options.token || utils.getConfigOption('token');
    this._ajaxSettings = JSON.stringify(utils.ajaxSettingsWithToken(options.ajaxSettings, options.token));

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
   * A signal emitted when the specs change.
   */
  get specsChanged(): ISignal<this, Kernel.ISpecModels> {
    return this._specsChanged;
  }

  /**
   * A signal emitted when the running kernels change.
   */
  get runningChanged(): ISignal<this, Kernel.IModel[]> {
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
    this._specs = null;
    this._running = [];
  }

  /**
   * Get the base url of the manager.
   */
  get baseUrl(): string {
    return this._baseUrl;
  }

  /**
   * Get the ws url of the manager.
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
    return this._isReady;
  }

  /**
   * A promise that fulfills when the manager is ready.
   */
  get ready(): Promise<void> {
    return this._readyPromise;
  }

  /**
   * Create an iterator over the most recent running kernels.
   *
   * @returns A new iterator over the running kernels.
   */
  running(): IIterator<Kernel.IModel> {
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
   * Force a refresh of the running kernels.
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
   * Start a new kernel.  See also [[startNewKernel]].
   *
   * @param options - Overrides for the default options.
   */
  startNew(options?: Kernel.IOptions): Promise<Kernel.IKernel> {
    return Kernel.startNew(this._getOptions(options)).then(kernel => {
      this._onStarted(kernel);
      return kernel;
    });
  }

  /**
   * Find a kernel by id.
   *
   * @param options - Overrides for the default options.
   */
  findById(id: string, options?: Kernel.IOptions): Promise<Kernel.IModel> {
    return Kernel.findById(id, this._getOptions(options));
  }

  /**
   * Connect to a running kernel.  See also [[connectToKernel]].
   *
   * @param options - Overrides for the default options.
   */
  connectTo(id: string, options?: Kernel.IOptions): Promise<Kernel.IKernel> {
    return Kernel.connectTo(id, this._getOptions(options)).then(kernel => {
      this._onStarted(kernel);
      return kernel;
    });
  }

  /**
   * Shut down a kernel by id.
   *
   * @param options - Overrides for the default options.
   *
   * #### Notes
   * This will emit [[runningChanged]] if the running kernels list
   * changes.
   */
  shutdown(id: string, options?: Kernel.IOptions): Promise<void> {
    return Kernel.shutdown(id, this._getOptions(options)).then(() => {
      this._onTerminated(id);
    });
  }

  /**
   * Handle a kernel terminating.
   */
  private _onTerminated(id: string): void {
    let index = ArrayExt.findFirstIndex(this._running, value => value.id === id);
    if (index !== -1) {
      this._running.splice(index, 1);
      this._runningChanged.emit(this._running.slice());
    }
  }

  /**
   * Handle a kernel starting.
   */
  private _onStarted(kernel: Kernel.IKernel): void {
    let id = kernel.id;
    let index = ArrayExt.findFirstIndex(this._running, value => value.id === id);
    if (index === -1) {
      this._running.push(kernel.model);
      this._runningChanged.emit(this._running.slice());
    }
    kernel.terminated.connect(() => {
      this._onTerminated(id);
    });
  }

  /**
   * Refresh the specs.
   */
  private _refreshSpecs(): Promise<void> {
    let options = {
      baseUrl: this._baseUrl,
      token: this._token,
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
    return Kernel.listRunning(this._getOptions({})).then(running => {
      this._isReady = true;
      if (!JSONExt.deepEqual(running, this._running)) {
        this._running = running.slice();
        this._runningChanged.emit(running);
      }
    });
  }

  /**
   * Get optionally overidden options.
   */
  private _getOptions(options: Kernel.IOptions = {}): Kernel.IOptions {
    options.baseUrl = this._baseUrl;
    options.wsUrl = this._wsUrl;
    options.token = this._token;
    options.ajaxSettings = options.ajaxSettings || this.ajaxSettings;
    return options;
  }

  private _baseUrl = '';
  private _wsUrl = '';
  private _token = '';
  private _ajaxSettings = '';
  private _running: Kernel.IModel[] = [];
  private _specs: Kernel.ISpecModels = null;
  private _isDisposed = false;
  private _runningTimer = -1;
  private _specsTimer = -1;
  private _readyPromise: Promise<void>;
  private _isReady = false;
  private _specsChanged = new Signal<this, Kernel.ISpecModels>(this);
  private _runningChanged = new Signal<this, Kernel.IModel[]>(this);
}
