/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  JupyterLab, JupyterLabPlugin
} from '../application';

import {
  ICommandPalette, ILayoutRestorer, LayoutRestorer
} from '../apputils';

import {
  IStateDB
} from '../statedb';

import {
  activatePalette
} from './palette';


/**
 * The default layout restorer provider.
 */
const layoutPlugin: JupyterLabPlugin<ILayoutRestorer> = {
  id: 'jupyter.services.layout-restorer',
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
 * The default commmand palette extension.
 */
const palettePlugin: JupyterLabPlugin<ICommandPalette> = {
  activate: activatePalette,
  id: 'jupyter.services.commandpalette',
  provides: ICommandPalette,
  requires: [ILayoutRestorer],
  autoStart: true
};


/**
 * Export the plugin as default.
 */
const plugins: JupyterLabPlugin<any>[] = [layoutPlugin, palettePlugin];
export default plugins;

