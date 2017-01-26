// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterLab, JupyterLabPlugin
} from '../application';

import {
  CommandIDs as ConsoleCommandIDs
} from '../console';

import {
  IInstanceRestorer
} from '../instancerestorer';

import {
  CommandIDs as FileBrowserCommandIDs
} from '../filebrowser';

import {
  IServiceManager
} from '../services';

import {
  CommandIDs as TerminalCommandIDs
} from '../terminal';

import {
  RunningSessions, CONSOLE_REGEX
} from './';


/**
 * The default running sessions extension.
 */
const plugin: JupyterLabPlugin<void> = {
  activate,
  id: 'jupyter.extensions.running-sessions',
  requires: [IServiceManager, IInstanceRestorer],
  autoStart: true
};


/**
 * Export the plugin as default.
 */
export default plugin;


/**
 * Activate the running plugin.
 */
function activate(app: JupyterLab, services: IServiceManager, restorer: IInstanceRestorer): void {
  let running = new RunningSessions({ manager: services });
  running.id = 'jp-running-sessions';
  running.title.label = 'Running';

  // Let the application restorer track the running panel for restoration of
  // application state (e.g. setting the running panel as the current side bar
  // widget).
  restorer.add(running, 'running-sessions');

  running.sessionOpenRequested.connect((sender, model) => {
    let path = model.notebook.path;
    let name = path.split('/').pop();
    if (CONSOLE_REGEX.test(name)) {
      app.commands.execute(ConsoleCommandIDs.open, { id: model.id });
    } else {
      app.commands.execute(FileBrowserCommandIDs.open, { path });
    }

  });

  running.terminalOpenRequested.connect((sender, model) => {
    app.commands.execute(TerminalCommandIDs.open, { name: model.name });
  });

  // Rank has been chosen somewhat arbitrarily to give priority to the running
  // sessions widget in the sidebar.
  app.shell.addToLeftArea(running, { rank: 50 });
}
