// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Schema, Datastore, AnyField } from '@phosphor/datastore';

import { CollaborationClient } from './client';
import { PageConfig } from '@jupyterlab/coreutils';

export async function createDatastore(
  collaborationId: string,
  schemas: ReadonlyArray<Schema>
): Promise<Datastore> {
  const client = new CollaborationClient({
    collaborationId: collaborationId
  });
  const datastore = Datastore.create({
    id: PageConfig.getStoreID(),
    schemas: schemas,
    // Pass in client as handler, so it can recieve local changes
    broadcastHandler: client
  });
  client.handler = datastore;
  // Wait for websocket connection to be ready
  await client.ready;
  await client.replayHistory();
  return datastore;
}

/*
 * A type alias for the schema field type from the phosphor datastore package.
 */
export type SchemaFields = {
  readonly [name: string]: AnyField;
};
