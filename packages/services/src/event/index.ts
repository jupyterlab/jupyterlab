// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { URLExt } from '@jupyterlab/coreutils';
import { IDisposable } from '@lumino/disposable';
import { Poll } from '@lumino/polling';
import { Signal } from '@lumino/signaling';
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
    const serverSettings =
      options.serverSettings ?? ServerConnection.makeSettings();
    this.serverSettings = serverSettings;

    // Create a poll instance,
    const poll = new Poll({
      factory: async tick => tick.payload,
      frequency: { backoff: false, interval: Poll.NEVER },
      name: `@jupyterlab/services:EventManager`
    });
    this._poll = poll;

    // Open the WebSocket to the server.
    const { WebSocket, wsUrl } = serverSettings;
    const token = encodeURIComponent(serverSettings.token);
    const url =
      URLExt.join(wsUrl, SERVICE_EVENTS_URL, 'subscribe') +
      (token ? `?token=${token}` : '');
    const ws = new WebSocket(url);
    ws.onclose = event => console.log('close', event);
    ws.onerror = event => console.log('error', event);
    ws.onmessage = event => console.log('message', event);
    ws.onopen = event => console.log('open', event);
    this._ws = ws;
  }

  /**
   * The server settings used to make API requests.
   */
  readonly serverSettings: ServerConnection.ISettings;

  get isDisposed(): boolean {
    return this._isDisposed;
  }

  dispose(): void {
    if (this.isDisposed) {
      return;
    }

    this._isDisposed = true;
    this._poll.dispose();
    Signal.clearData(this);

    // Clean up WebSocket.
    const ws = this._ws;
    if (ws) {
      ws.onopen = () => undefined;
      ws.onerror = () => undefined;
      ws.onmessage = () => undefined;
      ws.onclose = () => undefined;
      ws.close();
    }
  }

  /**
   * Record an event in the server event bus.
   */
  async record(event: Event): Promise<void> {
    const { serverSettings } = this;
    const { baseUrl, token } = serverSettings;
    const { makeRequest, ResponseError } = ServerConnection;
    const url =
      URLExt.join(baseUrl, SERVICE_EVENTS_URL) +
      (token ? `?token=${token}` : '');
    const init = { body: '', method: 'POST' };
    const response = await makeRequest(url, init, serverSettings);

    if (response.status !== 204) {
      throw new ResponseError(response);
    }
  }

  private _isDisposed = false;
  private _poll: Poll<Event>;
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
