// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IDisposable, IObservableDisposable } from '@lumino/disposable';

import { ISignal } from '@lumino/signaling';

import { Kernel, KernelMessage } from '../kernel';

import { ServerConnection } from '..';

import { IChangedArgs } from '@jupyterlab/coreutils';

import { DeepPartial } from './restapi';

/**
 * Interface of a session object.
 *
 * A session object represents a live connection to a session kernel.
 *
 * This represents a persistent kernel connection with a particular key,
 * that persists across changing kernels and kernels getting terminated. As
 * such, a number of signals are proxied from the current kernel for
 * convenience.
 *
 * The kernel is owned by the session, in that the session creates the
 * kernel and manages its lifecycle.
 */
export interface ISessionConnection extends IObservableDisposable {
  /**
   * A signal emitted when a session property changes.
   */
  readonly propertyChanged: ISignal<this, 'path' | 'name' | 'type'>;

  /**
   * A signal emitted when the kernel changes.
   */
  kernelChanged: ISignal<
    this,
    IChangedArgs<
      Kernel.IKernelConnection | null,
      Kernel.IKernelConnection | null,
      'kernel'
    >
  >;

  /**
   * The kernel statusChanged signal, proxied from the current kernel.
   */
  statusChanged: ISignal<this, Kernel.Status>;

  /**
   * The kernel connectionStatusChanged signal, proxied from the current
   * kernel.
   */
  connectionStatusChanged: ISignal<this, Kernel.ConnectionStatus>;

  /**
   * The kernel pendingInput signal, proxied from the current
   * kernel.
   */
  pendingInput: ISignal<this, boolean>;

  /**
   * The kernel iopubMessage signal, proxied from the current kernel.
   */
  iopubMessage: ISignal<this, KernelMessage.IIOPubMessage>;

  /**
   * The kernel unhandledMessage signal, proxied from the current kernel.
   */
  unhandledMessage: ISignal<this, KernelMessage.IMessage>;

  /**
   * The kernel anyMessage signal, proxied from the current kernel.
   */
  anyMessage: ISignal<this, Kernel.IAnyMessageArgs>;

  /**
   * Unique id of the session.
   */
  readonly id: string;

  /**
   * The current path associated with the session.
   */
  readonly path: string;

  /**
   * The current name associated with the session.
   */
  readonly name: string;

  /**
   * The type of the session.
   */
  readonly type: string;

  /**
   * The server settings of the session.
   */
  readonly serverSettings: ServerConnection.ISettings;

  /**
   * The model associated with the session.
   */
  readonly model: IModel;

  /**
   * The kernel.
   *
   * #### Notes
   * This is a read-only property, and can be altered by [changeKernel].
   *
   * A number of kernel signals are proxied through the session from
   * whatever the current kernel is for convenience.
   */
  readonly kernel: Kernel.IKernelConnection | null;

  /**
   * Change the session path.
   *
   * @param path - The new session path.
   *
   * @returns A promise that resolves when the session has renamed.
   *
   * #### Notes
   * This uses the Jupyter REST API, and the response is validated.
   * The promise is fulfilled on a valid response and rejected otherwise.
   */
  setPath(path: string): Promise<void>;

  /**
   * Change the session name.
   *
   * @returns A promise that resolves when the session has renamed.
   *
   * #### Notes
   * This uses the Jupyter REST API, and the response is validated.
   * The promise is fulfilled on a valid response and rejected otherwise.
   */
  setName(name: string): Promise<void>;

  /**
   * Change the session type.
   *
   * @returns A promise that resolves when the session has renamed.
   *
   * #### Notes
   * This uses the Jupyter REST API, and the response is validated.
   * The promise is fulfilled on a valid response and rejected otherwise.
   */
  setType(type: string): Promise<void>;

  /**
   * Change the kernel.
   *
   * @param options - The name or id of the new kernel.
   *
   * @returns A promise that resolves with the new kernel model.
   *
   * #### Notes
   * This shuts down the existing kernel and creates a new kernel, keeping
   * the existing session ID and path. The session assumes it owns the
   * kernel.
   *
   * To start now kernel, pass an empty dictionary.
   */
  changeKernel(
    options: Partial<Kernel.IModel>
  ): Promise<Kernel.IKernelConnection | null>;

  /**
   * Kill the kernel and shutdown the session.
   *
   * @returns A promise that resolves when the session is shut down.
   *
   * #### Notes
   * This uses the Jupyter REST API, and the response is validated.
   * The promise is fulfilled on a valid response and rejected otherwise.
   */
  shutdown(): Promise<void>;
}

/**
 * A namespace for ISessionConnection statics.
 */
export namespace ISessionConnection {
  /**
   * The session initialization options.
   */
  export interface IOptions {
    /**
     * Session model.
     */
    model: IModel;

    /**
     * Connects to an existing kernel
     */
    connectToKernel(
      options: Kernel.IKernelConnection.IOptions
    ): Kernel.IKernelConnection;

    /**
     * The server settings.
     */
    serverSettings?: ServerConnection.ISettings;

    /**
     * The session API client.
     */
    sessionAPIClient?: ISessionAPIClient;

    /**
     * The username of the session client.
     */
    username?: string;

    /**
     * The unique identifier for the session client.
     */
    clientId?: string;

    /**
     * Kernel connection options
     */
    kernelConnectionOptions?: Omit<
      Kernel.IKernelConnection.IOptions,
      'model' | 'username' | 'clientId' | 'serverSettings'
    >;
  }

  /**
   * An arguments object for the kernel changed signal.
   */
  export type IKernelChangedArgs = IChangedArgs<
    Kernel.IKernelConnection | null,
    Kernel.IKernelConnection | null,
    'kernel'
  >;
}

/**
 * Object which manages session instances.
 *
 * #### Notes
 * The manager is responsible for maintaining the state of running
 * sessions.
 */
export interface IManager extends IDisposable {
  /**
   * A signal emitted when the running sessions change.
   */
  runningChanged: ISignal<this, IModel[]>;

  /**
   * A signal emitted when there is a connection failure.
   */
  connectionFailure: ISignal<IManager, ServerConnection.NetworkError>;

  /**
   * The server settings for the manager.
   */
  serverSettings?: ServerConnection.ISettings;

  /**
   * Test whether the manager is ready.
   */
  readonly isReady: boolean;

  /**
   * A promise that is fulfilled when the manager is ready.
   */
  readonly ready: Promise<void>;

  /**
   * Create an iterator over the known running sessions.
   *
   * @returns A new iterator over the running sessions.
   */
  running(): IterableIterator<IModel>;

  /**
   * Start a new session.
   *
   * @param createOptions - Options for creating the session
   *
   * @param connectOptions - Options for connecting to the session
   *
   * @returns A promise that resolves with a session connection instance.
   *
   * #### Notes
   * The `serverSettings` and `connectToKernel` options of the manager will be used.
   */
  startNew(
    createOptions: ISessionOptions,
    connectOptions?: Omit<
      ISessionConnection.IOptions,
      'model' | 'connectToKernel' | 'serverSettings'
    >
  ): Promise<ISessionConnection>;

  /**
   * Find a session by id.
   *
   * @param id - The id of the target session.
   *
   * @returns A promise that resolves with the session's model.
   */
  findById(id: string): Promise<IModel | undefined>;

  /**
   * Find a session by path.
   *
   * @param path - The path of the target session.
   *
   * @returns A promise that resolves with the session's model.
   */
  findByPath(path: string): Promise<IModel | undefined>;

  /**
   * Connect to a running session.
   *
   * @param options - The session options to use
   * @param options.model - The model of the target session.
   *
   * @returns The new session instance.
   */
  connectTo(
    options: Omit<
      ISessionConnection.IOptions,
      'connectToKernel' | 'serverSettings'
    >
  ): ISessionConnection;

  /**
   * Shut down a session by id.
   *
   * @param id - The id of the target kernel.
   *
   * @returns A promise that resolves when the operation is complete.
   */
  shutdown(id: string): Promise<void>;

  /**
   * Shut down all sessions.
   *
   * @returns A promise that resolves when all of the sessions are shut down.
   */
  shutdownAll(): Promise<void>;

  /**
   * Force a refresh of the running sessions.
   *
   * @returns A promise that resolves when the models are refreshed.
   *
   * #### Notes
   * This is intended to be called only in response to a user action,
   * since the manager maintains its internal state.
   */
  refreshRunning(): Promise<void>;

  /**
   * Find a session associated with a path and stop it is the only session
   * using that kernel.
   *
   * @param path - The path in question.
   *
   * @returns A promise that resolves when the relevant sessions are stopped.
   */
  stopIfNeeded(path: string): Promise<void>;
}

/**
 * The session model returned by the server.
 *
 * #### Notes
 * See the [Jupyter Server API](https://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter-server/jupyter_server/main/jupyter_server/services/api/api.yaml#!/sessions).
 */
export interface IModel {
  /**
   * The unique identifier for the session client.
   */
  readonly id: string;
  readonly name: string;
  readonly path: string;
  readonly type: string;
  readonly kernel: Kernel.IModel | null;
}

/**
 * A session request.
 *
 * #### Notes
 * The `path` and `type` session model parameters are required. The `name`
 * parameter is not technically required, but is often assumed to be nonempty,
 * so we require it too.
 *
 * See the [Jupyter Server API](https://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter-server/jupyter_server/main/jupyter_server/services/api/api.yaml#!/sessions).
 */
export type ISessionOptions = Pick<IModel, 'path' | 'type' | 'name'> & {
  kernel?: Partial<Pick<Kernel.IModel, 'name'>>;
};

/**
 * Interface for making requests to the Session API.
 */
export interface ISessionAPIClient {
  /**
   * The server settings used by the client.
   */
  readonly serverSettings: ServerConnection.ISettings;

  /**
   * List the running sessions.
   *
   * @returns A promise that resolves with the list of running session models.
   *
   * #### Notes
   * Uses the Jupyter Server API and validates the response model.
   *
   * The promise is fulfilled on a valid response and rejected otherwise.
   */
  listRunning(): Promise<IModel[]>;

  /**
   * Get a session model.
   *
   * @param id - The id of the session of interest.
   *
   * @returns A promise that resolves with the session model.
   *
   * #### Notes
   * Uses the Jupyter Server API and validates the response model.
   *
   * The promise is fulfilled on a valid response and rejected otherwise.
   */
  getModel(id: string): Promise<IModel>;

  /**
   * Create a new session.
   *
   * @param options - The options used to create the session.
   *
   * @returns A promise that resolves with the session model.
   *
   * #### Notes
   * Uses the Jupyter Server API and validates the response model.
   *
   * The promise is fulfilled on a valid response and rejected otherwise.
   */
  startNew(options: ISessionOptions): Promise<IModel>;

  /**
   * Shut down a session by id.
   *
   * @param id - The id of the session to shut down.
   *
   * @returns A promise that resolves when the session is shut down.
   *
   * #### Notes
   * Uses the Jupyter Server API and validates the response model.
   *
   * The promise is fulfilled on a valid response and rejected otherwise.
   */
  shutdown(id: string): Promise<void>;

  /**
   * Update a session by id.
   *
   * @param model - The session model to update.
   *
   * @returns A promise that resolves with the updated session model.
   *
   * #### Notes
   * Uses the Jupyter Server API and validates the response model.
   *
   * The promise is fulfilled on a valid response and rejected otherwise.
   */
  update(
    model: Pick<IModel, 'id'> & DeepPartial<Omit<IModel, 'id'>>
  ): Promise<IModel>;
}
