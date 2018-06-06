// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ReadonlyJSONObject, UUID
} from '@phosphor/coreutils';

import {
  IDisposable, DisposableDelegate
} from '@phosphor/disposable';

import {
  IMessageHandler
} from '@phosphor/messaging';

import {
  IServerAdapter, Patch, PatchHistoryMessage, RemotePatchMessage
} from '@phosphor/datastore';



/**
 * An local-only data store server adapter.
 */
export
class LocalServerAdapter implements IServerAdapter, IDisposable {
  static _storeIdGen = 0;
  /**
   *
   */
  constructor(checkpoint: ReadonlyJSONObject) {
    this._handlers = new Map<number, IMessageHandler>();
    this._checkpoint = checkpoint;
    this._history = new Map<string, Patch>();
  }


  /**
   * Dispose of the resources held by the adapter.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;
    this._handlers.clear();
  }

  /**
   * Test whether the kernel has been disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Create a new, unique store id.
   *
   * @returns {Promise<number>} A promise to the new store id.
   */
  createStoreId(): Promise<number> {
    return Promise.resolve(LocalServerAdapter._storeIdGen++);
  }

  /**
   * Create a new, unique patch id.
   *
   * @returns {string} The patch id.
   */
  createPatchId(storeId: number): string {
    return `${storeId}:${UUID.uuid4()}`;
  }

  /**
   * Register a handler for messages from the server adaptor.
   *
   * @param {number} storeId The store id of the patch handler.
   * @param {IMessageHandler} handler The patch handler to register.
   * @returns {IDisposable} Disposable to use to unregister the handler.
   */
  registerPatchHandler(storeId: number, handler: IMessageHandler): IDisposable {
    this._handlers.set(storeId, handler);
    const history = {
      checkpoint: this._checkpoint,
      patches: this._history,
    };
    const message = new PatchHistoryMessage(history);
    handler.processMessage(message);
    return new DisposableDelegate(() => {
      this._handlers.delete(storeId);
    });
  }

  /**
   * Broadcast a patch to all data stores.
   *
   * @param {Patch} patch The patch to broadcast.
   */
  broadcastPatch(patch: Patch): void {
    this._history.set(patch.patchId, patch);
    const message = new RemotePatchMessage(patch);
    this._handlers.forEach((handler, storeId) => {
      if (storeId !== patch.storeId) {
        handler.processMessage(message);
      }
    });
  }

  /**
   * Fetch specific patches from history by their id.
   *
   * @param {string[]} patchIds The patch ids to fetch.
   * @returns {Promise<Patch[]>} A promise to the patches that are fetched.
   */
  fetchPatches(patchIds: string[]): Promise<Patch[]> {
    const patches = patchIds.map((id) => {
      if (!this._history.has(id)) {
        throw new Error(`Cannot fetch patch with id '${id}', no such patch exists`);
      }
      return this._history.get(id)!;
    });
    return Promise.resolve(patches);
  }

  private _isDisposed = false;
  private _handlers: Map<number, IMessageHandler>;

  private _checkpoint: ReadonlyJSONObject;
  private _history: Map<string, Patch>;
}
