// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IIterator
} from '@phosphor/algorithm';

import {
  JSONObject
} from '@phosphor/coreutils';

import {
  IDisposable
} from '@phosphor/disposable';

import {
  ISignal
} from '@phosphor/signaling';

import {
  Kernel, KernelMessage
} from '../kernel';

import {
  IAjaxSettings
} from '../utils';

import {
  DefaultSession
} from './default';


/**
 * A namespace for session interfaces and factory functions.
 */
export
namespace Session {
  /**
   * Interface of a session object.
   */
  export
  interface ISession extends IDisposable {
    /**
     * A signal emitted when the session is shut down.
     */
    terminated: ISignal<ISession, void>;

    /**
     * A signal emitted when the kernel changes.
     */
    kernelChanged: ISignal<ISession, Kernel.IKernel>;

    /**
     * A signal emitted when the session status changes.
     */
    statusChanged: ISignal<ISession, Kernel.Status>;

    /**
     * A signal emitted when the session path changes.
     */
    pathChanged: ISignal<ISession, string>;

    /**
     * A signal emitted for iopub kernel messages.
     */
    iopubMessage: ISignal<ISession, KernelMessage.IIOPubMessage>;

    /**
     * A signal emitted for unhandled kernel message.
     */
    unhandledMessage: ISignal<ISession, KernelMessage.IMessage>;

    /**
     * Unique id of the session.
     */
    readonly id: string;

    /**
     * The path associated with the session.
     */
    readonly path: string;

    /**
     * The base url of the session.
     */
    readonly baseUrl: string;

    /**
     * The model associated with the session.
     */
    readonly model: Session.IModel;

    /**
     * The kernel.
     *
     * #### Notes
     * This is a read-only property, and can be altered by [changeKernel].
     * Use the [statusChanged] and [unhandledMessage] signals on the session
     * instead of the ones on the kernel.
     */
    readonly kernel: Kernel.IKernel;

    /**
     * The current status of the session.
     *
     * #### Notes
     * This is a delegate to the kernel status.
     */
    readonly status: Kernel.Status;

    /**
     * Optional default settings for ajax requests, if applicable.
     */
    ajaxSettings?: IAjaxSettings;

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
    rename(path: string): Promise<void>;

    /**
     * Change the kernel.
     *
     * @param options - The name or id of the new kernel.
     *
     * @returns A promise that resolves with the new kernel model.
     *
     * #### Notes
     * This shuts down the existing kernel and creates a new kernel,
     * keeping the existing session ID and path.
     */
    changeKernel(options: Kernel.IModel): Promise<Kernel.IKernel>;

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
   * List the running sessions.
   *
   * @param options - The options used for the request.
   *
   * @returns A promise that resolves with the list of session models.
   *
   * #### Notes
   * Uses the [Jupyter Notebook API](http://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter/notebook/master/notebook/services/api/api.yaml#!/sessions), and validates the response.
   *
   * All client-side sessions are updated with current information.
   *
   * The promise is fulfilled on a valid response and rejected otherwise.
   */
  export
  function listRunning(options?: Session.IOptions): Promise<Session.IModel[]> {
    return DefaultSession.listRunning(options);
  }

  /**
   * Start a new session.
   *
   * @param options - The options used to start the session.
   *
   * @returns A promise that resolves with the session instance.
   *
   * #### Notes
   * Uses the [Jupyter Notebook API](http://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter/notebook/master/notebook/services/api/api.yaml#!/sessions), and validates the response.
   *
   * A path must be provided.  If a kernel id is given, it will
   * connect to an existing kernel.  If no kernel id or name is given,
   * the server will start the default kernel type.
   *
   * The promise is fulfilled on a valid response and rejected otherwise.
   *
   * Wrap the result in an Session object. The promise is fulfilled
   * when the session is created on the server, otherwise the promise is
   * rejected.
   */
  export
  function startNew(options: Session.IOptions): Promise<ISession> {
    return DefaultSession.startNew(options);
  }

  /**
   * Find a session by id.
   *
   * @param id - The id of the target session.
   *
   * @param options - The options used to fetch the session.
   *
   * @returns A promise that resolves with the session model.
   *
   * #### Notes
   * If the session was already started via `startNew`, the existing
   * Session object's information is used in the fulfillment value.
   *
   * Otherwise, if `options` are given, we attempt to find to the existing
   * session.
   * The promise is fulfilled when the session is found,
   * otherwise the promise is rejected.
   */
  export
  function findById(id: string, options?: Session.IOptions): Promise<Session.IModel> {
    return DefaultSession.findById(id, options);
  }

  /**
   * Find a session by path.
   *
   * @param path - The path of the target session.
   *
   * @param options - The options used to fetch the session.
   *
   * @returns A promise that resolves with the session model.
   *
   * #### Notes
   * If the session was already started via `startNewSession`, the existing
   * Session object's info is used in the fulfillment value.
   *
   * Otherwise, if `options` are given, we attempt to find to the existing
   * session using [listRunningSessions].
   * The promise is fulfilled when the session is found,
   * otherwise the promise is rejected.
   *
   * If the session was not already started and no `options` are given,
   * the promise is rejected.
   */
  export
  function findByPath(path: string, options?: Session.IOptions): Promise<Session.IModel> {
    return DefaultSession.findByPath(path, options);
  }

  /**
   * Connect to a running session.
   *
   * @param id - The id of the target session.
   *
   * @param options - The options used to fetch the session.
   *
   * @returns A promise that resolves with the session instance.
   *
   * #### Notes
   * If the session was already started via `startNew`, the existing
   * Session object is used as the fulfillment value.
   *
   * Otherwise, if `options` are given, we attempt to connect to the existing
   * session.
   * The promise is fulfilled when the session is ready on the server,
   * otherwise the promise is rejected.
   *
   * If the session was not already started and no `options` are given,
   * the promise is rejected.
   */
  export
  function connectTo(id: string, options?: Session.IOptions): Promise<ISession> {
    return DefaultSession.connectTo(id, options);
  }

  /**
   * Shut down a session by id.
   *
   * @param id - The id of the target session.
   *
   * @param options - The options used to fetch the session.
   *
   * @returns A promise that resolves when the session is shut down.
   *
   */
  export
  function shutdown(id: string, options: Session.IOptions = {}): Promise<void> {
    return DefaultSession.shutdown(id, options);
  }

  /**
   * The session initialization options.
   */
  export
  interface IOptions extends JSONObject {
    /**
     * The path (not including name) to the session.
     */
    path?: string;

    /**
     * The type of kernel (e.g. python3).
     */
    kernelName?: string;

    /**
     * The id of an existing kernel.
     */
    kernelId?: string;

    /**
     * The root url of the server.
     */
    baseUrl?: string;

    /**
     * The url to access websockets.
     */
    wsUrl?: string;

    /**
     * The username of the session client.
     */
    username?: string;

    /**
     * The unique identifier for the session client.
     */
    clientId?: string;

    /**
     * The authentication token for the API.
     */
    token?: string;

    /**
     * The default ajax settings to use for the session.
     */
    ajaxSettings?: IAjaxSettings;
  }

  /**
   * Object which manages session instances.
   *
   * #### Notes
   * The manager is responsible for maintaining the state of running
   * sessions and the initial fetch of kernel specs.
   */
  export
  interface IManager extends IDisposable {
    /**
     * A signal emitted when the kernel specs change.
     */
    specsChanged: ISignal<IManager, Kernel.ISpecModels>;

    /**
     * A signal emitted when the running sessions change.
     */
    runningChanged: ISignal<IManager, IModel[]>;

    /**
     * The base url of the manager.
     */
    readonly baseUrl: string;

    /**
     * The base ws url of the manager.
     */
    readonly wsUrl: string;

    /**
     * The default ajax settings for the manager.
     */
    ajaxSettings?: IAjaxSettings;

    /**
     * The cached kernel specs.
     *
     * #### Notes
     * This value will be null until the manager is ready.
     */
    readonly specs: Kernel.ISpecModels | null;

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
    running(): IIterator<IModel>;

    /**
     * Start a new session.
     *
     * @param options - The session options to use.
     *
     * @returns A promise that resolves with the session instance.
     *
     * #### Notes
     * The baseUrl and wsUrl of the options will be forced
     * to the ones used by the manager. The ajaxSettings of the manager
     * will be used unless overridden.
     */
    startNew(options: IOptions): Promise<ISession>;

    /**
     * Find a session by id.
     *
     * @param id - The id of the target session.
     *
     * @returns A promise that resolves with the session's model.
     */
    findById(id: string): Promise<IModel>;

    /**
     * Find a session by path.
     *
     * @param path - The path of the target session.
     *
     * @returns A promise that resolves with the session's model.
     */
    findByPath(path: string): Promise<IModel>;

    /**
     * Connect to a running session.
     *
     * @param id - The id of the target session.
     *
     * @param options - The session options to use.
     *
     * @returns A promise that resolves with the new session instance.
     *
     * #### Notes
     * If options are given, the baseUrl and wsUrl will be forced
     * to the ones used by the manager.  The ajaxSettings of the manager
     * will be used unless overridden.
     */
    connectTo(id: string, options?: IOptions): Promise<ISession>;

    /**
     * Shut down a session by id.
     *
     * @param id - The id of the target kernel.
     *
     * @returns A promise that resolves when the operation is complete.
     */
    shutdown(id: string): Promise<void>;

    /**
     * Force a refresh of the specs from the server.
     *
     * @returns A promise that resolves when the specs are fetched.
     *
     * #### Notes
     * This is intended to be called only in response to a user action,
     * since the manager maintains its internal state.
     */
    refreshSpecs(): Promise<void>;

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
  }

  /**
   * The session model used by the server.
   *
   * #### Notes
   * See the [Jupyter Notebook API](http://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter/notebook/master/notebook/services/api/api.yaml#!/sessions).
   */
  export
  interface IModel extends JSONObject {
    /**
     * The unique identifier for the session client.
     */
    readonly id: string;
    readonly notebook?: {
      [ key: string ]: string;
      path: string;
    };
    readonly kernel?: Kernel.IModel;
  }
}
