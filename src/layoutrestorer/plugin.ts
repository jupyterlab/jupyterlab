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
const layoutRestorerProvider: JupyterLabPlugin<ILayoutRestorer> = {
  id: 'jupyter.services.layout-restorer',
  requires: [IStateDB],
  activate: (app: JupyterLab, state: IStateDB) => {
    let layout = new LayoutRestorer({ first: app.started, state });
    app.shell.currentChanged.connect((sender, args) => {
      console.log('potentially saving state...');
      layout.save({ currentWidget: args.newValue });
    });
    layout.activated.connect((sender, widget) => {
      app.shell.activateMain(widget.id);
    });
    return layout;
  },
  autoStart: true,
  provides: ILayoutRestorer
};
