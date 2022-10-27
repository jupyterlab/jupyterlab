/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { URLExt } from '@jupyterlab/coreutils';
import { ServerConnection, UserManager } from '@jupyterlab/services';
import { DocumentChange, YDocument } from '@jupyterlab/shared-models';
import { PromiseDelegate } from '@lumino/coreutils';
import { WebsocketProvider as YWebsocketProvider } from 'y-websocket';
import { Awareness } from 'y-protocols/awareness';
import { IDocumentProvider, IDocumentProviderFactory } from './tokens';

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
    this._path = options.path;
    this._contentType = options.contentType;
    this._format = options.format;
    this._serverUrl = options.url;
    this._ydoc = options.model.ydoc;

    this._awareness = options.model.awareness;
    const user = options.user;
    const userChanged = () => {
      this._awareness.setLocalStateField('user', user.identity);
    };
    if (user.isReady) {
      userChanged();
    }
    user.ready.then(userChanged).catch(e => console.error(e));
    user.userChanged.connect(userChanged);
  }

  get ready(): Promise<boolean> {
    if (this._ready) {
      return this._ready.promise;
    } else {
      this._ready = new PromiseDelegate();
    }

    const serverSettings = ServerConnection.makeSettings();
    const url = URLExt.join(
      serverSettings.baseUrl,
      FILE_PATH_TO_ROOM_ID_URL,
      encodeURIComponent(this._path)
    );
    const data = {
      format: this._format,
      type: this._contentType
    };
    ServerConnection.makeRequest(
      url,
      {
        method: 'PUT',
        body: JSON.stringify(data)
      },
      serverSettings
    )
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
      .then(() => this._ready.resolve(true))
      .catch(reason => {
        console.warn(reason);
        this._ready.resolve(false);
      });

    return this._ready.promise;
  }

  destroy(): void {
    this._yWebsocketProvider.destroy();
  }

  private _awareness: Awareness;
  private _contentType: string;
  private _format: string;
  private _path: string;
  private _ready: PromiseDelegate<boolean>;
  private _serverUrl: string;
  private _ydoc: any;
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
    user: UserManager.IManager;
  }
}
