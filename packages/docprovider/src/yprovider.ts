/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { URLExt } from '@jupyterlab/coreutils';
import { ServerConnection, User } from '@jupyterlab/services';
import { DocumentChange, YDocument } from '@jupyter-notebook/ydoc';
import { PromiseDelegate } from '@lumino/coreutils';
import { Signal } from '@lumino/signaling';
import { Awareness } from 'y-protocols/awareness';
import { WebsocketProvider as YWebsocketProvider } from 'y-websocket';
import type { Doc } from 'yjs';
import { IDocumentProvider, IDocumentProviderFactory } from './tokens';

/**
 * Room Id endpoint provided by `jupyter-server-ydoc`
 * See https://github.com/jupyter-server/jupyter_server_ydoc
 */
const FILE_PATH_TO_ROOM_ID_URL = 'api/yjs/roomid';

/**
 * A class to provide Yjs synchronization over WebSocket.
 *
 * We specify custom messages that the server can interpret. For reference please look in yjs_ws_server.
 *
 */
export class WebSocketProvider implements IDocumentProvider {
  /**
   * Construct a new WebSocketProvider
   *
   * @param options The instantiation options for a WebSocketProvider
   */
  constructor(options: WebSocketProvider.IOptions) {
    this._isDisposed = false;
    this._path = options.path;
    this._contentType = options.contentType;
    this._format = options.format;
    this._serverUrl = options.url;
    this._ydoc = options.model.ydoc;
    this._awareness = options.model.awareness;

    const user = options.user;

    user.ready
      .then(() => {
        this._onUserChanged(user);
      })
      .catch(e => console.error(e));
    user.userChanged.connect(this._onUserChanged, this);

    const serverSettings = ServerConnection.makeSettings();
    const url = URLExt.join(
      serverSettings.baseUrl,
      FILE_PATH_TO_ROOM_ID_URL,
      encodeURIComponent(this._path)
    );
    const data = {
      method: 'PUT',
      body: JSON.stringify({ format: this._format, type: this._contentType })
    };
    ServerConnection.makeRequest(url, data, serverSettings)
      .then(response => {
        if (response.status !== 200 && response.status !== 201) {
          throw new ServerConnection.ResponseError(response);
        }
        return response.text();
      })
      .then(roomid => {
        this._yWebsocketProvider = new YWebsocketProvider(
          this._serverUrl,
          roomid,
          this._ydoc,
          {
            awareness: this._awareness
          }
        );
      })
      .then(() => this._ready.resolve())
      .catch(reason => console.warn(reason));
  }

  /**
   * Test whether the object has been disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * A promise that resolves when the document provider is ready.
   */
  get ready(): Promise<void> {
    return this._ready.promise;
  }

  /**
   * Dispose of the resources held by the object.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;
    this._yWebsocketProvider.destroy();
    Signal.clearData(this);
  }

  private _onUserChanged(user: User.IManager): void {
    this._awareness.setLocalStateField('user', user.identity);
  }

  private _awareness: Awareness;
  private _contentType: string;
  private _format: string;
  private _isDisposed: boolean;
  private _path: string;
  private _ready = new PromiseDelegate<void>();
  private _serverUrl: string;
  private _ydoc: Doc;
  private _yWebsocketProvider: YWebsocketProvider;
}

/**
 * A namespace for WebSocketProvider statics.
 */
export namespace WebSocketProvider {
  /**
   * The instantiation options for a WebSocketProvider.
   */
  export interface IOptions
    extends IDocumentProviderFactory.IOptions<YDocument<DocumentChange>> {
    /**
     * The server URL
     */
    url: string;

    /**
     * The user data
     */
    user: User.IManager;
  }
}
