// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { URLExt } from '@jupyterlab/coreutils';

import { JSONPrimitive, PromiseDelegate } from '@lumino/coreutils';

import { ISignal, Signal } from '@lumino/signaling';

import { ServerConnection } from '..';

import * as Terminal from './terminal';
import { TerminalAPIClient } from './restapi';

/**
 * An implementation of a terminal interface.
 */
export class TerminalConnection implements Terminal.ITerminalConnection {
  /**
   * Construct a new terminal session.
   */
  constructor(options: Terminal.ITerminalConnection.IOptions) {
    this._name = options.model.name;
    this.serverSettings =
      options.serverSettings ?? ServerConnection.makeSettings();
    this._terminalAPIClient =
      options.terminalAPIClient ??
      new TerminalAPIClient({ serverSettings: this.serverSettings });
    this._createSocket();
  }

  /**
   * A signal emitted when the session is disposed.
   */
  get disposed(): ISignal<this, void> {
    return this._disposed;
  }

  /**
   * A signal emitted when a message is received from the server.
   */
  get messageReceived(): ISignal<this, Terminal.IMessage> {
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
  get model(): Terminal.IModel {
    return { name: this._name };
  }

  /**
   * The server settings for the session.
   */
  readonly serverSettings: ServerConnection.ISettings;

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
    this._disposed.emit();

    this._updateConnectionStatus('disconnected');
    this._clearSocket();

    Signal.clearData(this);
  }

  /**
   * Send a message to the terminal session.
   *
   * #### Notes
   * If the connection is down, the message will be queued for sending when
   * the connection comes back up.
   */
  send(message: Terminal.IMessage): void {
    this._sendMessage(message);
  }

  /**
   * Send a message on the websocket, or possibly queue for later sending.
   *
   * @param queue - whether to queue the message if it cannot be sent
   */
  _sendMessage(message: Terminal.IMessage, queue = true): void {
    if (this._isDisposed || !message.content) {
      return;
    }
    if (this.connectionStatus === 'connected' && this._ws) {
      const msg = [message.type, ...message.content];
      this._ws.send(JSON.stringify(msg));
    } else if (queue) {
      this._pendingMessages.push(message);
    } else {
      throw new Error(`Could not send message: ${JSON.stringify(message)}`);
    }
  }

  /**
   * Send pending messages to the kernel.
   */
  private _sendPending(): void {
    // We check to make sure we are still connected each time. For
    // example, if a websocket buffer overflows, it may close, so we should
    // stop sending messages.
    while (
      this.connectionStatus === 'connected' &&
      this._pendingMessages.length > 0
    ) {
      this._sendMessage(this._pendingMessages[0], false);

      // We shift the message off the queue after the message is sent so that
      // if there is an exception, the message is still pending.
      this._pendingMessages.shift();
    }
  }

  /**
   * Reconnect to a terminal.
   *
   * #### Notes
   * This may try multiple times to reconnect to a terminal, and will sever
   * any existing connection.
   */
  reconnect(): Promise<void> {
    this._errorIfDisposed();
    const result = new PromiseDelegate<void>();

    // Set up a listener for the connection status changing, which accepts or
    // rejects after the retries are done.
    const fulfill = (sender: this, status: Terminal.ConnectionStatus) => {
      if (status === 'connected') {
        result.resolve();
        this.connectionStatusChanged.disconnect(fulfill, this);
      } else if (status === 'disconnected') {
        result.reject(new Error('Terminal connection disconnected'));
        this.connectionStatusChanged.disconnect(fulfill, this);
      }
    };
    this.connectionStatusChanged.connect(fulfill, this);

    // Reset the reconnect limit so we start the connection attempts fresh
    this._reconnectAttempt = 0;

    // Start the reconnection process, which will also clear any existing
    // connection.
    this._reconnect();

    // Return the promise that should resolve on connection or reject if the
    // retries don't work.
    return result.promise;
  }

  /**
   * Attempt a connection if we have not exhausted connection attempts.
   */
  _reconnect(): void {
    this._errorIfDisposed();

    // Clear any existing reconnection attempt
    clearTimeout(this._reconnectTimeout);

    // Update the connection status and schedule a possible reconnection.
    if (this._reconnectAttempt < this._reconnectLimit) {
      this._updateConnectionStatus('connecting');

      // The first reconnect attempt should happen immediately, and subsequent
      // attempts should pick a random number in a growing range so that we
      // don't overload the server with synchronized reconnection attempts
      // across multiple kernels.
      const timeout = Private.getRandomIntInclusive(
        0,
        1e3 * (Math.pow(2, this._reconnectAttempt) - 1)
      );
      console.error(
        `Connection lost, reconnecting in ${Math.floor(
          timeout / 1000
        )} seconds.`
      );
      this._reconnectTimeout = setTimeout(this._createSocket, timeout);
      this._reconnectAttempt += 1;
    } else {
      this._updateConnectionStatus('disconnected');
    }

    // Clear the websocket event handlers and the socket itself.
    this._clearSocket();
  }

  /**
   * Forcefully clear the socket state.
   *
   * #### Notes
   * This will clear all socket state without calling any handlers and will
   * not update the connection status. If you call this method, you are
   * responsible for updating the connection status as needed and recreating
   * the socket if you plan to reconnect.
   */
  private _clearSocket(): void {
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
   * Shut down the terminal session.
   */
  async shutdown(): Promise<void> {
    await this._terminalAPIClient.shutdown(this.name);
    this.dispose();
  }

  /**
   * Clone the current terminal connection.
   */
  clone(): Terminal.ITerminalConnection {
    return new TerminalConnection({
      model: this.model,
      serverSettings: this.serverSettings,
      terminalAPIClient: this._terminalAPIClient
    });
  }

  /**
   * Create the terminal websocket connection and add socket status handlers.
   *
   * #### Notes
   * You are responsible for updating the connection status as appropriate.
   */
  private _createSocket = () => {
    this._errorIfDisposed();

    // Make sure the socket is clear
    this._clearSocket();

    // Update the connection status to reflect opening a new connection.
    this._updateConnectionStatus('connecting');

    const name = this._name;
    const settings = this.serverSettings;

    let url = URLExt.join(
      settings.wsUrl,
      'terminals',
      'websocket',
      encodeURIComponent(name)
    );

    // If token authentication is in use.
    const token = settings.token;
    if (settings.appendToken && token !== '') {
      url = url + `?token=${encodeURIComponent(token)}`;
    }

    this._ws = new settings.WebSocket(url);

    this._ws.onmessage = this._onWSMessage;
    this._ws.onclose = this._onWSClose;
    this._ws.onerror = this._onWSClose;
  };

  // Websocket messages events are defined as variables to bind `this`
  private _onWSMessage = (event: MessageEvent) => {
    if (this._isDisposed) {
      return;
    }
    const data = JSON.parse(event.data) as JSONPrimitive[];

    // Handle a disconnect message.
    if (data[0] === 'disconnect') {
      this.dispose();
    }

    if (this._connectionStatus === 'connecting') {
      // After reconnection, ignore all messages until a 'setup' message
      // before we are truly connected. Setting the connection status to
      // connected only then means that if we do not get a setup message
      // before our retry timeout, we will delete the websocket and try again.
      if (data[0] === 'setup') {
        this._updateConnectionStatus('connected');
      }
      return;
    }

    this._messageReceived.emit({
      type: data[0] as Terminal.MessageType,
      content: data.slice(1)
    });
  };

  private _onWSClose = (event: CloseEvent) => {
    console.warn(`Terminal websocket closed: ${event.code}`);
    if (!this.isDisposed) {
      this._reconnect();
    }
  };

  /**
   * Handle connection status changes.
   */
  private _updateConnectionStatus(
    connectionStatus: Terminal.ConnectionStatus
  ): void {
    if (this._connectionStatus === connectionStatus) {
      return;
    }

    this._connectionStatus = connectionStatus;

    // If we are not 'connecting', stop any reconnection attempts.
    if (connectionStatus !== 'connecting') {
      this._reconnectAttempt = 0;
      clearTimeout(this._reconnectTimeout);
    }

    // Send the pending messages if we just connected.
    if (connectionStatus === 'connected') {
      this._sendPending();
    }

    // Notify others that the connection status changed.
    this._connectionStatusChanged.emit(connectionStatus);
  }

  /**
   * Utility function to throw an error if this instance is disposed.
   */
  private _errorIfDisposed() {
    if (this.isDisposed) {
      throw new Error('Terminal connection is disposed');
    }
  }

  /**
   * A signal emitted when the terminal connection status changes.
   */
  get connectionStatusChanged(): ISignal<this, Terminal.ConnectionStatus> {
    return this._connectionStatusChanged;
  }

  /**
   * The current connection status of the terminal connection.
   */
  get connectionStatus(): Terminal.ConnectionStatus {
    return this._connectionStatus;
  }

  private _connectionStatus: Terminal.ConnectionStatus = 'connecting';
  private _connectionStatusChanged = new Signal<
    this,
    Terminal.ConnectionStatus
  >(this);
  private _isDisposed = false;
  private _disposed = new Signal<this, void>(this);
  private _messageReceived = new Signal<this, Terminal.IMessage>(this);
  private _name: string;
  private _reconnectTimeout: any = null;
  private _ws: WebSocket | null = null;
  private _noOp = () => {
    /* no-op */
  };
  private _reconnectLimit = 7;
  private _reconnectAttempt = 0;
  private _pendingMessages: Terminal.IMessage[] = [];
  private _terminalAPIClient: Terminal.ITerminalAPIClient;
}

namespace Private {
  /**
   * Get a random integer between min and max, inclusive of both.
   *
   * #### Notes
   * From
   * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random#Getting_a_random_integer_between_two_values_inclusive
   *
   * From the MDN page: It might be tempting to use Math.round() to accomplish
   * that, but doing so would cause your random numbers to follow a non-uniform
   * distribution, which may not be acceptable for your needs.
   */
  export function getRandomIntInclusive(min: number, max: number): number {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
