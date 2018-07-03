// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

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
    clearInterval(this._modelsTimer);
    clearInterval(this._specsTimer);
    Signal.clearData(this);
    this._models = [];
  }

  /**
   * The server settings for the manager.
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
    return this._readyPromise;
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
   * Start a new kernel.
   *
   * @param options - The kernel options to use.
   *
   * @returns A promise that resolves with the kernel instance.
   *
   * #### Notes
   * The manager `serverSettings` will be always be used.
   */
  startNew(options: Kernel.IOptions = {}): Promise<Kernel.IKernel> {
    let newOptions = { ...options, serverSettings: this.serverSettings };
    return Kernel.startNew(newOptions).then(kernel => {
      this._onStarted(kernel);
      return kernel;
    });
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
  shutdown(id: string): Promise<void> {
    let index = ArrayExt.findFirstIndex(this._models, value => value.id === id);
    if (index === -1) {
      return;
    }

    // Proactively remove the model.
    this._models.splice(index, 1);
    this._runningChanged.emit(this._models.slice());

    return Kernel.shutdown(id, this.serverSettings).then(() => {
      let toRemove: Kernel.IKernel[] = [];
      this._kernels.forEach(k => {
        if (k.id === id) {
          k.dispose();
          toRemove.push(k);
        }
      });
      toRemove.forEach(k => {
        this._kernels.delete(k);
      });
    });
  }

  /**
   * Shut down all kernels.
   *
   * @returns A promise that resolves when all of the kernels are shut down.
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
          return Kernel.shutdown(model.id, this.serverSettings).then(() => {
            let toRemove: Kernel.IKernel[] = [];
            this._kernels.forEach(k => {
              k.dispose();
              toRemove.push(k);
            });
            toRemove.forEach(k => {
              this._kernels.delete(k);
            });
          });
        })
      ).then(() => {
        return undefined;
      });
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
    return Kernel.listRunning(this.serverSettings).then(models => {
      this._isReady = true;
      if (!JSONExt.deepEqual(models, this._models)) {
        let ids = models.map(r => r.id);
        let toRemove: Kernel.IKernel[] = [];
        this._kernels.forEach(k => {
          if (ids.indexOf(k.id) === -1) {
            k.dispose();
            toRemove.push(k);
          }
        });
        toRemove.forEach(s => {
          this._kernels.delete(s);
        });
        this._models = models.slice();
        this._runningChanged.emit(models);
      }
    });
  }

  private _models: Kernel.IModel[] = [];
  private _kernels = new Set<Kernel.IKernel>();
  private _specs: Kernel.ISpecModels | null = null;
  private _isDisposed = false;
  private _modelsTimer = -1;
  private _specsTimer = -1;
  private _readyPromise: Promise<void>;
  private _isReady = false;
  private _specsChanged = new Signal<this, Kernel.ISpecModels>(this);
  private _runningChanged = new Signal<this, Kernel.IModel[]>(this);
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
  }
}
