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
export
const plugin: JupyterLabPlugin<ILayoutRestorer> = {
  id: 'jupyter.services.layout-restorer',
  requires: [IStateDB],
  activate: (app: JupyterLab, state: IStateDB) => {
    let first = app.started;
    let registry = app.commands;
    let layout = new LayoutRestorer({ first, registry, state });
    // Activate widgets that have been restored if necessary.
    layout.activated.connect((sender, id) => { app.shell.activateMain(id); });
    // After restoration is complete, listen to the shell for updates.
    layout.restored.then(() => {
      app.shell.currentChanged.connect((sender, args) => {
        layout.save({ currentWidget: args.newValue });
      });
    });
    return layout;
  },
  autoStart: true,
  provides: ILayoutRestorer
};
