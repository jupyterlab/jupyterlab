// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { URLExt } from '@jupyterlab/coreutils';
import { JSONObject, ReadonlyJSONObject } from '@lumino/coreutils';
import { IDisposable } from '@lumino/disposable';
import { Poll } from '@lumino/polling';
import { IStream, Signal, Stream } from '@lumino/signaling';
import { ServerConnection } from '../serverconnection';

/**
 * The url for the jupyter-server events service.
 */
const SERVICE_EVENTS_URL = 'api/events';

/**
 * The events API service manager.
 */
export class EventManager implements Event.IManager {
  /**
   * Create a new event manager.
   */
  constructor(options: EventManager.IOptions = {}) {
    this.serverSettings =
      options.serverSettings ?? ServerConnection.makeSettings();

    // If subscription fails, the poll attempts to reconnect and backs off.
    this._poll = new Poll({
      factory: () => this._subscribe(),
      standby: options.standby ?? 'when-hidden'
    });
    this._stream = new Stream(this);

    // Subscribe to the events socket.
    void this._poll.start();
  }

  /**
   * The server settings used to make API requests.
   */
  readonly serverSettings: ServerConnection.ISettings;

  /**
   * Whether the event manager is disposed.
   */
  get isDisposed(): boolean {
    return this._poll.isDisposed;
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

    // Clean up poll.
    this._poll.dispose();

    // Clean up socket.
    const socket = this._socket;
    if (socket) {
      this._socket = null;
      socket.onopen = () => undefined;
      socket.onerror = () => undefined;
      socket.onmessage = () => undefined;
      socket.onclose = () => undefined;
      socket.close();
    }

    // Clean up stream.
    Signal.clearData(this);
    this._stream.stop();
  }

  /**
   * Post an event request to be emitted by the event bus.
   */
  async emit(event: Event.Request): Promise<void> {
    const { serverSettings } = this;
    const { baseUrl } = serverSettings;
    const { makeRequest, ResponseError } = ServerConnection;
    const url = URLExt.join(baseUrl, SERVICE_EVENTS_URL);
    const init = { body: JSON.stringify(event), method: 'POST' };
    const response = await makeRequest(url, init, serverSettings);

    if (response.status !== 204) {
      throw new ResponseError(response);
    }
  }

  /**
   * Subscribe to event bus emissions.
   */
  private _subscribe(): Promise<void> {
    return new Promise<void>((_, reject) => {
      if (this.isDisposed) {
        return;
      }

      const { appendToken, token, WebSocket, wsUrl } = this.serverSettings;
      let url = URLExt.join(wsUrl, SERVICE_EVENTS_URL, 'subscribe');
      if (appendToken && token !== '') {
        url += `?token=${encodeURIComponent(token)}`;
      }
      const socket = (this._socket = new WebSocket(url));
      const stream = this._stream;

      socket.onclose = () => reject(new Error('EventManager socket closed'));
      socket.onmessage = msg => msg.data && stream.emit(JSON.parse(msg.data));
    });
  }

  private _poll: Poll;
  private _socket: WebSocket | null = null;
  private _stream: Stream<this, Event.Emission>;
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
     * When the manager stops polling the API. Defaults to `when-hidden`.
     */
    standby?: Poll.Standby | (() => boolean | Poll.Standby);

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
  export type Emission = ReadonlyJSONObject & {
    schema_id: string;
  };

  /**
   * The event request type.
   */
  export type Request = {
    data: JSONObject;
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
  export interface IManager extends IDisposable {
    /**
     * The server settings used to make API requests.
     */
    readonly serverSettings: ServerConnection.ISettings;
    /**
     * An event stream that emits and yields each new event.
     */
    readonly stream: Event.Stream;
    /**
     * Post an event request to be emitted by the event bus.
     */
    emit(event: Event.Request): Promise<void>;
  }
}
