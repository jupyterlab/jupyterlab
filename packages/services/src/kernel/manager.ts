// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Poll } from '@lumino/polling';
import { ISignal, Signal } from '@lumino/signaling';
import { CommsOverSubshells, KernelSpec, ServerConnection } from '..';
import * as Kernel from './kernel';
import { BaseManager } from '../basemanager';
import { IKernelOptions, KernelAPIClient } from './restapi';
import { KernelConnection } from './default';
import { KernelSpecAPIClient } from '../kernelspec/restapi';

/**
 * An implementation of a kernel manager.
 */
export class KernelManager extends BaseManager implements Kernel.IManager {
  /**
   * Construct a new kernel manager.
   *
   * @param options - The default options for kernel.
   */
  constructor(options: KernelManager.IOptions = {}) {
    super(options);

    this._kernelAPIClient =
      options.kernelAPIClient ??
      new KernelAPIClient({ serverSettings: this.serverSettings });

    this._kernelSpecAPIClient =
      options.kernelSpecAPIClient ??
      new KernelSpecAPIClient({
        serverSettings: this.serverSettings
      });

    // Start model and specs polling with exponential backoff.
    this._pollModels = new Poll({
      auto: false,
      factory: () => this.requestRunning(),
      frequency: {
        interval: 10 * 1000,
        backoff: true,
        max: 300 * 1000
      },
      name: `@jupyterlab/services:KernelManager#models`,
      standby: options.standby ?? 'when-hidden'
    });

    // Initialize internal data.
    this._ready = (async () => {
      await this._pollModels.start();
      await this._pollModels.tick;
      this._isReady = true;
    })();
  }

  /**
   * The server settings for the manager.
   */
  readonly serverSettings: ServerConnection.ISettings;

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
   * A signal emitted when the running kernels change.
   */
  get runningChanged(): ISignal<this, Kernel.IModel[]> {
    return this._runningChanged;
  }

  /**
   * A signal emitted when there is a connection failure.
   */
  get connectionFailure(): ISignal<this, Error> {
    return this._connectionFailure;
  }

  /**
   * Dispose of the resources used by the manager.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._models.clear();
    this._kernelConnections.forEach(x => x.dispose());
    this._pollModels.dispose();
    super.dispose();
  }

  /**
   * Connect to an existing kernel.
   *
   * @returns The new kernel connection.
   *
   * #### Notes
   * This will use the manager's server settings and ignore any server
   * settings passed in the options.
   */
  connectTo(
    options: Omit<Kernel.IKernelConnection.IOptions, 'serverSettings'>
  ): Kernel.IKernelConnection {
    const { id } = options.model;

    let handleComms = options.handleComms ?? true;
    // By default, handle comms only if no other kernel connection is.
    if (options.handleComms === undefined) {
      for (const kc of this._kernelConnections) {
        if (kc.id === id && kc.handleComms) {
          handleComms = false;
          break;
        }
      }
    }

    options.commsOverSubshells = this._commsOverSubshells;

    const kernelConnection = new KernelConnection({
      handleComms,
      ...options,
      serverSettings: this.serverSettings,
      kernelAPIClient: this._kernelAPIClient,
      kernelSpecAPIClient: this._kernelSpecAPIClient
    });
    this._onStarted(kernelConnection);
    if (!this._models.has(id)) {
      // We trust the user to connect to an existing kernel, but we verify
      // asynchronously.
      void this.refreshRunning().catch(() => {
        /* no-op */
      });
    }
    return kernelConnection;
  }

  /**
   * Create an iterator over the most recent running kernels.
   *
   * @returns A new iterator over the running kernels.
   */
  running(): IterableIterator<Kernel.IModel> {
    return this._models.values();
  }

  /**
   * The number of running kernels.
   */
  get runningCount(): number {
    return this._models.size;
  }

  /**
   * Whether comms are running on subshell or not.
   */
  get commsOverSubshells(): CommsOverSubshells {
    return this._commsOverSubshells;
  }

  set commsOverSubshells(value: CommsOverSubshells) {
    this._commsOverSubshells = value;

    for (const connection of this._kernelConnections) {
      connection.commsOverSubshells = value;
    }
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
    await this._pollModels.tick;
  }

  /**
   * Start a new kernel.
   *
   * @param createOptions - The kernel creation options
   *
   * @param connectOptions - The kernel connection options
   *
   * @returns A promise that resolves with the kernel connection.
   *
   * #### Notes
   * The manager `serverSettings` will be always be used.
   */
  async startNew(
    createOptions: IKernelOptions = {},
    connectOptions: Omit<
      Kernel.IKernelConnection.IOptions,
      'model' | 'serverSettings'
    > = {}
  ): Promise<Kernel.IKernelConnection> {
    const model = await this._kernelAPIClient.startNew(createOptions);
    return this.connectTo({
      ...connectOptions,
      model
    });
  }

  /**
   * Shut down a kernel by id.
   *
   * @param id - The id of the target kernel.
   *
   * @returns A promise that resolves when the operation is complete.
   */
  async shutdown(id: string): Promise<void> {
    await this._kernelAPIClient.shutdown(id);
    await this.refreshRunning();
  }

  /**
   * Shut down all kernels.
   *
   * @returns A promise that resolves when all of the kernels are shut down.
   */
  async shutdownAll(): Promise<void> {
    // Update the list of models to make sure our list is current.
    await this.refreshRunning();

    // Shut down all models.
    await Promise.all(
      [...this._models.keys()].map(id => this._kernelAPIClient.shutdown(id))
    );

    // Update the list of models to clear out our state.
    await this.refreshRunning();
  }

  /**
   * Find a kernel by id.
   *
   * @param id - The id of the target kernel.
   *
   * @returns A promise that resolves with the kernel's model.
   */
  async findById(id: string): Promise<Kernel.IModel | undefined> {
    if (this._models.has(id)) {
      return this._models.get(id);
    }
    await this.refreshRunning();
    return this._models.get(id);
  }

  /**
   * Execute a request to the server to poll running kernels and update state.
   */
  protected async requestRunning(): Promise<void> {
    let models: Kernel.IModel[];
    try {
      models = await this._kernelAPIClient.listRunning();
    } catch (err) {
      // Handle network errors, as well as cases where we are on a
      // JupyterHub and the server is not running. JupyterHub returns a
      // 503 (<2.0) or 424 (>2.0) in that case.
      if (
        err instanceof ServerConnection.NetworkError ||
        err.response?.status === 503 ||
        err.response?.status === 424
      ) {
        this._connectionFailure.emit(err);
      }
      throw err;
    }

    if (this.isDisposed) {
      return;
    }

    if (
      this._models.size === models.length &&
      models.every(model => {
        const existing = this._models.get(model.id);
        if (!existing) {
          return false;
        }
        return (
          existing.connections === model.connections &&
          existing.execution_state === model.execution_state &&
          existing.last_activity === model.last_activity &&
          existing.name === model.name &&
          existing.reason === model.reason &&
          existing.traceback === model.traceback
        );
      })
    ) {
      // Identical models list (presuming models does not contain duplicate
      // ids), so just return
      return;
    }

    this._models = new Map(models.map(x => [x.id, x]));

    // For any kernel connection to a kernel that doesn't exist, notify it of
    // the shutdown.
    this._kernelConnections.forEach(kc => {
      if (!this._models.has(kc.id)) {
        kc.handleShutdown();
      }
    });

    this._runningChanged.emit(models);
  }

  /**
   * Handle a kernel starting.
   */
  private _onStarted(kernelConnection: KernelConnection): void {
    this._kernelConnections.add(kernelConnection);
    kernelConnection.statusChanged.connect(this._onStatusChanged, this);
    kernelConnection.disposed.connect(this._onDisposed, this);
  }

  private _onDisposed(kernelConnection: KernelConnection) {
    this._kernelConnections.delete(kernelConnection);
    // A dispose emission could mean the server session is deleted, or that
    // the kernel JS object is disposed and the kernel still exists on the
    // server, so we refresh from the server to make sure we reflect the
    // server state.

    void this.refreshRunning().catch(() => {
      /* no-op */
    });
  }

  private _onStatusChanged(
    kernelConnection: KernelConnection,
    status: Kernel.Status
  ) {
    if (status === 'dead') {
      // We asynchronously update our list of kernels, which asynchronously
      // will dispose them. We do not want to immediately dispose them because
      // there may be other signal handlers that want to be called.
      void this.refreshRunning().catch(() => {
        /* no-op */
      });
    }
  }

  private _commsOverSubshells: CommsOverSubshells =
    CommsOverSubshells.PerCommTarget;
  private _isReady = false;
  private _ready: Promise<void>;
  private _kernelConnections = new Set<KernelConnection>();
  private _models = new Map<string, Kernel.IModel>();
  private _pollModels: Poll;
  private _runningChanged = new Signal<this, Kernel.IModel[]>(this);
  private _connectionFailure = new Signal<this, Error>(this);
  private _kernelAPIClient: Kernel.IKernelAPIClient;
  private _kernelSpecAPIClient: KernelSpec.IKernelSpecAPIClient;
}

/**
 * The namespace for `KernelManager` class statics.
 */
export namespace KernelManager {
  /**
   * The options used to initialize a KernelManager.
   */
  export interface IOptions extends BaseManager.IOptions {
    /**
     * When the manager stops polling the API. Defaults to `when-hidden`.
     */
    standby?: Poll.Standby | (() => boolean | Poll.Standby);

    /**
     * The kernel API client.
     */
    kernelAPIClient?: Kernel.IKernelAPIClient;

    /**
     * The kernel spec API client.
     */
    kernelSpecAPIClient?: KernelSpec.IKernelSpecAPIClient;
  }

  /**
   * A no-op kernel manager to be used when starting kernels.
   */
  export class NoopManager extends KernelManager {
    /**
     * Whether the manager is active.
     */
    get isActive(): boolean {
      return false;
    }

    /**
     * Used for testing.
     */
    get parentReady(): Promise<void> {
      return super.ready;
    }

    /**
     * Start a new kernel - throws an error since it is not supported.
     */
    async startNew(
      createOptions: IKernelOptions = {},
      connectOptions: Omit<
        Kernel.IKernelConnection.IOptions,
        'model' | 'serverSettings'
      > = {}
    ): Promise<Kernel.IKernelConnection> {
      return Promise.reject(
        new Error('Not implemented in no-op Kernel Manager')
      );
    }

    /**
     * Connect to an existing kernel - throws an error since it is not supported.
     */
    connectTo(
      options: Omit<Kernel.IKernelConnection.IOptions, 'serverSettings'>
    ): Kernel.IKernelConnection {
      throw new Error('Not implemented in no-op Kernel Manager');
    }

    /**
     * Shut down a kernel by id - throws an error since it is not supported.
     */
    async shutdown(id: string): Promise<void> {
      return Promise.reject(
        new Error('Not implemented in no-op Kernel Manager')
      );
    }

    /**
     * A promise that fulfills when the manager is ready (never).
     */
    get ready(): Promise<void> {
      return this.parentReady.then(() => this._readyPromise);
    }

    /**
     * Execute a request to the server to poll running kernels and update state.
     */
    protected async requestRunning(): Promise<void> {
      return Promise.resolve();
    }

    private _readyPromise = new Promise<void>(() => {
      /* no-op */
    });
  }
}
