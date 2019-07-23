// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ILabShell,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { DatastoreManager } from '@jupyterlab/datastore';

const pluginId = '@jupyterlab/datastore-extension:plugin';

/**
 * The default document manager provider.
 */
const datastorePlugin: JupyterFrontEndPlugin<void> = {
  id: pluginId,
  requires: [],
  optional: [ILabShell],
  autoStart: true,
  activate: (app: JupyterFrontEnd, labShell: ILabShell | null) => {
    return new DatastoreManager({ schemas: [] });
  }
};

/**
 * Export the plugins as default.
 */
const plugins: JupyterFrontEndPlugin<any>[] = [datastorePlugin];
export default plugins;
