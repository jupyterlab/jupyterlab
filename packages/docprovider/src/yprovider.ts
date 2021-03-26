/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import * as decoding from 'lib0/decoding.js';
import * as encoding from 'lib0/encoding.js';
import * as nbmodel from '@jupyterlab/nbmodel';

export class WebsocketProviderWithLocks extends WebsocketProvider {
  constructor(url: string, guid: string, ynotebook: nbmodel.YNotebook) {
    super(url, guid, ynotebook.ydoc, { awareness: ynotebook.awareness });
    // Message handler that confirms when a lock has been acquired
    this.messageHandlers[127] = (
      encoder,
      decoder,
      provider,
      emitSynced,
      messageType
    ) => {
      const timestamp = decoding.readUint32(decoder);
      console.log('Acquired lock!', timestamp);
      const lockRequest = this.currentLockRequest;
      this.currentLockRequest = null;
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
      const initialContent = decoding.readTailAsUint8Array(decoder);
      // Apply data from server
      if (initialContent.byteLength > 0) {
        setTimeout(() => {
          Y.applyUpdate(this.doc, initialContent);
        }, 0);
      }
      console.log('Received initial content!', initialContent);
      const initialContentRequest = this.initialContentRequest;
      this.initialContentRequest = null;
      if (initialContentRequest) {
        initialContentRequest.resolve(initialContent.byteLength > 0);
      }
    };
  }

  private __sendMessage(message: Uint8Array): void {
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
   * Resolves to true if the initial content has been initialized on the server. false otherwise.
   */
  public requestInitialContent(): Promise<boolean> {
    if (this.initialContentRequest) {
      return this.initialContentRequest.promise;
    }

    let resolve: any, reject: any;
    const promise: Promise<boolean> = new Promise((_resolve, _reject) => {
      resolve = _resolve;
      reject = _reject;
    });
    this.initialContentRequest = { promise, resolve, reject };
    this.__sendMessage(new Uint8Array([125]));

    // Resolve with true if the server doesn't respond for some reason.
    // In case of a connection problem, we don't want the user to re-initialize the window.
    // Instead wait for y-websocket to connect to the server.
    // @todo maybe we should reload instead..
    setTimeout(() => resolve(false), 1000);
    return promise;
  }

  public putInitializedState(): void {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, 124);
    encoding.writeUint8Array(encoder, Y.encodeStateAsUpdate(this.doc));
    this.__sendMessage(encoding.toUint8Array(encoder));
  }

  public acquireLock(): Promise<number> {
    if (this.currentLockRequest) {
      return this.currentLockRequest.promise;
    }
    this.__sendMessage(new Uint8Array([127]));
    // try to acquire lock in regular interval
    const intervalID = setInterval(() => {
      if (this.wsconnected) {
        // try to acquire lock
        this.ws!.send(new Uint8Array([127]));
      }
    }, 500);
    let resolve: any, reject: any;
    const promise: Promise<number> = new Promise((_resolve, _reject) => {
      resolve = _resolve;
      reject = _reject;
    });
    this.currentLockRequest = { promise, resolve, reject };
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
    console.log('Releasing lock!', lock);
    this.ws?.send(encoding.toUint8Array(encoder));
  }

  private currentLockRequest: {
    promise: Promise<number>;
    resolve: (lock: number) => void;
    reject: () => void;
  } | null = null;
  private initialContentRequest: {
    promise: Promise<boolean>;
    resolve: (initialized: boolean) => void;
    reject: () => void;
  } | null = null;
}
