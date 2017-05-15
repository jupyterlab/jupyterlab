// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

 import {
  URLExt, uuid
 } from '@jupyterlab/coreutils';

import {
  ArrayExt, each, find, toArray
} from '@phosphor/algorithm';

 import {
   JSONExt
 } from '@phosphor/coreutils';

import {
  ISignal, Signal
} from '@phosphor/signaling';

import {
  Kernel, KernelMessage
} from '../kernel';

import {
  ServerConnection
} from '..';

import {
  Session
} from './session';

import * as validate
  from './validate';


/**
 * The url for the session service.
 */
const SESSION_SERVICE_URL = 'api/sessions';


/**
 * Session object for accessing the session REST api. The session
 * should be used to start kernels and then shut them down -- for
 * all other operations, the kernel object should be used.
 */
export
class DefaultSession implements Session.ISession {
  /**
   * Construct a new session.
   */
  constructor(options: Session.IOptions, id: string, kernel: Kernel.IKernel) {
    this._id = id;
    this._path = options.path;
    this.serverSettings = options.serverSettings || ServerConnection.makeSettings();
    this._uuid = uuid();
    Private.addRunning(this);
    this.setupKernel(kernel);
    this.terminated = new Signal<this, void>(this);
  }

  /**
   * A signal emitted when the session is shut down.
   */
  readonly terminated: Signal<this, void>;

  /**
   * A signal emitted when the kernel changes.
   */
  get kernelChanged(): ISignal<this, Kernel.IKernelConnection> {
    return this._kernelChanged;
  }

  /**
   * A signal emitted when the kernel status changes.
   */
  get statusChanged(): ISignal<this, Kernel.Status> {
    return this._statusChanged;
  }

  /**
   * A signal emitted for a kernel messages.
   */
  get iopubMessage(): ISignal<this, KernelMessage.IMessage> {
    return this._iopubMessage;
  }

  /**
   * A signal emitted for an unhandled kernel message.
   */
  get unhandledMessage(): ISignal<this, KernelMessage.IMessage> {
    return this._unhandledMessage;
  }

  /**
   * A signal emitted when the session path changes.
   */
  get pathChanged(): ISignal<this, string> {
    return this._pathChanged;
  }

  /**
   * Get the session id.
   */
  get id(): string {
    return this._id;
  }

  /**
   * Get the session kernel object.
   *
   * #### Notes
   * This is a read-only property, and can be altered by [changeKernel].
   * Use the [statusChanged] and [unhandledMessage] signals on the session
   * instead of the ones on the kernel.
   */
  get kernel() : Kernel.IKernelConnection {
    return this._kernel;
  }

  /**
   * Get the session path.
   */
  get path(): string {
    return this._path;
  }

  /**
   * Get the model associated with the session.
   */
  get model(): Session.IModel {
    return {
      id: this.id,
      kernel: this.kernel.model,
      notebook: {
        path: this.path
      }
    };
  }

  /**
   * The current status of the session.
   *
   * #### Notes
   * This is a delegate to the kernel status.
   */
  get status(): Kernel.Status {
    return this._kernel ? this._kernel.status : 'dead';
  }

  /**
   * The server settings of the session.
   */
  readonly serverSettings: ServerConnection.ISettings;

  /**
   * Test whether the session has been disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed === true;
  }

  /**
   * Clone the current session with a new clientId.
   */
  clone(): Promise<Session.ISession> {
    return Kernel.connectTo(this.kernel.id, this.serverSettings).then(kernel => {
      return new DefaultSession({
        path: this._path,
        serverSettings: this.serverSettings
      }, this._id, kernel);
    });
  }

  /**
   * Update the session based on a session model from the server.
   */
  update(model: Session.IModel): Promise<void> {
    // Avoid a race condition if we are waiting for a REST call return.
    if (this._updating) {
      return Promise.resolve(void 0);
    }
    let oldPath = this._path;
    let newPath = this._path = model.notebook.path;

    if (this._kernel.isDisposed || model.kernel.id !== this._kernel.id) {
      return Kernel.connectTo(model.kernel.id, this.serverSettings).then(kernel => {
        this.setupKernel(kernel);
        this._kernelChanged.emit(kernel);
        if (oldPath !== newPath) {
          this._pathChanged.emit(newPath);
        }
      });
    } else if (oldPath !== newPath) {
      this._pathChanged.emit(newPath);
    }
    return Promise.resolve(void 0);
  }

  /**
   * Dispose of the resources held by the session.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;
    if (this._kernel) {
      this._kernel.dispose();
    }
    Private.removeRunning(this);
    this._kernel = null;
    Signal.clearData(this);
  }

  /**
   * Change the session path.
   *
   * @param path - The new session path.
   *
   * #### Notes
   * This uses the Jupyter REST API, and the response is validated.
   * The promise is fulfilled on a valid response and rejected otherwise.
   */
  rename(path: string): Promise<void> {
    if (this.isDisposed) {
      return Promise.reject(new Error('Session is disposed'));
    }
    let data = JSON.stringify({
      notebook: { path }
    });
    return this._patch(data).then(() => { return void 0; });
  }

  /**
   * Change the kernel.
   *
   * @params options - The name or id of the new kernel.
   *
   * #### Notes
   * This shuts down the existing kernel and creates a new kernel,
   * keeping the existing session ID and session path.
   */
  changeKernel(options: Kernel.IModel): Promise<Kernel.IKernelConnection> {
    if (this.isDisposed) {
      return Promise.reject(new Error('Session is disposed'));
    }
    let data = JSON.stringify({ kernel: options });
    if (this._kernel) {
      return this._kernel.ready.then(() => {
        this._kernel.dispose();
        return this._patch(data);
      }).then(() => this.kernel);
    }
    return this._patch(data).then(() => this.kernel);
  }

  /**
   * Kill the kernel and shutdown the session.
   *
   * @returns - The promise fulfilled on a valid response from the server.
   *
   * #### Notes
   * Uses the [Jupyter Notebook API](http://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter/notebook/master/notebook/services/api/api.yaml#!/sessions), and validates the response.
   * Emits a [sessionDied] signal on success.
   */
  shutdown(): Promise<void> {
    if (this.isDisposed) {
      return Promise.reject(new Error('Session is disposed'));
    }
    if (this._kernel) {
      return this._kernel.ready.then(() => {
        return Private.shutdownSession(
          this.id, this.serverSettings
        );
      });
    }
    return Private.shutdownSession(this.id, this.serverSettings);
  }

  /**
   * Handle connections to a kernel.
   */
  protected setupKernel(kernel: Kernel.IKernel): void {
    this._kernel = kernel;
    kernel.statusChanged.connect(this.onKernelStatus, this);
    kernel.unhandledMessage.connect(this.onUnhandledMessage, this);
    kernel.iopubMessage.connect(this.onIOPubMessage, this);
  }

  /**
   * Handle to changes in the Kernel status.
   */
  protected onKernelStatus(sender: Kernel.IKernel, state: Kernel.Status) {
    this._statusChanged.emit(state);
  }

  /**
   * Handle iopub kernel messages.
   */
  protected onIOPubMessage(sender: Kernel.IKernel, msg: KernelMessage.IIOPubMessage) {
    this._iopubMessage.emit(msg);
  }

  /**
   * Handle unhandled kernel messages.
   */
  protected onUnhandledMessage(sender: Kernel.IKernel, msg: KernelMessage.IMessage) {
    this._unhandledMessage.emit(msg);
  }

  /**
   * Send a PATCH to the server, updating the session path or the kernel.
   */
  private _patch(data: string): Promise<Session.IModel> {
    this._updating = true;
    let settings = this.serverSettings;
    let request = {
      url: Private.getSessionUrl(settings.baseUrl, this._id),
      method: 'PATCH',
      data,
      cache: false
    };
    return ServerConnection.makeRequest(request, settings).then(success => {
      this._updating = false;
      if (success.xhr.status !== 200) {
        throw ServerConnection.makeError(success);
      }
      let value = success.data as Session.IModel;
      try {
        validate.validateModel(value);
      } catch (err) {
        throw ServerConnection.makeError(success, err.message);
      }
      return Private.updateFromServer(value, settings.baseUrl);
    }, error => {
      this._updating = false;
      return Private.onSessionError(error);
    });
  }

  private _id = '';
  private _path = '';
  private _kernel: Kernel.IKernel = null;
  private _uuid = '';
  private _isDisposed = false;
  private _updating = false;
  private _kernelChanged = new Signal<this, Kernel.IKernelConnection>(this);
  private _statusChanged = new Signal<this, Kernel.Status>(this);
  private _iopubMessage = new Signal<this, KernelMessage.IMessage>(this);
  private _unhandledMessage = new Signal<this, KernelMessage.IMessage>(this);
  private _pathChanged = new Signal<this, string>(this);
}

/**
 * The namespace for `DefaultSession` statics.
 */
export
namespace DefaultSession {
  /**
   * List the running sessions.
   */
  export
  function listRunning(settings?: ServerConnection.ISettings): Promise<Session.IModel[]> {
    return Private.listRunning(settings);
  }

  /**
   * Start a new session.
   */
  export
  function startNew(options: Session.IOptions): Promise<Session.ISession> {
    return Private.startNew(options);
  }

  /**
   * Find a session by id.
   */
  export
  function findById(id: string, settings?: ServerConnection.ISettings): Promise<Session.IModel> {
    return Private.findById(id, settings);
  }

  /**
   * Find a session by path.
   */
  export
  function findByPath(path: string, settings?: ServerConnection.ISettings): Promise<Session.IModel> {
    return Private.findByPath(path, settings);
  }

  /**
   * Connect to a running session.
   */
  export
  function connectTo(id: string, settings?: ServerConnection.ISettings): Promise<Session.ISession> {
    return Private.connectTo(id, settings);
  }

  /**
   * Shut down a session by id.
   */
  export
  function shutdown(id: string, settings?: ServerConnection.ISettings): Promise<void> {
    return Private.shutdownSession(id, settings);
  }
}


/**
 * A namespace for session private data.
 */
namespace Private {
  /**
   * The running sessions mapped by base url.
   */
  const runningSessions = new Map<string, DefaultSession[]>();

  /**
   * Add a session to the running sessions.
   */
  export
  function addRunning(session: DefaultSession): void {
    let running: DefaultSession[] = (
      runningSessions.get(session.serverSettings.baseUrl) || []
    );
    running.push(session);
    runningSessions.set(session.serverSettings.baseUrl, running);
  }

  /**
   * Remove a session from the running sessions.
   */
  export
  function removeRunning(session: DefaultSession): void {
    let running = runningSessions.get(session.serverSettings.baseUrl);
    ArrayExt.removeFirstOf(running, session);
  }

  /**
   * Connect to a running session.
   */
  export
  function connectTo(id: string, settings?: ServerConnection.ISettings): Promise<Session.ISession> {
    settings = settings || ServerConnection.makeSettings();
    let running = runningSessions.get(settings.baseUrl) || [];
    let session = find(running, value => value.id === id);
    if (session) {
      return Promise.resolve(session.clone());
    }
    return getSessionModel(id, settings).then(model => {
      return createSession(model, settings);
    }).catch(() => {
      let msg = `No running session with id: ${id}`;
      return typedThrow<Session.ISession>(msg);
    });
  }

  /**
   * Create a Session object.
   *
   * @returns - A promise that resolves with a started session.
   */
  export
  function createSession(model: Session.IModel, options: Session.IOptions): Promise<DefaultSession> {
    let settings = options.serverSettings || ServerConnection.makeSettings();
    return Kernel.connectTo(model.kernel.id, settings).then(kernel => {
      return new DefaultSession({
        path: model.notebook.path,
        serverSettings: settings
      }, model.id, kernel);
    }).catch(error => {
      return typedThrow('Session failed to start: ' + error.message);
    });
  }

  /**
   * Find a session by id.
   */
  export
  function findById(id: string, settings?: ServerConnection.ISettings): Promise<Session.IModel> {
    settings = settings || ServerConnection.makeSettings();
    let running = runningSessions.get(settings.baseUrl) || [];
    let session = find(running, value => value.id === id);
    if (session) {
      return Promise.resolve(session.model);
    }

    return getSessionModel(id, settings).catch(() => {
      let msg = `No running session for id: ${id}`;
      return typedThrow<Session.IModel>(msg);
    });
  }

  /**
   * Find a session by path.
   */
  export
  function findByPath(path: string, settings?: ServerConnection.ISettings): Promise<Session.IModel> {
    settings = settings || ServerConnection.makeSettings();
    let running = runningSessions.get(settings.baseUrl) || [];
    let session = find(running, value => value.path === path);
    if (session) {
      return Promise.resolve(session.model);
    }

    return listRunning(settings).then(models => {
      let model = find(models, value => {
        return value.notebook.path === path;
      });
      if (model) {
        return model;
      }
      let msg = `No running session for path: ${path}`;
      return typedThrow<Session.IModel>(msg);
    });
  }

  /**
   * Get a full session model from the server by session id string.
   */
  export
  function getSessionModel(id: string, settings?: ServerConnection.ISettings): Promise<Session.IModel> {
    settings = settings || ServerConnection.makeSettings();
    let request = {
      url: getSessionUrl(settings.baseUrl, id),
      method: 'GET',
      cache: false
    };
    return ServerConnection.makeRequest(request, settings).then(success => {
      if (success.xhr.status !== 200) {
        throw ServerConnection.makeError(success);
      }
      let data = success.data as Session.IModel;
      try {
        validate.validateModel(data);
      } catch (err) {
        throw ServerConnection.makeError(success, err.message);
      }
      return updateFromServer(data, settings.baseUrl);
    }, Private.onSessionError);
  }

  /**
   * Get a session url.
   */
  export
  function getSessionUrl(baseUrl: string, id: string): string {
    return URLExt.join(baseUrl, SESSION_SERVICE_URL, id);
  }

  /**
   * Kill the sessions by id.
   */
  function killSessions(id: string, baseUrl: string): void {
    let running = runningSessions.get(baseUrl) || [];
    each(running.slice(), session => {
      if (session.id === id) {
        session.terminated.emit(void 0);
        session.dispose();
      }
    });
  }

  /**
   * List the running sessions.
   */
  export
  function listRunning(settings?: ServerConnection.ISettings): Promise<Session.IModel[]> {
    settings = settings || ServerConnection.makeSettings();
    let request = {
      url: URLExt.join(settings.baseUrl, SESSION_SERVICE_URL),
      method: 'GET',
      cache: false
    };
    return ServerConnection.makeRequest(request, settings).then(success => {
      if (success.xhr.status !== 200) {
        throw ServerConnection.makeError(success);
      }
      let data = success.data as Session.IModel[];
      if (!Array.isArray(success.data)) {
        throw ServerConnection.makeError(success, 'Invalid Session list');
      }
      for (let i = 0; i < data.length; i++) {
        try {
          validate.validateModel(data[i]);
        } catch (err) {
          throw ServerConnection.makeError(success, err.message);
        }
      }
      return updateRunningSessions(data, settings.baseUrl);
    }, Private.onSessionError);
  }

  /**
   * Handle an error on a session Ajax call.
   */
  export
  function onSessionError(error: ServerConnection.IError): Promise<any> {
    let text = (error.message ||
                error.xhr.statusText ||
                error.xhr.responseText);
    let msg = `API request failed: ${text}`;
    console.error(msg);
    return Promise.reject(error);
  }

  /**
   * Shut down a session by id.
   */
  export
  function shutdownSession(id: string, settings?: ServerConnection.ISettings): Promise<void> {
    settings = settings || ServerConnection.makeSettings();
    let request = {
      url: getSessionUrl(settings.baseUrl, id),
      method: 'DELETE',
      cache: false
    };

    return ServerConnection.makeRequest(request, settings).then(success => {
      if (success.xhr.status !== 204) {
        throw ServerConnection.makeError(success);
      }
      killSessions(id, settings.baseUrl);
    }, err => {
      if (err.xhr.status === 404) {
        let response = JSON.parse(err.xhr.responseText) as any;
        console.warn(response['message']);
        killSessions(id, settings.baseUrl);
        return;
      }
      if (err.xhr.status === 410) {
        err.message = 'The kernel was deleted but the session was not';
      }
      return onSessionError(err);
    });
  }

  /**
   * Start a new session.
   */
  export
  function startNew(options: Session.IOptions): Promise<Session.ISession> {
    if (options.path === void 0) {
      return Promise.reject(new Error('Must specify a path'));
    }
    return startSession(options).then(model => {
      return createSession(model, options);
    });
  }

  /**
   * Create a new session, or return an existing session if a session if
   * the session path already exists
   */
  export
  function startSession(options: Session.IOptions): Promise<Session.IModel> {
    let settings = options.serverSettings || ServerConnection.makeSettings();
    let model = {
      kernel: { name: options.kernelName, id: options.kernelId },
      notebook: { path: options.path }
    };
    let request = {
      url: URLExt.join(settings.baseUrl, SESSION_SERVICE_URL),
      method: 'POST',
      cache: false,
      data: JSON.stringify(model)
    };
    return ServerConnection.makeRequest(request, settings).then(success => {
      if (success.xhr.status !== 201) {
        throw ServerConnection.makeError(success);
      }
      try {
        validate.validateModel(success.data);
      } catch (err) {
        throw ServerConnection.makeError(success, err.message);
      }
      let data = success.data as Session.IModel;
      return updateFromServer(data, settings.baseUrl);
    }, onSessionError);
  }

  /**
   * Throw a typed error.
   */
  export
  function typedThrow<T>(msg: string): T {
    throw new Error(msg);
  }

  /**
   * Update the running sessions given an updated session Id.
   */
  export
  function updateFromServer(model: Session.IModel, baseUrl: string): Promise<Session.IModel> {
    let promises: Promise<void>[] = [];
    let running = runningSessions.get(baseUrl) || [];
    each(running.slice(), session => {
      if (session.id === model.id) {
        promises.push(session.update(model));
      }
    });
    return Promise.all(promises).then(() => { return model; });
  }

  /**
   * Update the running sessions based on new data from the server.
   */
  export
  function updateRunningSessions(sessions: Session.IModel[], baseUrl: string): Promise<Session.IModel[]> {
    let promises: Promise<void>[] = [];
    let running = runningSessions.get(baseUrl) || [];
    each(running.slice(), session => {
      let updated = find(sessions, sId => {
        if (session.id === sId.id) {
          promises.push(session.update(sId));
          return true;
        }
      });
      // If session is no longer running on disk, emit dead signal.
      if (!updated && session.status !== 'dead') {
        session.terminated.emit(void 0);
      }
    });
    return Promise.all(promises).then(() => { return sessions; });
  }
}
