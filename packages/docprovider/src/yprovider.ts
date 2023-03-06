/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { URLExt } from '@jupyterlab/coreutils';
import { Dialog, showErrorMessage } from '@jupyterlab/apputils';
import { ServerConnection, User } from '@jupyterlab/services';
import { nullTranslator, TranslationBundle } from '@jupyterlab/translation';

import { DocumentChange, YDocument } from '@jupyter/ydoc';

import { PromiseDelegate } from '@lumino/coreutils';
import { Signal } from '@lumino/signaling';

import { Awareness } from 'y-protocols/awareness';
import { WebsocketProvider as YWebsocketProvider } from 'y-websocket';

import { IDocumentProvider, IDocumentProviderFactory } from './tokens';

/**
 * Room Id endpoint provided by `jupyter-server-ydoc`
 * See https://github.com/jupyter-server/jupyter_server_ydoc
 */
const FILE_PATH_TO_ROOM_ID_URL = 'api/yjs/session';

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
    this._sharedModel = options.model;
    this._awareness = options.model.awareness;
    this._trans = options.translator ?? nullTranslator.load('jupyterlab');

    const user = options.user;

    user?.ready
      .then(() => {
        this._onUserChanged(user);
      })
      .catch(e => console.error(e));
    user?.userChanged.connect(this._onUserChanged, this);

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
        return response.json();
      })
      .then(session => {
        this._yWebsocketProvider = new YWebsocketProvider(
          this._serverUrl,
          `${session.format}:${session.type}:${session.fileId}`,
          this._sharedModel.ydoc,
          {
            disableBc: true,
            params: { sessionId: session.sessionId },
            awareness: this._awareness
          }
        );

        this._yWebsocketProvider.on(
          'connection-close',
          this._onConnectionClosed
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

  private _onConnectionClosed = (event: any): void => {
    if (event.code === 1003) {
      console.error('Document provider closed:', event.reason);

      showErrorMessage(
        this._trans.__('Session expired'),
        this._trans.__(
          'The document session expired. You need to reload this browser tab.'
        ),
        [Dialog.okButton({ label: this._trans.__('Reload') })]
      )
        .then((r: any) => {
          if (r.button.accept) {
            window.location.reload();
          }
        })
        .catch(e => window.location.reload());

      // Dispose shared model immediately. Better break the document model,
      // than overriding data on disk.
      this._sharedModel.dispose();
    }
  };

  private _awareness: Awareness;
  private _contentType: string;
  private _format: string;
  private _isDisposed: boolean;
  private _path: string;
  private _ready = new PromiseDelegate<void>();
  private _serverUrl: string;
  private _sharedModel: YDocument<DocumentChange>;
  private _yWebsocketProvider: YWebsocketProvider;
  private _trans: TranslationBundle;
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
    user?: User.IManager;

    /**
     * The jupyterlab translator
     */
    translator?: TranslationBundle;
  }
}
