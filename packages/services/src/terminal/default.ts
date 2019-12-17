// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { URLExt } from '@jupyterlab/coreutils';

import { JSONPrimitive } from '@lumino/coreutils';

import { ISignal, Signal } from '@lumino/signaling';

import { ServerConnection } from '..';

import * as Terminal from './terminal';
import { shutdownTerminal, TERMINAL_SERVICE_URL } from './restapi';

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
    this._readyPromise = this._initializeSocket();
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
    this._disposed.emit(undefined);

    if (this._ws) {
      this._ws.close();
      this._ws = null;
    }
    Signal.clearData(this);
  }

  /**
   * Send a message to the terminal session.
   */
  send(message: Terminal.IMessage): void {
    if (this._isDisposed || !message.content) {
      return;
    }

    const msg = [message.type, ...message.content];
    const socket = this._ws;
    const value = JSON.stringify(msg);

    if (this._isReady && socket) {
      socket.send(value);
      return;
    }

    void this.ready.then(() => {
      const socket = this._ws;

      if (socket) {
        socket.send(value);
      }
    });
  }

  /**
   * Reconnect to the terminal.
   *
   * @returns A promise that resolves when the terminal has reconnected.
   */
  reconnect(): Promise<void> {
    this._reconnectAttempt = 0;
    this._readyPromise = this._initializeSocket();
    return this._readyPromise;
  }

  /**
   * Shut down the terminal session.
   */
  async shutdown(): Promise<void> {
    await shutdownTerminal(this.name, this.serverSettings);
    this.dispose();
  }

  /**
   * Clone the current terminal connection.
   */
  clone(): Terminal.ITerminalConnection {
    return new TerminalConnection(this);
  }

  /**
   *
   */
  private _createSocket = () => {
    // error if disposed
    const name = this._name;
    const settings = this.serverSettings;
    // TODO: encodeURIComponent(name)?
    this._url = URLExt.join(
      settings.baseUrl,
      TERMINAL_SERVICE_URL,
      encodeURIComponent(name)
    );
    let wsUrl = URLExt.join(
      settings.wsUrl,
      'terminals',
      'websocket',
      encodeURIComponent(name)
    );

    const token = this.serverSettings.token;
    if (token) {
      wsUrl = wsUrl + `?token=${encodeURIComponent(token)}`;
    }
    this._ws = new settings.WebSocket(wsUrl);

    this._ws.onmessage = this._onWSMessage;
    this._ws.onopen = this._onWSOpen;
    this._ws.onclose = this._onWSClose;
    this._ws.onerror = this._onWSClose;

  };

  /**
   * Connect to the websocket.
   */
  private _initializeSocket(): Promise<void> {
    const name = this._name;
    let socket = this._ws;

    if (socket) {
      // Clear the websocket event handlers and the socket itself.
      socket.onopen = this._noOp;
      socket.onclose = this._noOp;
      socket.onerror = this._noOp;
      socket.onmessage = this._noOp;
      socket.close();
      this._ws = null;
    }
    this._isReady = false;

    return new Promise<void>((resolve, reject) => {
      const settings = this.serverSettings;
      const token = this.serverSettings.token;

      this._url = Private.getTermUrl(settings.baseUrl, this._name);
      Private.running[this._url] = this;

      let wsUrl = URLExt.join(settings.wsUrl, `terminals/websocket/${name}`);

      if (token) {
        wsUrl = wsUrl + `?token=${encodeURIComponent(token)}`;
      }

      socket = this._ws = new settings.WebSocket(wsUrl);

      socket.onmessage = (event: MessageEvent) => {
        if (this._isDisposed) {
          return;
        }

        const data = JSON.parse(event.data) as JSONPrimitive[];

        // Handle a disconnect message.
        if (data[0] === 'disconnect') {
          this._disconnected = true;
        }

        if (this._reconnectAttempt > 0) {
          // After reconnection, ignore all messages until a 'setup' message.
          if (data[0] === 'setup') {
            this._reconnectAttempt = 0;
          }
          return;
        }

        this._messageReceived.emit({
          type: data[0] as Terminal.MessageType,
          content: data.slice(1)
        });
      };

      socket.onopen = (event: MessageEvent) => {
        if (!this._isDisposed) {
          this._isReady = true;
          this._disconnected = false;
          resolve(undefined);
        }
      };

      socket.onerror = (event: Event) => {
        if (!this._isDisposed) {
          reject(event);
        }
      };

      socket.onclose = (event: CloseEvent) => {
        console.warn(`Terminal websocket closed: ${event.code}`);
        if (this._disconnected) {
          this.dispose();
        }
        this._reconnectSocket();
      };
    });
  }

  private _onWSOpen = (event: Event) => {
    this._reconnectAttempt = 0;
    this._updateConnectionStatus('connected');
  }

  private _onWSMessage = (event: MessageEvent) => {
    if (this._isDisposed) {
      return;
    }

    const data = JSON.parse(event.data) as JSONPrimitive[];

    // Handle a disconnect message.
    if (data[0] === 'disconnect') {
      this._disconnected = true;
    }

    if (this._reconnectAttempt > 0) {
      // After reconnection, ignore all messages until a 'setup' message.
      if (data[0] === 'setup') {
        this._reconnectAttempt = 0;
      }
      return;
    }

    this._messageReceived.emit({
      type: data[0] as Terminal.MessageType,
      content: data.slice(1)
    });

  }

  private _onWSClose = (event: CloseEvent) => {
    console.warn(`Terminal websocket closed: ${event.code}`);
    if (this._disconnected) {
      this.dispose();
    }
    this._reconnectSocket();

    if (!this.isDisposed) {
      this._reconnect();
    }
  };


  private _reconnectSocket(): void {
    if (this._isDisposed || !this._ws || this._disconnected) {
      return;
    }

    const attempt = this._reconnectAttempt;
    const limit = this._reconnectLimit;

    if (attempt >= limit) {
      console.log(`Terminal reconnect aborted: ${attempt} attempts`);
      return;
    }

    const timeout = Math.pow(2, attempt);

    console.log(`Terminal will attempt to reconnect in ${timeout}s`);
    this._isReady = false;
    this._reconnectAttempt += 1;

    setTimeout(() => {
      if (this.isDisposed) {
        return;
      }
      this._initializeSocket()
        .then(() => {
          console.log('Terminal reconnected');
        })
        .catch(reason => {
          console.warn(`Terminal reconnect failed`, reason);
        });
    }, 1e3 * timeout);
  }

  private _isDisposed = false;
  private _disposed = new Signal<this, void>(this);
  private _isReady = false;
  private _messageReceived = new Signal<this, Terminal.IMessage>(this);
  private _name: string;
  private _readyPromise: Promise<void>;
  private _url: string;
  private _ws: WebSocket | null = null;
  private _noOp = () => {
    /* no-op */
  };
  private _reconnectLimit = 7;
  private _reconnectAttempt = 0;
  private _disconnected = false;
}

namespace Private {
  /**
   * Get the url for a terminal.
   */
  export function getTermUrl(baseUrl: string, name: string): string {
    return URLExt.join(baseUrl, TERMINAL_SERVICE_URL, name);
  }
}
