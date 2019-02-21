// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IModelDB } from '@jupyterlab/observables';

import { map, toArray } from '@phosphor/algorithm';

import { Schema, Datastore } from '@phosphor/datastore';

import { Message, IMessageHandler, MessageLoop } from '@phosphor/messaging';

import { DatastoreSession } from './session';

import { IDisposable } from '@phosphor/disposable';

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
 *
 */
export class DatastoreManager implements IMessageHandler, IDisposable {
  /**
   *
   */
  constructor(key: string, schemas: ReadonlyArray<Schema>) {
    this.key = key;
    this._localDS = Datastore.create({
      id: LOCAL_DS_STORE_ID,
      schemas
    });
    try {
      this.connectRemote();
    } catch (err) {
      console.error(err);
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
    if (this._session) {
      this._session.dispose();
      this._session = null;
    }
  }

  /**
   *
   */
  async connectRemote(): Promise<void> {
    if (!this._localDS) {
      return;
    }
    if (this._session === null) {
      this._session = new DatastoreSession({
        sessionId: this.key,
        handler: this
      });
    }
    const storeId = await this._session.aquireStoreId();
    this._remoteDS = cloneDS(storeId, this._localDS);
    this._localDS.dispose();
    this._localDS = null;
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
          (msg as DatastoreSession.RemoteTransactionMessage).transaction
        )
      );
    } else if (msg.type === 'datastore-transaction') {
      if (this._session) {
        this._session.broadcastTransactions([
          (msg as Datastore.TransactionMessage).transaction
        ]);
      }
    }
  }

  get datastore() {
    return this._remoteDS || this._localDS!;
  }

  /**
   *
   */
  readonly key: string;

  private _session: DatastoreSession | null = null;
  private _localDS: Datastore | null;
  private _remoteDS: Datastore | null = null;

  private _isDisposed = false;
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
    // const key = UUID.uuid4();
    const key = path.replace(/[^0-9a-zA-Z_\-]/, '');

    const manager = new DatastoreManager(key, schemas);

    return new DSModelDB({
      schemas,
      datastore: Promise.resolve(manager.datastore)
    });
  }
}
