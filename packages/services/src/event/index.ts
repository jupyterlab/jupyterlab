// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { URLExt } from '@jupyterlab/coreutils';
import { PromiseDelegate } from '@lumino/coreutils';
import { IDisposable } from '@lumino/disposable';
import { ISignal, Signal } from '@lumino/signaling';
import { ServerConnection } from '../serverconnection';

/**
 * The url for the jupyter-server events service.
 */
const SERVICE_EVENTS_URL = 'api/events';

/**
 * The events API service manager.
 */
export class EventManager implements IDisposable {
  /**
   * Create a new event manager.
   */
  constructor(options: EventManager.IOptions = {}) {
    this.serverSettings =
      options.serverSettings ?? ServerConnection.makeSettings();
    this._stream = new Private.Stream(this);
    void this._subscribe();
  }

  /**
   * The server settings used to make API requests.
   */
  readonly serverSettings: ServerConnection.ISettings;

  /**
   * Whether the event manager is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * An event stream that emits and yields each new event.
   */
  get stream(): Event.Stream {
    return this._stream;
  }

  /**
   * Dispose the event manager.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }

    const socket = this._socket;
    if (socket) {
      this._socket = null;
      socket.onopen = () => undefined;
      socket.onerror = () => undefined;
      socket.onmessage = () => undefined;
      socket.onclose = () => undefined;
      socket.close();
    }
    this._isDisposed = true;
  }

  /**
   * Post an event request to be emitted by the event bus.
   */
  async emit(event: Event.Request): Promise<void> {
    const { serverSettings } = this;
    const { baseUrl, token } = serverSettings;
    const { makeRequest, ResponseError } = ServerConnection;
    const url =
      URLExt.join(baseUrl, SERVICE_EVENTS_URL) +
      (token ? `?token=${token}` : '');
    const init = { body: JSON.stringify(event), method: 'POST' };
    const response = await makeRequest(url, init, serverSettings);

    if (response.status !== 204) {
      throw new ResponseError(response);
    }
  }

  /**
   * Subscribe to event bus emissions.
   */
  private async _subscribe(): Promise<void> {
    if (this.isDisposed) {
      return;
    }
    // TODO: (1) Make the test emission a request with an appropriate schema.
    // TODO: (2) Remove try block when jupyter_server 2 is a hard requirement.
    try {
      await this.emit({
        // eslint-disable-next-line camelcase
        schema_id:
          'https://events.jupyter.org/jupyter_server/contents_service/v1',
        data: { action: 'get', path: '.' },
        version: '1'
      });
    } catch (_) {
      return this._stream.stop();
    }
    const { token, WebSocket, wsUrl } = this.serverSettings;
    const url =
      URLExt.join(wsUrl, SERVICE_EVENTS_URL, 'subscribe') +
      (token ? `?token=${encodeURIComponent(token)}` : '');
    const socket = (this._socket = new WebSocket(url));
    const stream = this._stream;

    socket.onclose = () => this._subscribe();
    socket.onmessage = msg => msg.data && stream.emit(JSON.parse(msg.data));
  }

  private _isDisposed = false;
  private _socket: WebSocket | null = null;
  private _stream: Private.Stream<this, Event.Emission>;
}

/**
 * A namespace for `EventManager` statics.
 */
export namespace EventManager {
  /**
   * The instantiation options for an event manager.
   */
  export interface IOptions {
    /**
     * The server settings used to make API requests.
     */
    serverSettings?: ServerConnection.ISettings;
  }
}

/**
 * A namespace for event API interfaces.
 */
export namespace Event {
  /**
   * The event emission type.
   */
  export type Emission = {
    [key: string]: any;
    schema_id: string;
  };

  /**
   * The event request type.
   */
  export type Request = {
    data: { [key: string]: any };
    schema_id: string;
    version: string;
  };

  /**
   * An event stream with the characteristics of a signal and an async iterator.
   */
  export type Stream = IStream<IManager, Emission>;

  /**
   * The interface for the event bus front-end.
   */
  export interface IManager extends EventManager {}

  /**
   * An object that is both a signal and an async iterable.
   */
  export interface IStream<T, U> extends ISignal<T, U>, AsyncIterable<U> {}
}

/**
 * A namespace for private module data.
 */
namespace Private {
  /**
   * A pending promise in a promise chain underlying a stream.
   */
  export type Pending<U> = PromiseDelegate<{ args: U; next: Pending<U> }>;

  /**
   * A stream with the characteristics of a signal and an async iterable.
   */
  export class Stream<T, U> extends Signal<T, U> {
    /**
     * Return an async iterator that yields every emission.
     */
    async *[Symbol.asyncIterator](): AsyncIterableIterator<U> {
      let pending = this._pending;
      while (true) {
        try {
          const { args, next } = await pending.promise;
          pending = next;
          yield args;
        } catch (_) {
          return; // Any promise rejection stops the iterator.
        }
      }
    }

    /**
     * Emit the signal, invoke the connected slots, and yield the emission.
     *
     * @param args - The args to pass to the connected slots.
     */
    emit(args: U): void {
      const pending = this._pending;
      this._pending = new PromiseDelegate();
      pending.resolve({ args, next: this._pending });
      super.emit(args);
    }

    /**
     * Stop the stream's async iteration.
     */
    stop(): void {
      this._pending.reject('stop');
    }

    private _pending: Private.Pending<U> = new PromiseDelegate();
  }
}
