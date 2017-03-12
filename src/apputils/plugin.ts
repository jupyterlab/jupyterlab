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
  ILayoutRestorer, LayoutRestorer
} from './layoutrestorer';


/**
 * The default layout restorer provider.
 */
const plugin: JupyterLabPlugin<ILayoutRestorer> = {
  id: 'jupyter.services.instance-restorer',
  requires: [IStateDB],
  activate: (app: JupyterLab, state: IStateDB) => {
    const first = app.started;
    const registry = app.commands;
    const shell = app.shell;
    let restorer = new LayoutRestorer({ first, registry, state });
    // Use the restorer as the application shell's layout database.
    shell.setLayoutDB(restorer);
    return restorer;
  },
  autoStart: true,
  provides: ILayoutRestorer
};


/**
 * Export the plugin as default.
 */
export default plugin;

