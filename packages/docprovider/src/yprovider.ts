/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { ICurrentUser } from '@jupyterlab/user';
import { PromiseDelegate } from '@lumino/coreutils';
import * as decoding from 'lib0/decoding';
import * as encoding from 'lib0/encoding';
import { WebsocketProvider as YWebsocketProvider } from 'y-websocket';
import * as Y from 'yjs';
import { IDocumentProvider, IDocumentProviderFactory } from './tokens';

/**
 * A class to provide Yjs synchronization over WebSocket.
 *
 * The user can specify their own user-name and user-color by adding url parameters:
 *   ?username=Alice&usercolor=007007
 * where usercolor must be a six-digit hexadecimal encoded RGB value without the hash token.
 *
 * We specify custom messages that the server can interpret. For reference please look in yjs_ws_server.
 *
 */
export class WebSocketProvider
  extends YWebsocketProvider
  implements IDocumentProvider
{
  /**
   * Construct a new WebSocketProvider
   *
   * @param options The instantiation options for a WebSocketProvider
   */
  constructor(options: WebSocketProvider.IOptions) {
    super(
      options.url,
      options.contentType + ':' + options.path,
      options.ymodel.ydoc,
      {
        awareness: options.ymodel.awareness
      }
    );
    this._path = options.path;
    this._contentType = options.contentType;
    this._serverUrl = options.url;

    // Message handler that receives the initial content
    this.messageHandlers[127] = (
      encoder,
      decoder,
      provider,
      emitSynced,
      messageType
    ) => {
      // received initial content
      const initialContent = decoding.readTailAsUint8Array(decoder);
      // Apply data from server
      if (initialContent.byteLength > 0) {
        Y.applyUpdate(this.doc, initialContent);
      }
      const initialContentRequest = this._initialContentRequest;
      this._initialContentRequest = null;
      if (initialContentRequest) {
        initialContentRequest.resolve(initialContent.byteLength > 0);
      }
    };
    // Message handler that receives the rename acknowledge
    this.messageHandlers[125] = (
      encoder,
      decoder,
      provider,
      emitSynced,
      messageType
    ) => {
      this._renameAck.resolve(
        decoding.readTailAsUint8Array(decoder)[0] ? true : false
      );
    };
    this._isInitialized = false;
    this._onConnectionStatus = this._onConnectionStatus.bind(this);
    this.on('status', this._onConnectionStatus);

    const awareness = options.ymodel.awareness;
    const user = options.user;
    const userChanged = () => {
      const name = user.displayName !== '' ? user.displayName : user.name;
      awareness.setLocalStateField('user', { ...user.toJSON(), name });
    };
    if (user.isReady) {
      userChanged();
    }
    user.ready.connect(userChanged);
    user.changed.connect(userChanged);
  }

  get renameAck(): Promise<boolean> {
    return this._renameAck.promise;
  }

  setPath(newPath: string): void {
    if (newPath !== this._path) {
      this._path = newPath;
      const encoder = encoding.createEncoder();
      this._renameAck = new PromiseDelegate<boolean>();
      encoding.write(encoder, 125);
      // writing a utf8 string to the encoder
      const escapedPath = unescape(
        encodeURIComponent(this._contentType + ':' + newPath)
      );
      for (let i = 0; i < escapedPath.length; i++) {
        encoding.write(
          encoder,
          /** @type {number} */ escapedPath.codePointAt(i)!
        );
      }
      this._sendMessage(encoding.toUint8Array(encoder));
      // prevent publishing messages to the old channel id.
      this.disconnectBc();
      // The next time the provider connects, we should connect through a different server url
      this.bcChannel =
        this._serverUrl + '/' + this._contentType + ':' + this._path;
      this.url = this.bcChannel;
      this.connectBc();
    }
  }

  /**
   * Resolves to true if the initial content has been initialized on the server. false otherwise.
   */
  requestInitialContent(): Promise<boolean> {
    if (this._initialContentRequest) {
      return this._initialContentRequest.promise;
    }

    this._initialContentRequest = new PromiseDelegate<boolean>();
    this._sendMessage(new Uint8Array([127]));

    // Resolve with true if the server doesn't respond for some reason.
    // In case of a connection problem, we don't want the user to re-initialize the window.
    // Instead wait for y-websocket to connect to the server.
    // @todo maybe we should reload instead..
    setTimeout(() => this._initialContentRequest?.resolve(false), 1000);
    return this._initialContentRequest.promise;
  }

  /**
   * Put the initialized state.
   */
  putInitializedState(): void {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, 126);
    encoding.writeUint8Array(encoder, Y.encodeStateAsUpdate(this.doc));
    this._sendMessage(encoding.toUint8Array(encoder));
    this._isInitialized = true;
  }

  /**
   * Send a new message to WebSocket server.
   *
   * @param message The message to send
   */
  private _sendMessage(message: Uint8Array): void {
    // send once connected
    const send = () => {
      setTimeout(() => {
        if (this.wsconnected) {
          this.ws!.send(message);
        } else {
          this.once('status', send);
        }
      }, 0);
    };
    send();
  }

  /**
   * Handle a change to the connection status.
   *
   * @param status The connection status.
   */
  private async _onConnectionStatus(status: {
    status: 'connected' | 'disconnected';
  }): Promise<void> {
    if (this._isInitialized && status.status === 'connected') {
      const contentIsInitialized = await this.requestInitialContent();
      if (!contentIsInitialized) {
        this.putInitializedState();
      }
    }
  }

  private _path: string;
  private _contentType: string;
  private _serverUrl: string;
  private _isInitialized: boolean;
  private _initialContentRequest: PromiseDelegate<boolean> | null = null;
  private _renameAck: PromiseDelegate<boolean>;
}

/**
 * A namespace for WebSocketProvider statics.
 */
export namespace WebSocketProvider {
  /**
   * The instantiation options for a WebSocketProvider.
   */
  export interface IOptions extends IDocumentProviderFactory.IOptions {
    /**
     * The server URL
     */
    url: string;

    /**
     * The user data
     */
    user: ICurrentUser;
  }
}
