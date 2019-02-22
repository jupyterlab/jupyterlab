// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { PromiseDelegate } from '@phosphor/coreutils';

import { IDisposable } from '@phosphor/disposable';

/**
 * Abstract base for a class that sends/receives messages over websocket.
 */
export abstract class WSConnection<TSendMsg, TRecvMsg> implements IDisposable {
  /**
   * Dispose of the resources held by the connection.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;
    this._clearSocket();
  }

  /**
   * Test whether the connection has been disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Test whether the connection is ready.
   */
  get isReady(): boolean {
    return !this._wsStopped;
  }

  /**
   * A promise that resolves once the connection is open.
   */
  get ready(): Promise<void> {
    return this._readyDelegate.promise;
  }

  /**
   * Factory function for a WebSocket.
   */
  protected abstract wsFactory(): WebSocket;

  /**
   * Send a message over the websocket.
   *
   * @param msg - The JSON value to send.
   *
   */
  protected sendMessage(msg: TSendMsg) {
    if (!this._ws || this._wsStopped) {
      throw new Error('Web socket not connected');
    }

    const value = this.serializeWSMessage(msg);

    this._ws.send(value);
  }

  /**
   * Handle a received, decoded WS message.
   *
   * @param msg - The decoded message that was received.
   *
   * @returns Whether the message was handled.
   */
  protected abstract handleMessage(msg: TRecvMsg): boolean;

  /**
   * Whether a closed connection should reconnect.
   *
   * @return - Returns false if it should not reconnect.
   * Otherwise it returns a number indicating the delay before reconnecting
   * in ms. Return 0 to reconnect as soon as possible.
   */
  protected shouldReconnect(): false | number {
    if (this.reconnectAttempt >= this.reconnectLimit) {
      console.log(
        `Websocket reconnect abandoned after ${this.reconnectAttempt} attempts`
      );
      return false;
    }
    return 1e3 * Math.pow(2, this.reconnectAttempt++);
  }

  protected serializeWSMessage(
    msg: TSendMsg
  ): string | ArrayBuffer | Blob | ArrayBufferView {
    return JSON.stringify(msg);
  }

  protected deserializeWSMessage(data: unknown): TRecvMsg {
    if (typeof data !== 'string') {
      console.error(`Invalid websocket message data type: ${typeof data}`);
      return;
    }
    try {
      return JSON.parse(data);
    } catch (error) {
      console.error(`Invalid message: ${error.message}`);
      return;
    }
  }

  /**
   * Create the websocket connection and add socket status handlers.
   */
  protected _createSocket = () => {
    this._clearSocket();
    this._wsStopped = false;
    this._ws = this.wsFactory();
    this._readyDelegate = new PromiseDelegate<void>();

    this._ws.onmessage = this._onWSMessage.bind(this);
    this._ws.onopen = this._onWSOpen.bind(this);
    this._ws.onclose = this._onWSClose.bind(this);
    this._ws.onerror = this._onWSError.bind(this);
  };

  /**
   * Clear the socket state.
   */
  private _clearSocket(): void {
    this._wsStopped = true;
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

  private _onWSOpen(evt: Event): void {
    if (!this.isDisposed) {
      this.reconnectAttempt = 0;
      this._wsStopped = false;
      this._readyDelegate.resolve(undefined);
    }
  }

  private _onWSMessage(evt: MessageEvent) {
    if (this._wsStopped) {
      // If the socket is being closed, ignore any messages
      return;
    }
    const msg = this.deserializeWSMessage(evt.data);

    let handled = this.handleMessage(msg);
    if (!handled) {
      console.log('Unhandled websocket message.', msg);
    }
  }

  private _onWSClose(evt: CloseEvent) {
    if (this._wsStopped || !this._ws) {
      return;
    }
    console.warn(`Websocket closed: ${evt.code}`);
    this._reconnectSocket();
  }

  private _onWSError(evt: Event) {
    if (!this._isDisposed) {
      this._readyDelegate.reject(evt);
    }
  }

  private _reconnectSocket(): void {
    const delay = this.shouldReconnect();
    if (delay === false) {
      return;
    }

    console.log(`Websocket will attempt to reconnect in ${delay * 1e-3}s`);
    this._wsStopped = true;

    setTimeout(() => {
      if (this.isDisposed) {
        return;
      }
      this._createSocket();
      this.ready
        .then(() => {
          console.log('Websocket reconnected');
        })
        .catch(reason => {
          console.warn(`Websocket reconnect failed`, reason);
        });
    }, delay);
  }

  protected readonly reconnectLimit = 7;
  protected reconnectAttempt = 0;
  protected _ws: WebSocket | null = null;
  protected _wsStopped = true;

  private _isDisposed = false;
  private _readyDelegate: PromiseDelegate<void> | null = null;

  private readonly _noOp = () => {
    /* no-op */
  };
}

/**
 * The namespace for WSConnection statics.
 */
export namespace WSConnection {
  /**
   * A websocket factory function.
   */
  export type WSFactory = () => WebSocket;
}
