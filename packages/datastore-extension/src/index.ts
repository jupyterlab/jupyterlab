// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { JupyterFrontEndPlugin } from '@jupyterlab/application';

import { IDatastoreCreator, DatastoreCreator } from '@jupyterlab/datastore';
const pluginId = '@jupyterlab/datastore-extension:plugin';

/**
 * The default document manager provider.
 */
const datastorePlugin: JupyterFrontEndPlugin<IDatastoreCreator> = {
  id: pluginId,
  requires: [],
  autoStart: true,
  provides: IDatastoreCreator,
  activate: () => {
    return new DatastoreCreator();
  }
};

export default [datastorePlugin];
