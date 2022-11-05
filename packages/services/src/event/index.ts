// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { URLExt } from '@jupyterlab/coreutils';
import { IDisposable } from '@lumino/disposable';
import { Poll, RateLimiter } from '@lumino/polling';
import { ISignal, Signal, Slot } from '@lumino/signaling';
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
    this._stream = new Private.Stream((tick: MessageEvent) => tick.data, this);
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
   * A signal and async iterable that yields each new event in the application.
   */
  get stream(): AsyncIterable<Event> & ISignal<EventManager, Event> {
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

    this._stream.dispose();
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
    ws.onmessage = event => void this._stream.invoke(event);
    this._ws = ws;
  }

  private _stream: Private.Stream<Event, unknown, [MessageEvent]>;
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
   * A stream with the characteristics of a Lumino signal and an async iterator.
   */
  export class Stream<Event, U, V extends unknown[]>
    extends RateLimiter<Event, U, V>
    implements ISignal<EventManager, Event>
  {
    /**
     * Instantiate a new stream of events.
     */
    constructor(fn: (...args: V) => Event, manager: EventManager) {
      super(fn);
      this._signal = new Signal(manager);
    }

    /**
     * Create an async iterator over the stream of events.
     */
    async *[Symbol.asyncIterator]() {
      for await (const tick of this.poll) {
        if (tick.phase !== 'rejected' && tick.payload) {
          this._signal.emit(tick.payload as Event);
          yield tick.payload as Event;
        }
      }
    }

    /**
     * Connect to the stream of events.
     */
    connect(slot: Slot<EventManager, Event>, thisArg?: any): boolean {
      return this._signal.connect(slot, thisArg);
    }

    /**
     * Disconnect from the stream of events.
     */
    disconnect(slot: Slot<EventManager, Event>, thisArg?: any): boolean {
      return this._signal.disconnect(slot, thisArg);
    }

    /**
     * Dispose the stream.
     */
    dispose(): void {
      if (this.isDisposed) {
        return;
      }
      Signal.clearData(this._signal);
      super.dispose();
    }

    /**
     * Invoke the underlying function that generates stream events.
     */
    invoke(...args: V) {
      this.args = args;
      void this.poll.schedule({ interval: Poll.IMMEDIATE, phase: 'invoked' });
      return this.payload!.promise;
    }

    private _signal: Signal<EventManager, Event>;
  }
}
