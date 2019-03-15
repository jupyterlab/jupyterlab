// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Poll } from '@jupyterlab/coreutils';

import { ArrayExt, IIterator, iter } from '@phosphor/algorithm';

import { JSONExt } from '@phosphor/coreutils';

import { ISignal, Signal } from '@phosphor/signaling';

import { ServerConnection } from '..';

import { Kernel } from './kernel';

/**
 * An implementation of a kernel manager.
 */
export class KernelManager implements Kernel.IManager {
  /**
   * Construct a new kernel manager.
   *
   * @param options - The default options for kernel.
   */
  constructor(options: KernelManager.IOptions = {}) {
    this.serverSettings =
      options.serverSettings || ServerConnection.makeSettings();

    // Initialize internal data.
    this._readyPromise = this._refreshSpecs().then(() =>
      this._refreshRunning()
    );

    // Start model and specs polling with exponential backoff.
    this._pollModels = new Poll({
      factory: () => this._refreshRunning(),
      interval: 10 * 1000,
      max: 300 * 1000,
      min: 100,
      name: `@jupyterlab/services:KernelManager#models`,
      standby: options.standby || 'when-hidden',
      when: this._readyPromise
    });
    this._pollSpecs = new Poll({
      factory: () => this._refreshSpecs(),
      interval: 61 * 1000,
      max: 300 * 1000,
      min: 100,
      name: `@jupyterlab/services:KernelManager#specs`,
      standby: options.standby || 'when-hidden',
      when: this._readyPromise
    });
  }

  /**
   * The server settings for the manager.
   */
  readonly serverSettings: ServerConnection.ISettings;

  /**
   * Test whether the terminal manager is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
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
   * A signal emitted when the running kernels change.
   */
  get runningChanged(): ISignal<this, Kernel.IModel[]> {
    return this._runningChanged;
  }

  /**
   * Get the most recently fetched kernel specs.
   */
  get specs(): Kernel.ISpecModels | null {
    return this._specs;
  }

  /**
   * A signal emitted when the specs change.
   */
  get specsChanged(): ISignal<this, Kernel.ISpecModels> {
    return this._specsChanged;
  }

  /**
   * Connect to an existing kernel.
   *
   * @param model - The model of the target kernel.
   *
   * @returns A promise that resolves with the new kernel instance.
   */
  connectTo(model: Kernel.IModel): Kernel.IKernel {
    let kernel = Kernel.connectTo(model, this.serverSettings);
    this._onStarted(kernel);
    return kernel;
  }

  /**
   * Dispose of the resources used by the manager.
   */
  dispose(): void {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    this._models.length = 0;
    this._pollModels.dispose();
    this._pollSpecs.dispose();
    Signal.clearData(this);
  }

  /**
   * Find a kernel by id.
   *
   * @param id - The id of the target kernel.
   *
   * @returns A promise that resolves with the kernel's model.
   */
  findById(id: string): Promise<Kernel.IModel> {
    return Kernel.findById(id, this.serverSettings);
  }

  /**
   * Force a refresh of the running kernels.
   *
   * @returns A promise that resolves when the running list has been refreshed.
   *
   * #### Notes
   * This is not typically meant to be called by the user, since the
   * manager maintains its own internal state.
   */
  async refreshRunning(): Promise<void> {
    await this._pollModels.refresh();
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
  }

  /**
   * Create an iterator over the most recent running kernels.
   *
   * @returns A new iterator over the running kernels.
   */
  running(): IIterator<Kernel.IModel> {
    return iter(this._models);
  }

  /**
   * Shut down a kernel by id.
   *
   * @param id - The id of the target kernel.
   *
   * @returns A promise that resolves when the operation is complete.
   *
   * #### Notes
   * This will emit [[runningChanged]] if the running kernels list
   * changes.
   */
  async shutdown(id: string): Promise<void> {
    const models = this._models;
    const kernels = this._kernels;
    const index = ArrayExt.findFirstIndex(models, value => value.id === id);

    if (index === -1) {
      return;
    }

    // Proactively remove the model.
    models.splice(index, 1);

    // Delete and dispose the kernel locally.
    kernels.forEach(kernel => {
      if (kernel.id === id) {
        kernels.delete(kernel);
        kernel.dispose();
      }
    });

    // Emit the new model list without waiting for API request.
    this._runningChanged.emit(models.slice());

    // Shut down the remote session.
    await Kernel.shutdown(id, this.serverSettings);
  }

  /**
   * Shut down all kernels.
   *
   * @returns A promise that resolves when all of the kernels are shut down.
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
        this._models.map(({ id }) => Kernel.shutdown(id, this.serverSettings))
      );
    } catch (reason) {
      error = reason;
    }
    // Dispose every kernel and clear the set.
    this._kernels.forEach(kernel => {
      kernel.dispose();
    });
    this._kernels.clear();

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
   * Start a new kernel.
   *
   * @param options - The kernel options to use.
   *
   * @returns A promise that resolves with the kernel instance.
   *
   * #### Notes
   * The manager `serverSettings` will be always be used.
   */
  async startNew(options: Kernel.IOptions = {}): Promise<Kernel.IKernel> {
    const newOptions = { ...options, serverSettings: this.serverSettings };
    const kernel = await Kernel.startNew(newOptions);
    this._onStarted(kernel);
    return kernel;
  }

  /**
   * Handle a kernel starting.
   */
  private _onStarted(kernel: Kernel.IKernel): void {
    let id = kernel.id;
    this._kernels.add(kernel);
    let index = ArrayExt.findFirstIndex(this._models, value => value.id === id);
    if (index === -1) {
      this._models.push(kernel.model);
      this._runningChanged.emit(this._models.slice());
    }
    kernel.terminated.connect(() => {
      this._onTerminated(id);
    });
  }

  /**
   * Handle a kernel terminating.
   */
  private _onTerminated(id: string): void {
    let index = ArrayExt.findFirstIndex(this._models, value => value.id === id);
    if (index !== -1) {
      this._models.splice(index, 1);
      this._runningChanged.emit(this._models.slice());
    }
  }

  /**
   * Refresh the running sessions.
   */
  private async _refreshRunning(silent = false): Promise<void> {
    const models = await Kernel.listRunning(this.serverSettings);
    this._isReady = true;
    if (!JSONExt.deepEqual(models, this._models)) {
      const ids = models.map(({ id }) => id);
      const kernels = this._kernels;
      kernels.forEach(kernel => {
        if (ids.indexOf(kernel.id) === -1) {
          kernel.dispose();
          kernels.delete(kernel);
        }
      });
      this._models = models.slice();
      if (!silent) {
        this._runningChanged.emit(models);
      }
    }
  }

  /**
   * Refresh the specs.
   */
  private async _refreshSpecs(): Promise<void> {
    const specs = await Kernel.getSpecs(this.serverSettings);
    if (!JSONExt.deepEqual(specs, this._specs)) {
      this._specs = specs;
      this._specsChanged.emit(specs);
    }
  }

  private _isDisposed = false;
  private _isReady = false;
  private _kernels = new Set<Kernel.IKernel>();
  private _models: Kernel.IModel[] = [];
  private _pollModels: Poll;
  private _pollSpecs: Poll;
  private _readyPromise: Promise<void>;
  private _runningChanged = new Signal<this, Kernel.IModel[]>(this);
  private _specs: Kernel.ISpecModels | null = null;
  private _specsChanged = new Signal<this, Kernel.ISpecModels>(this);
}

/**
 * The namespace for `KernelManager` class statics.
 */
export namespace KernelManager {
  /**
   * The options used to initialize a KernelManager.
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
