// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ILabShell,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { DSModelDBFactory } from '@jupyterlab/datastore';

import { Collaborations } from './widget';

import {
  DatastoreManager,
  DSModelDB,
  currentCollaborations
} from '@jupyterlab/datastore';

const pluginId = '@jupyterlab/datastore-extension:plugin';

async function openCollaboration(
  sender: unknown,
  info: currentCollaborations.CollaborationInfo
) {
  // Set up session to server:
  const collaborationId = info.id;

  const manager = new DatastoreManager(collaborationId, schemas, true);

  const modelDB = new DSModelDB({
    schemas,
    manager,
    recordId: collaborationId,
    schemaId: schemas[0].id
  });

  await modelDB.connected;

  // Now we create the document and open it.
}

/**
 * The default document manager provider.
 */
const datastorePlugin: JupyterFrontEndPlugin<void> = {
  id: pluginId,
  requires: [],
  optional: [ILabShell],
  autoStart: true,
  activate: (app: JupyterFrontEnd, labShell: ILabShell | null) => {
    const registry = app.docRegistry;
    const factory = new DSModelDBFactory();
    registry.addModelDBFactory('phosphor-datastore', factory);

    const collabs = new Collaborations();
    collabs.openRequested.connect(openCollaboration);

    labShell.restored.then(() => {
      labShell.add(collabs, 'left');
    });
  }
};

/**
 * Export the plugins as default.
 */
const plugins: JupyterFrontEndPlugin<any>[] = [datastorePlugin];
export default plugins;
