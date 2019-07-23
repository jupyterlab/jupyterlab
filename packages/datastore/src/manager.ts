// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IModelDB } from '@jupyterlab/observables';

import { map, toArray } from '@phosphor/algorithm';

import { UUID } from '@phosphor/coreutils';

import { Schema, Datastore } from '@phosphor/datastore';

import { IDisposable } from '@phosphor/disposable';

import { Message, IMessageHandler, MessageLoop } from '@phosphor/messaging';

import { Signal, ISignal } from '@phosphor/signaling';

import { CollaborationClient } from './client';

import { DSModelDB } from './modeldb';

/**
 *
 */
const LOCAL_DS_STORE_ID = -1;

/**
 *
 */
function cloneDS(
  newId: number,
  source: Datastore,
  overrides?: Partial<Datastore.IOptions>
): Datastore {
  // Clone store object
  const dest = Datastore.create({
    broadcastHandler: source.broadcastHandler || undefined,
    ...overrides,
    id: newId,
    schemas: toArray(map(source.iter(), table => table.schema)),
    restoreState: source.toString()
  });
  return dest;
}

/**
 * A manager for a single datastore.
 */
export class DatastoreManager implements IMessageHandler, IDisposable {
  /**
   *
   */
  constructor(
    collaborationId: string,
    schemas: ReadonlyArray<Schema>,
    immediate: boolean
  ) {
    this.collaborationId = collaborationId;
    this._schemas = schemas;
    if (immediate) {
      this._localDS = Datastore.create({
        id: LOCAL_DS_STORE_ID,
        schemas
      });
    } else {
      this._localDS = null;
    }

    try {
      this.connected = this.connectRemote();
    } catch (err) {
      console.error(err);
      this.connected = new Promise(() => {
        // never resolve
      });
    }
  }

  get isDisposed(): boolean {
    return this._isDisposed;
  }

  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;
    if (this._localDS) {
      this._localDS.dispose();
      this._localDS = null;
    }
    if (this._remoteDS) {
      this._remoteDS.dispose();
      this._remoteDS = null;
    }
    if (this._client) {
      this._client.dispose();
      this._client = null;
    }
  }

  /**
   *
   */
  processMessage(msg: Message) {
    if (this.isDisposed) {
      return;
    }
    if (msg.type === 'remote-transactions') {
      MessageLoop.sendMessage(
        this._remoteDS || this._localDS!,
        new Datastore.TransactionMessage(
          (msg as CollaborationClient.RemoteTransactionMessage).transaction
        )
      );
    } else if (msg.type === 'datastore-transaction') {
      if (this._client) {
        this._client.broadcastTransactions([
          (msg as Datastore.TransactionMessage).transaction
        ]);
      }
    } else if (msg.type === 'initial-state') {
      const state = (msg as CollaborationClient.InitialStateMessage).state;

      // Scenarios:
      // 1. Immediate (has localDS), and state is null: Clone local.
      // 2. Non-immediate, and state is null: Simple create of remote.
      // 3. Non-immediate, and state is non-null: Recreate remote from state.
      // 4. Immediate, and non-null state: Error!
      // 5. Has remote already: Treat as non-immediate (recovery)

      const immediate = this._localDS !== null && this._remoteDS === null;
      if (!immediate) {
        // 2. / 3.  ( 5.)
        this._remoteDS = Datastore.create({
          id: this._storeId!,
          schemas: this._schemas,
          broadcastHandler: this,
          restoreState: state || undefined
        });
        if (state !== null) {
          this._prepopulated = true;
        }
      } else if (state === null) {
        // 1.
        this._remoteDS = cloneDS(this._storeId!, this._localDS!, {
          broadcastHandler: this
        });
      } else {
        // 4.
        throw new Error(
          'Cannot replace the state of an immediate collaboration session!'
        );
      }

      this._datastoreChanged.emit({ datastore: this._remoteDS });

      if (this._localDS) {
        this._localDS.dispose();
        this._localDS = null;
      }
    } else if (msg.type === 'datastore-gc-chance') {
      MessageLoop.sendMessage(this._remoteDS || this._localDS!, msg);
    }
  }

  get datastore() {
    return this._remoteDS || this._localDS;
  }

  get datastoreChanged(): ISignal<this, DatastoreManager.IChangedArgs> {
    return this._datastoreChanged;
  }

  /**
   *
   */
  readonly collaborationId: string;

  readonly connected: Promise<void>;

  get isPrepopulated(): boolean {
    return this._prepopulated;
  }

  /**
   *
   */
  protected async connectRemote(): Promise<void> {
    if (this._client === null) {
      this._client = new CollaborationClient({
        collaborationId: this.collaborationId,
        handler: this
      });
    }
    this._storeId = await this._client.storeId;
    if (this._storeId > 1) {
      this._prepopulated = true;
    }
    return this._client.replayHistory();
  }

  private _schemas: ReadonlyArray<Schema>;

  private _client: CollaborationClient | null = null;
  private _localDS: Datastore | null;
  private _remoteDS: Datastore | null = null;
  private _storeId: number | null = null;
  private _prepopulated = false;

  private _isDisposed = false;
  private _datastoreChanged = new Signal<this, DatastoreManager.IChangedArgs>(
    this
  );
}

export namespace DatastoreManager {
  export interface IChangedArgs {
    datastore: Datastore;
  }
}

/**
 *
 */
export class DSModelDBFactory implements IModelDB.IFactory {
  /**
   * Create a new DSModelDB instance.
   *
   * @param path - The path of the file to model.
   * @param schemas - The schemas for the model.
   */
  createNew(path: string, schemas: ReadonlyArray<Schema>) {
    // Set up session to server:
    // TODO: Keep path, or use UUID?
    // Note: We probably want to use a UUID, as paths are mutable (rename)
    //       Then, we need a way to map and sync paths to UUIDs.
    let collaborationId = UUID.uuid4();
    collaborationId = path.replace(/[^0-9a-zA-Z_\-]/, '');

    const manager = new DatastoreManager(collaborationId, schemas, true);

    return new DSModelDB({
      schemas,
      manager,
      recordId: collaborationId,
      schemaId: schemas[0].id
    });
  }
}
