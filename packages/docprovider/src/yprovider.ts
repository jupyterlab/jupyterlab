/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import * as sharedModels from '@jupyterlab/shared-models';

import * as Y from 'yjs';

import { WebsocketProvider } from 'y-websocket';

import * as decoding from 'lib0/decoding';

import * as encoding from 'lib0/encoding';

/**
 * A class to provide Yjs synchronization over Websocket.
 */
export class WebsocketProviderWithLocks extends WebsocketProvider {
  /**
   * Construct a new WebsocketProviderWithLocks
   *
   * @param options The instantiation options for a WebsocketProviderWithLocks
   */
  constructor(options: WebsocketProviderWithLocks.IOptions) {
    super(options.url, options.guid, options.ymodel.ydoc, {
      awareness: options.ymodel.awareness
    });
    // Message handler that confirms when a lock has been acquired
    this.messageHandlers[127] = (
      encoder,
      decoder,
      provider,
      emitSynced,
      messageType
    ) => {
      // acquired lock
      const timestamp = decoding.readUint32(decoder);
      const lockRequest = this._currentLockRequest;
      this._currentLockRequest = null;
      if (lockRequest) {
        lockRequest.resolve(timestamp);
      }
    };
    // Message handler that receives the initial content
    this.messageHandlers[125] = (
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
        setTimeout(() => {
          Y.applyUpdate(this.doc, initialContent);
        }, 0);
      }
      const initialContentRequest = this._initialContentRequest;
      this._initialContentRequest = null;
      if (initialContentRequest) {
        initialContentRequest.resolve(initialContent.byteLength > 0);
      }
    };
    this.isInitialized = false;
    this.onConnectionStatus = this.onConnectionStatus.bind(this);
    this.on('status', this.onConnectionStatus);
  }

  /**
   * Resolves to true if the initial content has been initialized on the server. false otherwise.
   */
  requestInitialContent(): Promise<boolean> {
    if (this._initialContentRequest) {
      return this._initialContentRequest.promise;
    }

    let resolve: any, reject: any;
    const promise: Promise<boolean> = new Promise((_resolve, _reject) => {
      resolve = _resolve;
      reject = _reject;
    });
    this._initialContentRequest = { promise, resolve, reject };
    this._sendMessage(new Uint8Array([125]));

    // Resolve with true if the server doesn't respond for some reason.
    // In case of a connection problem, we don't want the user to re-initialize the window.
    // Instead wait for y-websocket to connect to the server.
    // @todo maybe we should reload instead..
    setTimeout(() => resolve(false), 1000);
    return promise;
  }

  async onConnectionStatus(status: {
    status: 'connected' | 'disconnected';
  }): Promise<void> {
    if (this.isInitialized && status.status === 'connected') {
      const lock = await this.acquireLock();
      const contentIsInitialized = await this.requestInitialContent();
      if (!contentIsInitialized) {
        this.putInitializedState();
      }
      this.releaseLock(lock);
    }
  }

  putInitializedState(): void {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, 124);
    encoding.writeUint8Array(encoder, Y.encodeStateAsUpdate(this.doc));
    this._sendMessage(encoding.toUint8Array(encoder));
    this.isInitialized = true;
  }

  acquireLock(): Promise<number> {
    if (this._currentLockRequest) {
      return this._currentLockRequest.promise;
    }
    this._sendMessage(new Uint8Array([127]));
    // try to acquire lock in regular interval
    const intervalID = setInterval(() => {
      if (this.wsconnected) {
        // try to acquire lock
        this._sendMessage(new Uint8Array([127]));
      }
    }, 500);
    let resolve: any, reject: any;
    const promise: Promise<number> = new Promise((_resolve, _reject) => {
      resolve = _resolve;
      reject = _reject;
    });
    this._currentLockRequest = { promise, resolve, reject };
    const _finally = () => {
      clearInterval(intervalID);
    };
    promise.then(_finally, _finally);
    return promise;
  }

  releaseLock(lock: number): void {
    const encoder = encoding.createEncoder();
    // reply with release lock
    encoding.writeVarUint(encoder, 126);
    encoding.writeUint32(encoder, lock);
    // releasing lock
    this._sendMessage(encoding.toUint8Array(encoder));
  }

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

  isInitialized: boolean;
  private _currentLockRequest: {
    promise: Promise<number>;
    resolve: (lock: number) => void;
    reject: () => void;
  } | null = null;
  private _initialContentRequest: {
    promise: Promise<boolean>;
    resolve: (initialized: boolean) => void;
    reject: () => void;
  } | null = null;
}

/**
 * A namespace for WebsocketProviderWithLocks statics.
 */
export namespace WebsocketProviderWithLocks {
  /**
   * The instantiation options for a WebsocketProviderWithLocks.
   */
  export interface IOptions {
    /**
     * The server URL.
     */
    url: string;

    /**
     * The name of the room
     */
    guid: string;

    /**
     * The YNotebook.
     */
    ymodel: sharedModels.YDocument<sharedModels.DocumentChange>;
  }
}
