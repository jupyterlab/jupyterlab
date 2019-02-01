// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { RunningSessions } from '@jupyterlab/running';

/**
 * The default running sessions extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  activate,
  id: '@jupyterlab/running-extension:plugin',
  optional: [ILayoutRestorer],
  autoStart: true
};

/**
 * Export the plugin as default.
 */
export default plugin;

/**
 * Activate the running plugin.
 */
function activate(
  app: JupyterFrontEnd,
  restorer: ILayoutRestorer | null
): void {
  let running = new RunningSessions({ manager: app.serviceManager });
  running.id = 'jp-running-sessions';
  running.title.iconClass = 'jp-DirectionsRunIcon jp-SideBar-tabIcon';
  running.title.caption = 'Running Terminals and Kernels';

  // Let the application restorer track the running panel for restoration of
  // application state (e.g. setting the running panel as the current side bar
  // widget).
  if (restorer) {
    restorer.add(running, 'running-sessions');
  }

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
  app.shell.add(running, 'left', { rank: 200 });
}
