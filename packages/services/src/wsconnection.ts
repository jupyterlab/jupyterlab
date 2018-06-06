// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  URLExt, uuid
} from '@jupyterlab/coreutils';

import {
  PromiseDelegate, ReadonlyJSONObject
} from '@phosphor/coreutils';

import {
  IDisposable
} from '@phosphor/disposable';

import {
  ISignal, Signal
} from '@phosphor/signaling';

import {
  ServerConnection
} from './serverconnection';


/**
 * A WebSocket connection object
 */
export
class WsConnection implements IDisposable {
  /**
   * Construct a WebSocket connection object.
   */
  constructor(options: WsConnection.IOptions) {
    this.serverSettings = options.serverSettings || ServerConnection.makeSettings();
    this._clientId = options.clientId || uuid();
    this._apiUrl = options.apiUrl || this._apiUrl;
    this._createSocket();
  }

  /**
   * A signal emitted when the kernel is shut down.
   */
  get terminated(): ISignal<this, void> {
    return this._terminated;
  }

  /**
   * The server settings for the kernel.
   */
  readonly serverSettings: ServerConnection.ISettings;

  /**
   * A signal emitted when the connection status changes.
   */
  get statusChanged(): ISignal<this, WsConnection.Status> {
    return this._statusChanged;
  }

  /**
   * The current status of the kernel.
   */
  get status(): WsConnection.Status {
    return this._status;
  }

  /**
   * The client unique id.
   */
  get clientId(): string {
    return this._clientId;
  }

  /**
   * Test whether the kernel has been disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Test whether the kernel is ready.
   */
  get isReady(): boolean {
    return this._isReady;
  }

  /**
   * A promise that is fulfilled when the kernel is ready.
   */
  get ready(): Promise<void> {
    return this._connectionPromise.promise;
  }

  /**
   * A signal emitted when a message is received.
   */
  get message(): ISignal<this, ReadonlyJSONObject> {
    return this._message;
  }

  /**
   * Dispose of the resources held by the kernel.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;
    this._terminated.emit(void 0);
    this._status = 'dead';
    this._clearState();
    this._clearSocket();
    Signal.clearData(this);
  }

  /**
   * Serialize a message.
   *
   * @param {ReadonlyJSONObject} msg The message to serialize.
   * @returns {string} The serialized message.
   */
  protected serialize(msg: ReadonlyJSONObject): string {
    return JSON.stringify(msg);
  }

  /**
   * Deserialize a message.
   *
   * @param {string} data The serialized message.
   * @returns {ReadonlyJSONObject} The deserialzied message.
   */
  protected deserialize(data: string | ArrayBuffer): ReadonlyJSONObject {
    if (typeof data === 'string') {
      return JSON.parse(data);
    } else {
      throw new Error('Cannot deserialize binary websocket.');
    }
  }

  /**
   * Send a shell message over the websocket.
   *
   * If the socket status is `dead`, this will throw an error.
   */
  sendWSMessage(msg: ReadonlyJSONObject): void {
    if (this.status === 'dead') {
      throw new Error('Connection is dead');
    }
    if (!this._isReady || !this._ws) {
      this._pendingMessages.push(msg);
    } else {
      this._ws.send(this.serialize(msg));
    }
  }

  /**
   * Reconnect to a disconnected kernel.
   *
   * #### Notes
   * Used when the websocket connection to the kernel is lost.
   */
  reconnect(): Promise<void> {
    this._clearSocket();
    this._updateStatus('reconnecting');
    this._createSocket();
    return this._connectionPromise.promise;
  }

  /**
   * Shutdown a kernel.
   *
   * #### Notes
   * Uses the [Jupyter Notebook API](http://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter/notebook/master/notebook/services/api/api.yaml#!/kernels).
   *
   * The promise is fulfilled on a valid response and rejected otherwise.
   *
   * On a valid response, closes the websocket and disposes of the kernel
   * object, and fulfills the promise.
   *
   * The promise will be rejected if the socket status is `dead`.
   */
  close(): void {
    if (this.status === 'dead') {
      throw new Error('Connection is dead');
    }
    this._clearState();
    this._clearSocket();
  }


  /**
   * Clear the socket state.
   */
  private _clearSocket(): void {
    this._wsStopped = true;
    this._isReady = false;
    if (this._ws !== null) {
      // Clear the websocket event handlers and the socket itself.
      this._ws.onopen = this._noOp;
      this._ws.onclose = this._noOp;
      this._ws.onerror = this._noOp;
      this._ws.onmessage = this._noOp;
      this._ws.close();
      this._ws = null;
    }
  }

  /**
   * Handle status iopub messages from the kernel.
   */
  private _updateStatus(status: WsConnection.Status): void {
    switch (status) {
    case 'connected':
      this._isReady = true;
      break;
    case 'reconnecting':
    case 'dead':
      this._isReady = false;
      break;
    default:
      console.error('invalid kernel status:', status);
      return;
    }
    if (status !== this._status) {
      this._status = status;
      this._statusChanged.emit(status);
      if (status === 'dead') {
        this.dispose();
      }
    }
    if (this._isReady) {
      this._sendPending();
    }
  }

  /**
   * Send pending messages to the kernel.
   */
  private _sendPending(): void {
    // We shift the message off the queue
    // after the message is sent so that if there is an exception,
    // the message is still pending.
    while (this._ws && this._pendingMessages.length > 0) {
      let msg = this.serialize(this._pendingMessages[0]);
      this._ws.send(msg);
      this._pendingMessages.shift();
    }
  }

  /**
   * Clear the internal state.
   */
  private _clearState(): void {
    this._isReady = false;
    this._pendingMessages = [];
    this._delegates.forEach((delegate) => {
      delegate.reject('Disposing of adaptor');
    });
    this._delegates = new Map<string, PromiseDelegate<ReadonlyJSONObject>>();
  }

  /**
   * Create the kernel websocket connection and add socket status handlers.
   */
  private _createSocket = () => {
    let settings = this.serverSettings;
    let partialUrl = URLExt.join(settings.wsUrl, this._apiUrl);

    // Strip any authentication from the display string.
    let display = partialUrl.replace(/^((?:\w+:)?\/\/)(?:[^@\/]+@)/, '$1');
    console.log('Starting WebSocket:', display);

    let url = URLExt.join(
      partialUrl,
      '?session_id=' + encodeURIComponent(this._clientId)
  );

    // If token authentication is in use.
    let token = settings.token;
    if (token !== '') {
      url = url + `&token=${encodeURIComponent(token)}`;
    }

    this._connectionPromise = new PromiseDelegate<void>();
    this._wsStopped = false;
    this._ws = new settings.WebSocket(url);

    // Ensure incoming binary messages are not Blobs
    this._ws.binaryType = 'arraybuffer';

    this._ws.onmessage = this._onWSMessage;
    this._ws.onopen = this._onWSOpen;
    this._ws.onclose = this._onWSClose;
    this._ws.onerror = this._onWSClose;
  }

  /**
   * Handle a websocket open event.
   */
  private _onWSOpen = (evt: Event) => {
    this._reconnectAttempt = 0;
    // Allow the message to get through.
    this._isReady = true;
    // Update our status to connected.
    this._updateStatus('connected');
    // Signaling that the socket is ready.
    this._connectionPromise.resolve(void 0);
  }

  /**
   * Handle a websocket message, validating and routing appropriately.
   */
  private _onWSMessage = (evt: MessageEvent) => {
    if (this._wsStopped) {
      // If the socket is being closed, ignore any messages
      return;
    }
    this._message.emit(this.deserialize(evt.data));
  }

  /**
   * Handle a websocket close event.
   */
  private _onWSClose = (evt: Event) => {
    if (this._wsStopped || !this._ws) {
      return;
    }
    // Clear the websocket event handlers and the socket itself.
    this._ws.onclose = this._noOp;
    this._ws.onerror = this._noOp;
    this._ws = null;

    if (this._reconnectAttempt < this._reconnectLimit) {
      this._updateStatus('reconnecting');
      let timeout = Math.pow(2, this._reconnectAttempt);
      console.error('Connection lost, reconnecting in ' + timeout + ' seconds.');
      setTimeout(this._createSocket, 1e3 * timeout);
      this._reconnectAttempt += 1;
    } else {
      this._updateStatus('dead');
      this._connectionPromise.reject(new Error('Could not establish connection'));
    }
  }

  private _status: WsConnection.Status = 'unknown';
  private _apiUrl = '';
  private _clientId = '';
  private _isDisposed = false;
  private _wsStopped = false;
  private _ws: WebSocket | null = null;
  private _reconnectLimit = 7;
  private _reconnectAttempt = 0;
  private _isReady = false;
  private _delegates: Map<string, PromiseDelegate<ReadonlyJSONObject>>;
  private _pendingMessages: ReadonlyJSONObject[] = [];
  private _connectionPromise: PromiseDelegate<void>;
  private _statusChanged = new Signal<this, WsConnection.Status>(this);
  private _message = new Signal<this, ReadonlyJSONObject>(this);
  private _terminated = new Signal<this, void>(this);
  private _noOp = () => { /* no-op */};
}


/**
 * The namespace for `WsConnection` statics.
 */
export
namespace WsConnection {

  /**
   * The options object used to initialize a websocket connection.
   */
  export
  interface IOptions {
    /**
     * The server settings for the websocket.
     */
    serverSettings?: ServerConnection.ISettings;

    /**
     * The session ID to use for the websocket.
     */
    clientId?: string;

    /**
     * The URL relative to settings.wsUrl to connect to.
     */
    apiUrl?: string;
  }

  export
  type Status = 'dead' | 'unknown' | 'connected' | 'reconnecting';
}
