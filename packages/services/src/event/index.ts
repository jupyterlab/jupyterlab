// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { URLExt } from '@jupyterlab/coreutils';
import { IDisposable } from '@lumino/disposable';
import { Poll, RateLimiter } from '@lumino/polling';
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
    this._ticker = new Private.Ticker((tick: MessageEvent) => tick.data);
    this._connect();
  }

  /**
   * A signal that emits each new event in the application.
   */
  get emitted(): ISignal<this, Event> {
    return this._emitted;
  }

  /**
   * An async iterable that yields each new event in the application.
   */
  get events(): AsyncIterable<Event> {
    return this._ticker;
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

    this._ticker.dispose();
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
    const ws = new WebSocket(url);
    ws.onclose = () => this._connect();
    ws.onmessage = event => {
      this._emitted.emit(event.data);
      this._ticker.invoke(event);
    };
    this._ws = ws;
  }

  private _emitted = new Signal<this, Event>(this);
  private _ticker: Private.Ticker<Event, unknown, [MessageEvent]>;
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
  export class Ticker<T, U, V extends unknown[]> extends RateLimiter<T, U, V> {
    async *[Symbol.asyncIterator]() {
      for await (const tick of this.poll) {
        if (tick.phase !== 'rejected' && tick.payload) {
          yield tick.payload as T;
        }
      }
    }
    invoke(...args: V) {
      this.args = args;
      void this.poll.schedule({ interval: Poll.IMMEDIATE, phase: 'invoked' });
      return this.payload!.promise;
    }
  }
}
