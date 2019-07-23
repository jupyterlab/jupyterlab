import { Token } from '@phosphor/coreutils';
import { Schema, Table } from '@phosphor/datastore';
import { DatastoreManager } from './manager';

export class DatastoreCreator {
  async createTable<S extends Schema>(
    collaboratorID: string,
    schema: S
  ): Promise<Table<S>> {
    const manager = new DatastoreManager(collaboratorID, [schema], true);
    await manager.connected;
    return manager.datastore.get(schema);
  }
}

export interface IDatastoreCreator extends DatastoreCreator {}

export const IDatastoreCreator = new Token<IDatastoreCreator>(
  'IDatastoreCreator'
);
