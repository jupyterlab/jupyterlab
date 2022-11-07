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
    this._connect();
  }

  /**
   * The server settings used to make API requests.
   */
  readonly serverSettings: ServerConnection.ISettings;

  /**
   * Whether the event manager is disposed.
   */
  get isDisposed(): boolean {
    return this._ws === null;
  }

  /**
   * A signal and async iterable iterator that emits and yields each new event.
   */
  get stream(): AsyncIterableIterator<Event> & ISignal<EventManager, Event> {
    return this._stream;
  }

  /**
   * Dispose the event manager.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }

    const ws = this._ws;
    this._ws = null;
    ws!.onopen = () => undefined;
    ws!.onerror = () => undefined;
    ws!.onmessage = () => undefined;
    ws!.onclose = () => undefined;
    ws!.close();

    Signal.clearData(this);
  }

  /**
   * Emit an event to be broadcast by the application event bus.
   */
  async emit(event: Event): Promise<void> {
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
   * Open the WebSocket to the server.
   */
  private _connect(): void {
    const { token, WebSocket, wsUrl } = this.serverSettings;
    const url =
      URLExt.join(wsUrl, SERVICE_EVENTS_URL, 'subscribe') +
      (token ? `?token=${encodeURIComponent(token)}` : '');

    this._ws = new WebSocket(url);
    this._ws.onclose = () => this._connect();
    this._ws.onmessage = event => event.data && this._stream.emit(event.data);
  }

  private _stream: Private.Stream;
  private _ws: WebSocket | null = null;
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
   * The interface for the setting system manager.
   */
  export interface IManager extends EventManager {}
}

export type Event = {
  schema_name: string;
};

/**
 * A namespace for private module data.
 */
namespace Private {
  /**
   * A stream with the characteristics of a signal and an async iterator.
   */
  export class Stream
    extends Signal<EventManager, Event>
    implements AsyncIterableIterator<Event>
  {
    async *[Symbol.asyncIterator](): AsyncIterableIterator<Event> {
      while (this.pending) {
        yield this.pending.promise;
      }
    }

    emit(event: Event): void {
      super.emit(event);
      const { pending } = this;
      this.pending = new PromiseDelegate();
      pending.resolve(event);
    }

    async next(): Promise<IteratorResult<Event, any>> {
      return { value: await this.pending.promise };
    }

    protected pending = new PromiseDelegate<Event>();
  }
}
