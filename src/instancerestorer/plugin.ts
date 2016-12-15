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
    let layout = new InstanceRestorer({ first, registry, state });
    // Activate widgets that have been restored if necessary.
    layout.activated.connect((sender, id) => { shell.activateMain(id); });
    // After restoration is complete, listen to the shell for updates.
    // restorer.restored.then(() => {
    //   shell.currentChanged.connect((sender, args) => {
    //     layout.save({ currentWidget: args.newValue });
    //   });
    // });
    return layout;
  },
  autoStart: true,
  provides: IInstanceRestorer
};


/**
 * Export the plugin as default.
 */
export default plugin;

