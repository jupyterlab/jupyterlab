// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ILayoutRestorer,
  JupyterLab,
  JupyterLabPlugin
} from '@jupyterlab/application';

import { RunningSessions } from '@jupyterlab/running';

/**
 * The default running sessions extension.
 */
const plugin: JupyterLabPlugin<void> = {
  activate,
  id: '@jupyterlab/running-extension:plugin',
  requires: [ILayoutRestorer],
  autoStart: true
};

/**
 * Export the plugin as default.
 */
export default plugin;

/**
 * Activate the running plugin.
 */
function activate(app: JupyterLab, restorer: ILayoutRestorer): void {
  let running = new RunningSessions({ manager: app.serviceManager });
  running.id = 'jp-running-sessions';
  running.title.iconClass = 'jp-DirectionsRunIcon jp-SideBar-tabIcon';
  running.title.caption = 'Running Terminals and Kernels';

  // Let the application restorer track the running panel for restoration of
  // application state (e.g. setting the running panel as the current side bar
  // widget).
  restorer.add(running, 'running-sessions');

  running.sessionOpenRequested.connect((sender, model) => {
    let path = model.path;
    if (model.type.toLowerCase() === 'console') {
      app.commands.execute('console:open', { path });
    } else {
      app.commands.execute('docmanager:open', { path });
    }
  });

  running.terminalOpenRequested.connect((sender, model) => {
    app.commands.execute('terminal:open', { name: model.name });
  });

  // Rank has been chosen somewhat arbitrarily to give priority to the running
  // sessions widget in the sidebar.
  app.shell.addToLeftArea(running, { rank: 200 });
}
