// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Token } from '@phosphor/coreutils';

import { AnyField, Schema } from '@phosphor/datastore';

import { DatastoreManager } from './manager';

export class DatastoreCreator {
  async createTable(
    collaboratorID: string,
    schemas: Array<Schema>
  ): Promise<DatastoreManager> {
    const manager = new DatastoreManager(collaboratorID, schemas, true);
    await manager.connected;
    return manager;
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
