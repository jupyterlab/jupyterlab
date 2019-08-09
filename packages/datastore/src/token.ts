// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Token } from '@phosphor/coreutils';

import { AnyField, Schema, Table, Datastore } from '@phosphor/datastore';

import { ISignal, Signal } from '@phosphor/signaling';

import { DatastoreManager } from './manager';

/**
 * The table manager is what is exposed to the user to access a table.
 */
export class TableManager<T extends Schema> {
  constructor(private manager: DatastoreManager, private schema: T) {
    this._changed = new Signal(this);
    this._currentDatastore = this.manager.datastore;
    this._currentDatastore.changed.connect(this._datastoreSlot, this);
    this.manager.datastoreChanged.connect(this._managerSlot, this);
  }

  get table(): Table<T> {
    return this.manager.datastore.get(this.schema);
  }

  dispose(): void {
    this.manager.datastoreChanged.disconnect(this._managerSlot, this);
    this._currentDatastore.changed.disconnect(this._datastoreSlot, this);
    this.manager.dispose();
  }

  beginTransaction(): void {
    this.manager.datastore.beginTransaction();
  }

  endTransaction(): void {
    this.manager.datastore.endTransaction();
  }

  get changed(): ISignal<unknown, unknown> {
    return this._changed;
  }

  private _datastoreSlot(): void {
    this._changed.emit(null);
  }

  private _managerSlot(): void {
    this._currentDatastore.changed.disconnect(this._datastoreSlot, this);
    this._currentDatastore = this.manager.datastore;
    this._currentDatastore.changed.connect(this._datastoreSlot, this);
  }

  private _currentDatastore: Datastore;
  private readonly _changed: Signal<unknown, unknown>;
}
export class DatastoreCreator {
  async createTable<S extends Schema>(
    collaboratorID: string,
    schema: S
  ): Promise<TableManager<S>> {
    const manager = new DatastoreManager(collaboratorID, [schema], true);
    await manager.connected;
    return new TableManager(manager, schema);
  }
}

export interface IDatastoreCreator extends DatastoreCreator {}

/*
 * A type alias for the schema field type from the phosphor datastore package.
 */
export type SchemaFields = {
  readonly [name: string]: AnyField;
};

export const IDatastoreCreator = new Token<IDatastoreCreator>(
  'IDatastoreCreator'
);
