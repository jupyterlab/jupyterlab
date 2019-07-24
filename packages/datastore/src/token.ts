import { Token } from '@phosphor/coreutils';
import { Schema, Table } from '@phosphor/datastore';
import { DatastoreManager } from './manager';
import { ISignal } from '@phosphor/signaling';

export class TableManager<T extends Schema> {
  constructor(private manager: DatastoreManager, private schema: T) {}

  get table(): Table<T> {
    return this.manager.datastore.get(this.schema);
  }

  dispose(): void {
    this.manager.dispose();
  }

  beginTransaction(): void {
    this.manager.datastore.beginTransaction();
  }

  endTransaction(): void {
    this.manager.datastore.endTransaction();
  }

  get changed(): ISignal<unknown, unknown> {
    return this.manager.datastore.changed;
  }
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

export const IDatastoreCreator = new Token<IDatastoreCreator>(
  'IDatastoreCreator'
);
