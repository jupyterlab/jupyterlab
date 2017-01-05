/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  JupyterLab, JupyterLabPlugin
} from '../application';

import {
  IStateDB
} from '../statedb';

import {
  IInstanceRestorer, InstanceRestorer
} from './instancerestorer';


/**
 * The default instance restorer provider.
 */
const plugin: JupyterLabPlugin<IInstanceRestorer> = {
  id: 'jupyter.services.instance-restorer',
  requires: [IStateDB],
  activate: (app: JupyterLab, state: IStateDB) => {
    const first = app.started;
    const registry = app.commands;
    const shell = app.shell;
    let restorer = new InstanceRestorer({ first, registry, state });
    // Activate widgets that have been restored if necessary.
    restorer.activated.connect((sender, id) => { shell.activateMain(id); });
    // After instance restoration is complete, ask app shell to restore layout.
    Promise.all([restorer.fetch(), restorer.restored]).then(([layout]) => {
      app.shell.restore(restorer, layout);
    });
    return restorer;
  },
  autoStart: true,
  provides: IInstanceRestorer
};


/**
 * Export the plugin as default.
 */
export default plugin;

