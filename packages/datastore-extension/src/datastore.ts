// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { JupyterFrontEndPlugin } from '@jupyterlab/application';

import { DatastoreCreator, IDatastoreCreator } from '@jupyterlab/datastore';

export default {
  id: '@jupyterlab/datastore-extension:plugin',
  requires: [],
  autoStart: true,
  provides: IDatastoreCreator,
  activate: () => {
    return new DatastoreCreator();
  }
} as JupyterFrontEndPlugin<IDatastoreCreator>;
