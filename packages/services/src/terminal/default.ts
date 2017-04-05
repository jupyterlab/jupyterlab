// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ArrayExt, each, map, toArray
} from '@phosphor/algorithm';

import {
  JSONPrimitive
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
 * The url for the terminal service.
 */
const TERMINAL_SERVICE_URL = 'api/terminals';


/**
 * An implementation of a terminal interface.
 */
export
class DefaultTerminalSession implements TerminalSession.ISession {
  /**
   * Construct a new terminal session.
   */
  constructor(name: string, options: TerminalSession.IOptions = {}) {
    this._name = name;
    this._baseUrl = options.baseUrl || utils.getBaseUrl();
    this._token = options.token || utils.getConfigOption('token');
    this._ajaxSettings = JSON.stringify(
      utils.ajaxSettingsWithToken(options.ajaxSettings, this._token)
    );
    this._wsUrl = options.wsUrl || utils.getWsUrl(this._baseUrl);
    this._readyPromise = this._initializeSocket();
    this.terminated = new Signal<this, void>(this);
  }

  /**
   * A signal emitted when the session is shut down.
   */
  readonly terminated: Signal<this, void>;

  /**
   * A signal emitted when a message is received from the server.
   */
  get messageReceived(): ISignal<this, TerminalSession.IMessage> {
    return this._messageReceived;
  }

  /**
   * Get the name of the terminal session.
   */
  get name(): string {
    return this._name;
  }

  /**
   * Get the model for the terminal session.
   */
  get model(): TerminalSession.IModel {
    return { name: this._name };
  }

  /**
   * The base url of the terminal.
   */
  get baseUrl(): string {
    return this._baseUrl;
  }

  /**
   * Get a copy of the default ajax settings for the terminal.
   */
  get ajaxSettings(): IAjaxSettings {
    return JSON.parse(this._ajaxSettings);
  }

  /**
   * Set the default ajax settings for the terminal.
   */
  set ajaxSettings(value: IAjaxSettings) {
    this._ajaxSettings = JSON.stringify(value);
  }

  /**
   * Test whether the session is ready.
   */
  get isReady(): boolean {
    return this._isReady;
  }

  /**
   * A promise that fulfills when the session is ready.
   */
  get ready(): Promise<void> {
    return this._readyPromise;
  }

  /**
   * Test whether the session is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Dispose of the resources held by the session.
   */
  dispose(): void {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    if (this._ws) {
      this._ws.close();
      this._ws = null;
    }
    delete Private.running[this._url];
    this._readyPromise = null;
    Signal.clearData(this);
  }

  /**
   * Send a message to the terminal session.
   */
  send(message: TerminalSession.IMessage): void {
    if (this._isDisposed) {
      return;
    }

    let msg: JSONPrimitive[] = [message.type];
    msg.push(...message.content);
    let value = JSON.stringify(msg);
    if (this._isReady) {
      this._ws.send(value);
      return;
    }
    this.ready.then(() => {
      this._ws.send(value);
    });
  }

  /**
   * Reconnect to the terminal.
   *
   * @returns A promise that resolves when the terminal has reconnected.
   */
  reconnect(): Promise<void> {
    this._readyPromise = this._initializeSocket();
    return this._readyPromise;
  }

  /**
   * Shut down the terminal session.
   */
  shutdown(): Promise<void> {
    let options = {
      baseUrl: this._baseUrl,
      ajaxSettings: this.ajaxSettings
    };
    return DefaultTerminalSession.shutdown(this.name, options);
  }

  /**
   * Connect to the websocket.
   */
  private _initializeSocket(): Promise<void> {
    let name = this._name;
    if (this._ws) {
      this._ws.close();
    }
    this._isReady = false;
    this._url = Private.getTermUrl(this._baseUrl, this._name);
    Private.running[this._url] = this;
    let wsUrl = utils.urlPathJoin(this._wsUrl, `terminals/websocket/${name}`);
    if (this._token) {
      wsUrl = wsUrl + `?token=${this._token}`;
    }
    this._ws = new WebSocket(wsUrl);

    this._ws.onmessage = (event: MessageEvent) => {
      if (this._isDisposed) {
        return;
      }

      let data = JSON.parse(event.data) as JSONPrimitive[];
      this._messageReceived.emit({
        type: data[0] as TerminalSession.MessageType,
        content: data.slice(1)
      });
    };

    return new Promise<void>((resolve, reject) => {
      this._ws.onopen = (event: MessageEvent) => {
        if (this._isDisposed) {
          return;
        }
        this._isReady = true;
        resolve(void 0);
      };
      this._ws.onerror = (event: Event) => {
        if (this._isDisposed) {
          return;
        }
        reject(event);
      };
    });
  }

  private _name: string;
  private _baseUrl: string;
  private _wsUrl: string;
  private _url: string;
  private _token = '';
  private _ajaxSettings = '';
  private _ws: WebSocket = null;
  private _isDisposed = false;
  private _readyPromise: Promise<void>;
  private _isReady = false;
  private _messageReceived = new Signal<this, TerminalSession.IMessage>(this);
}


/**
 * The static namespace for `DefaultTerminalSession`.
 */
export
namespace DefaultTerminalSession {
  /**
   * Whether the terminal service is available.
   */
  export
  function isAvailable(): boolean {
    let available = String(utils.getConfigOption('terminalsAvailable'));
    return available.toLowerCase() === 'true';
  }

  /**
   * Start a new terminal session.
   *
   * @options - The session options to use.
   *
   * @returns A promise that resolves with the session instance.
   */
  export
  function startNew(options: TerminalSession.IOptions = {}): Promise<TerminalSession.ISession> {
    if (!TerminalSession.isAvailable()) {
      throw Private.unavailableMsg;
    }
    let baseUrl = options.baseUrl || utils.getBaseUrl();
    let url = Private.getBaseUrl(baseUrl);
    let ajaxSettings = utils.ajaxSettingsWithToken(options.ajaxSettings, options.token);
    ajaxSettings.method = 'POST';
    ajaxSettings.dataType = 'json';

    return utils.ajaxRequest(url, ajaxSettings).then(success => {
      if (success.xhr.status !== 200) {
        throw utils.makeAjaxError(success);
      }
      let name = (success.data as TerminalSession.IModel).name;
      return new DefaultTerminalSession(name, options);
    });
  }

  /*
   * Connect to a running session.
   *
   * @param name - The name of the target session.
   *
   * @param options - The session options to use.
   *
   * @returns A promise that resolves with the new session instance.
   *
   * #### Notes
   * If the session was already started via `startNew`, the existing
   * session object is used as the fulfillment value.
   *
   * Otherwise, if `options` are given, we resolve the promise after
   * confirming that the session exists on the server.
   *
   * If the session does not exist on the server, the promise is rejected.
   */
  export
  function connectTo(name: string, options: TerminalSession.IOptions = {}): Promise<TerminalSession.ISession> {
    if (!TerminalSession.isAvailable()) {
      return Promise.reject(Private.unavailableMsg);
    }
    let baseUrl = options.baseUrl || utils.getBaseUrl();
    let url = Private.getTermUrl(baseUrl, name);
    if (url in Private.running) {
      return Promise.resolve(Private.running[url]);
    }
    return listRunning(options).then(models => {
      let index = ArrayExt.findFirstIndex(models, model => {
        return model.name === name;
      });
      if (index !== -1) {
        let session = new DefaultTerminalSession(name, options);
        return Promise.resolve(session);
      }
      return Promise.reject<TerminalSession.ISession>('Could not find session');
    });
  }

  /**
   * List the running terminal sessions.
   *
   * @param options - The session options to use.
   *
   * @returns A promise that resolves with the list of running session models.
   */
  export
  function listRunning(options: TerminalSession.IOptions = {}): Promise<TerminalSession.IModel[]> {
    if (!TerminalSession.isAvailable()) {
      return Promise.reject(Private.unavailableMsg);
    }
    let url = Private.getBaseUrl(options.baseUrl);
    let ajaxSettings = utils.ajaxSettingsWithToken(options.ajaxSettings, options.token);
    ajaxSettings.method = 'GET';
    ajaxSettings.dataType = 'json';

    return utils.ajaxRequest(url, ajaxSettings).then(success => {
      if (success.xhr.status !== 200) {
        throw utils.makeAjaxError(success);
      }
      let data = success.data as TerminalSession.IModel[];
      if (!Array.isArray(data)) {
        throw utils.makeAjaxError(success, 'Invalid terminal data');
      }
      // Update the local data store.
      let urls = toArray(map(data, item => {
          return utils.urlPathJoin(url, item.name);
      }));
      each(Object.keys(Private.running), runningUrl => {
        if (urls.indexOf(runningUrl) === -1) {
          let session = Private.running[runningUrl];
          session.terminated.emit(void 0);
          session.dispose();
        }
      });
      return data;
    });
  }

  /**
   * Shut down a terminal session by name.
   *
   * @param name - The name of the target session.
   *
   * @param options - The session options to use.
   *
   * @returns A promise that resolves when the session is shut down.
   */
  export
  function shutdown(name: string, options: TerminalSession.IOptions = {}): Promise<void> {
    if (!TerminalSession.isAvailable()) {
      return Promise.reject(Private.unavailableMsg);
    }
    let url = Private.getTermUrl(options.baseUrl, name);
    let ajaxSettings = utils.ajaxSettingsWithToken(options.ajaxSettings, options.token);
    ajaxSettings.method = 'DELETE';
    return utils.ajaxRequest(url, ajaxSettings).then(success => {
      if (success.xhr.status !== 204) {
        throw utils.makeAjaxError(success);
      }
      Private.killTerminal(url);
    }, err => {
      if (err.xhr.status === 404) {
        let response = JSON.parse(err.xhr.responseText) as any;
        console.warn(response['message']);
        Private.killTerminal(url);
        return;
      }
      return Promise.reject(err);
    });
  }

}


/**
 * A namespace for private data.
 */
namespace Private {
  /**
   * A mapping of running terminals by url.
   */
  export
  const running: { [key: string]: DefaultTerminalSession } = Object.create(null);

  /**
   * A promise returned for when terminals are unavailable.
   */
  export
  const unavailableMsg = 'Terminals Unavailable';

  /**
   * Get the url for a terminal.
   */
  export
  function getTermUrl(baseUrl: string, name: string): string {
    return utils.urlPathJoin(baseUrl, TERMINAL_SERVICE_URL, name);
  }

  /**
   * Get the base url.
   */
  export
  function getBaseUrl(baseUrl: string): string {
    return utils.urlPathJoin(baseUrl, TERMINAL_SERVICE_URL);
  }

  /**
   * Kill a terminal by url.
   */
  export
  function killTerminal(url: string): void {
    // Update the local data store.
    if (Private.running[url]) {
      let session = Private.running[url];
      session.terminated.emit(void 0);
      session.dispose();
    }
  }
}
