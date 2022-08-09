/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { UserManager } from '@jupyterlab/services';
import { DocumentChange, YDocument } from '@jupyterlab/shared-models';
import { PromiseDelegate } from '@lumino/coreutils';
import * as decoding from 'lib0/decoding';
import * as encoding from 'lib0/encoding';
import { WebsocketProvider as YWebsocketProvider } from 'y-websocket';
import { IDocumentProvider, IDocumentProviderFactory } from './tokens';

/**
 * A class to provide Yjs synchronization over WebSocket.
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
      options.format + ':' + options.contentType + ':' + options.path,
      options.model.ydoc,
      {
        awareness: options.model.awareness
      }
    );
    this._path = options.path;
    this._contentType = options.contentType;
    this._format = options.format;
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

    const awareness = options.model.awareness;
    const user = options.user;
    const userChanged = () => {
      awareness.setLocalStateField('user', user.identity);
    };
    if (user.isReady) {
      userChanged();
    }
    user.ready.then(userChanged);
    user.userChanged.connect(userChanged);
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
        encodeURIComponent(
          this._format + ':' + this._contentType + ':' + newPath
        )
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
        this._serverUrl +
        '/' +
        this._format +
        ':' +
        this._contentType +
        ':' +
        this._path;
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
  private _format: string;
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
