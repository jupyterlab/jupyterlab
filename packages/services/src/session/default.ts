// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ArrayExt, each, find, toArray
} from '@phosphor/algorithm';

import {
  ISignal, Signal
} from '@phosphor/signaling';

import {
  Kernel, KernelMessage
} from '../kernel';

import {
  IAjaxSettings
} from '../utils';

import * as utils
  from '../utils';

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
    this._baseUrl = options.baseUrl || utils.getBaseUrl();
    this._uuid = utils.uuid();
    this._ajaxSettings = JSON.stringify(
      utils.ajaxSettingsWithToken(options.ajaxSettings || {}, options.token)
    );
    this._token = options.token || utils.getConfigOption('token');
    Private.runningSessions.push(this);
    this.setupKernel(kernel);
    this._options = utils.copy(options);
    this.terminated = new Signal<this, void>(this);
  }

  /**
   * A signal emitted when the session is shut down.
   */
  readonly terminated: Signal<this, void>;

  /**
   * A signal emitted when the kernel changes.
   */
  get kernelChanged(): ISignal<this, Kernel.IKernel> {
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
  get kernel() : Kernel.IKernel {
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
   * Get the base url of the session.
   */
  get baseUrl(): string {
    return this._baseUrl;
  }

  /**
   * Get a copy of the default ajax settings for the session.
   */
  get ajaxSettings(): IAjaxSettings {
    return JSON.parse(this._ajaxSettings);
  }

  /**
   * Set the default ajax settings for the session.
   */
  set ajaxSettings(value: IAjaxSettings) {
    this._ajaxSettings = JSON.stringify(value);
  }

  /**
   * Test whether the session has been disposed.
   */
  get isDisposed(): boolean {
    return this._options === null;
  }

  /**
   * Clone the current session with a new clientId.
   */
  clone(): Promise<Session.ISession> {
    let options = this._getKernelOptions();
    return Kernel.connectTo(this.kernel.id, options).then(kernel => {
      options = utils.copy(this._options);
      options.ajaxSettings = this.ajaxSettings;
      return new DefaultSession(options, this._id, kernel);
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
      let options = this._getKernelOptions();
      options.name = model.kernel.name;
      return Kernel.connectTo(model.kernel.id, options).then(kernel => {
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
    this._options = null;
    if (this._kernel) {
      this._kernel.dispose();
    }
    ArrayExt.removeFirstOf(Private.runningSessions, this);
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
  changeKernel(options: Kernel.IModel): Promise<Kernel.IKernel> {
    if (this.isDisposed) {
      return Promise.reject(new Error('Session is disposed'));
    }
    this._kernel.dispose();
    let data = JSON.stringify({ kernel: options });
    return this._patch(data).then(() => {
      return this.kernel;
    });
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
    return Private.shutdownSession(this.id, this._baseUrl, this.ajaxSettings);
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
   * Get the options used to create a new kernel.
   */
  private _getKernelOptions(): Kernel.IOptions {
    return {
      baseUrl: this._options.baseUrl,
      wsUrl: this._options.wsUrl,
      username: this.kernel.username,
      ajaxSettings: this.ajaxSettings
    };
  }

  /**
   * Send a PATCH to the server, updating the session path or the kernel.
   */
  private _patch(data: string): Promise<Session.IModel> {
    let url = Private.getSessionUrl(this._baseUrl, this._id);
    let ajaxSettings = this.ajaxSettings;
    ajaxSettings.method = 'PATCH';
    ajaxSettings.dataType = 'json';
    ajaxSettings.data = data;
    ajaxSettings.contentType = 'application/json';
    ajaxSettings.cache = false;
    this._updating = true;

    return utils.ajaxRequest(url, ajaxSettings).then(success => {
      this._updating = false;
      if (success.xhr.status !== 200) {
        throw utils.makeAjaxError(success);
      }
      let value = success.data as Session.IModel;
      try {
        validate.validateModel(value);
      } catch (err) {
        throw utils.makeAjaxError(success, err.message);
      }
      return Private.updateFromServer(value);
    }, error => {
      this._updating = false;
      return Private.onSessionError(error);
    });
  }

  private _id = '';
  private _path = '';
  private _ajaxSettings = '';
  private _token = '';
  private _kernel: Kernel.IKernel = null;
  private _uuid = '';
  private _baseUrl = '';
  private _options: Session.IOptions = null;
  private _updating = false;
  private _kernelChanged = new Signal<this, Kernel.IKernel>(this);
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
  function listRunning(options?: Session.IOptions): Promise<Session.IModel[]> {
    return Private.listRunning(options);
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
  function findById(id: string, options?: Session.IOptions): Promise<Session.IModel> {
    return Private.findById(id, options);
  }

  /**
   * Find a session by path.
   */
  export
  function findByPath(path: string, options?: Session.IOptions): Promise<Session.IModel> {
    return Private.findByPath(path, options);
  }

  /**
   * Connect to a running session.
   */
  export
  function connectTo(id: string, options?: Session.IOptions): Promise<Session.ISession> {
    return Private.connectTo(id, options);
  }

  /**
   * Shut down a session by id.
   */
  export
  function shutdown(id: string, options: Session.IOptions = {}): Promise<void> {
    return Private.shutdown(id, options);
  }
}


/**
 * A namespace for session private data.
 */
namespace Private {
  /**
   * The running sessions.
   */
  export
  const runningSessions: DefaultSession[] = [];

  /**
   * List the running sessions.
   */
  export
  function listRunning(options: Session.IOptions = {}): Promise<Session.IModel[]> {
    let baseUrl = options.baseUrl || utils.getBaseUrl();
    let url = utils.urlPathJoin(baseUrl, SESSION_SERVICE_URL);
    let ajaxSettings = utils.ajaxSettingsWithToken(options.ajaxSettings, options.token);
    ajaxSettings.method = 'GET';
    ajaxSettings.dataType = 'json';
    ajaxSettings.cache = false;

    return utils.ajaxRequest(url, ajaxSettings).then(success => {
      if (success.xhr.status !== 200) {
        throw utils.makeAjaxError(success);
      }
      let data = success.data as Session.IModel[];
      if (!Array.isArray(success.data)) {
        throw utils.makeAjaxError(success, 'Invalid Session list');
      }
      for (let i = 0; i < data.length; i++) {
        try {
          validate.validateModel(data[i]);
        } catch (err) {
          throw utils.makeAjaxError(success, err.message);
        }
      }
      return updateRunningSessions(data);
    }, Private.onSessionError);
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
   * Find a session by id.
   */
  export
  function findById(id: string, options: Session.IOptions = {}): Promise<Session.IModel> {
    let session = find(runningSessions, value => value.id === id);
    if (session) {
      return Promise.resolve(session.model);
    }

    return getSessionModel(id, options).catch(() => {
      let msg = `No running session for id: ${id}`;
      return typedThrow<Session.IModel>(msg);
    });
  }

  /**
   * Find a session by path.
   */
  export
  function findByPath(path: string, options: Session.IOptions = {}): Promise<Session.IModel> {
    let session = find(runningSessions, value => value.path === path);
    if (session) {
      return Promise.resolve(session.model);
    }

    return listRunning(options).then(models => {
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
   * Connect to a running session.
   */
  export
  function connectTo(id: string, options: Session.IOptions = {}): Promise<Session.ISession> {
    let session = find(runningSessions, value => value.id === id);
    if (session) {
      return Promise.resolve(session.clone());
    }

    return getSessionModel(id, options).then(model => {
      return createSession(model, options);
    }).catch(() => {
      let msg = `No running session with id: ${id}`;
      return typedThrow<Session.ISession>(msg);
    });
  }

  /**
   * Shut down a session by id.
   */
  export
  function shutdown(id: string, options: Session.IOptions = {}): Promise<void> {
    let baseUrl = options.baseUrl || utils.getBaseUrl();
    let ajaxSettings = utils.ajaxSettingsWithToken(options.ajaxSettings, options.token);
    return shutdownSession(id, baseUrl, ajaxSettings);
  }

  /**
   * Create a new session, or return an existing session if a session if
   * the session path already exists
   */
  export
  function startSession(options: Session.IOptions): Promise<Session.IModel> {
    let baseUrl = options.baseUrl || utils.getBaseUrl();
    let url = utils.urlPathJoin(baseUrl, SESSION_SERVICE_URL);
    let model = {
      kernel: { name: options.kernelName, id: options.kernelId },
      notebook: { path: options.path }
    };
    let ajaxSettings: IAjaxSettings = utils.ajaxSettingsWithToken(options.ajaxSettings, options.token);
    ajaxSettings.method = 'POST';
    ajaxSettings.dataType = 'json';
    ajaxSettings.data = JSON.stringify(model);
    ajaxSettings.contentType = 'application/json';
    ajaxSettings.cache = false;

    return utils.ajaxRequest(url, ajaxSettings).then(success => {
      if (success.xhr.status !== 201) {
        throw utils.makeAjaxError(success);
      }
      try {
        validate.validateModel(success.data);
      } catch (err) {
        throw utils.makeAjaxError(success, err.message);
      }
      let data = success.data as Session.IModel;
      return updateFromServer(data);
    }, onSessionError);
  }

  /**
   * Create a Promise for a kernel object given a session model and options.
   */
  function createKernel(options: Session.IOptions): Promise<Kernel.IKernel> {
    let kernelOptions: Kernel.IOptions = {
      name: options.kernelName,
      baseUrl: options.baseUrl || utils.getBaseUrl(),
      wsUrl: options.wsUrl,
      username: options.username,
      clientId: options.clientId,
      token: options.token,
      ajaxSettings: options.ajaxSettings
    };
    return Kernel.connectTo(options.kernelId, kernelOptions);
  }

  /**
   * Create a Session object.
   *
   * @returns - A promise that resolves with a started session.
   */
  export
  function createSession(model: Session.IModel, options: Session.IOptions): Promise<DefaultSession> {
    options.kernelName = model.kernel.name;
    options.kernelId = model.kernel.id;
    options.path = model.notebook.path;
    return createKernel(options).then(kernel => {
      return new DefaultSession(options, model.id, kernel);
    }).catch(error => {
      return typedThrow('Session failed to start: ' + error.message);
    });
  }

  /**
   * Get a full session model from the server by session id string.
   */
  export
  function getSessionModel(id: string, options?: Session.IOptions): Promise<Session.IModel> {
    options = options || {};
    let baseUrl = options.baseUrl || utils.getBaseUrl();
    let url = getSessionUrl(baseUrl, id);
    let ajaxSettings = utils.ajaxSettingsWithToken(options.ajaxSettings, options.token);
    ajaxSettings.method = 'GET';
    ajaxSettings.dataType = 'json';
    ajaxSettings.cache = false;

    return utils.ajaxRequest(url, ajaxSettings).then(success => {
      if (success.xhr.status !== 200) {
        throw utils.makeAjaxError(success);
      }
      let data = success.data as Session.IModel;
      try {
        validate.validateModel(data);
      } catch (err) {
        throw utils.makeAjaxError(success, err.message);
      }
      return updateFromServer(data);
    }, Private.onSessionError);
  }

  /**
   * Update the running sessions based on new data from the server.
   */
  export
  function updateRunningSessions(sessions: Session.IModel[]): Promise<Session.IModel[]> {
    let promises: Promise<void>[] = [];

    each(runningSessions, session => {
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

  /**
   * Update the running sessions given an updated session Id.
   */
  export
  function updateFromServer(model: Session.IModel): Promise<Session.IModel> {
    let promises: Promise<void>[] = [];
    each(runningSessions, session => {
      if (session.id === model.id) {
        promises.push(session.update(model));
      }
    });
    return Promise.all(promises).then(() => { return model; });
  }

  /**
   * Shut down a session by id.
   */
  export
  function shutdownSession(id: string, baseUrl: string, ajaxSettings: IAjaxSettings = {}): Promise<void> {
    let url = getSessionUrl(baseUrl, id);
    ajaxSettings.method = 'DELETE';
    ajaxSettings.dataType = 'json';
    ajaxSettings.cache = false;

    return utils.ajaxRequest(url, ajaxSettings).then(success => {
      if (success.xhr.status !== 204) {
        throw utils.makeAjaxError(success);
      }
      killSessions(id);
    }, err => {
      if (err.xhr.status === 404) {
        let response = JSON.parse(err.xhr.responseText) as any;
        console.warn(response['message']);
        killSessions(id);
        return;
      }
      if (err.xhr.status === 410) {
        err.throwError = 'The kernel was deleted but the session was not';
      }
      return onSessionError(err);
    });
  }

  /**
   * Kill the sessions by id.
   */
  function killSessions(id: string): void {
    each(toArray(runningSessions), session => {
      if (session.id === id) {
        session.terminated.emit(void 0);
        session.dispose();
      }
    });
  }

  /**
   * Get a session url.
   */
  export
  function getSessionUrl(baseUrl: string, id: string): string {
    return utils.urlPathJoin(baseUrl, SESSION_SERVICE_URL, id);
  }

  /**
   * Handle an error on a session Ajax call.
   */
  export
  function onSessionError(error: utils.IAjaxError): Promise<any> {
    let text = (error.throwError ||
                error.xhr.statusText ||
                error.xhr.responseText);
    let msg = `API request failed: ${text}`;
    console.error(msg);
    return Promise.reject(error);
  }

  /**
   * Throw a typed error.
   */
  export
  function typedThrow<T>(msg: string): T {
    throw new Error(msg);
  }
}
