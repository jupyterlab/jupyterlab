/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { ICurrentUser } from '@jupyterlab/user';
import { PromiseDelegate } from '@lumino/coreutils';
import * as decoding from 'lib0/decoding';
import * as encoding from 'lib0/encoding';
import { WebsocketProvider as YWebsocketProvider } from 'y-websocket';
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
  implements IDocumentProvider {
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

    // Message handler that receives the rename acknowledge
    this.messageHandlers[127] = (
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
      encoding.write(encoder, 127);
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

  private _path: string;
  private _contentType: string;
  private _serverUrl: string;
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
