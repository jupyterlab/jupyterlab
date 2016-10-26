// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterLab, JupyterLabPlugin
} from '../application';

import {
  IServiceManager
} from '../services';

import {
  RunningSessions, CONSOLE_REGEX
} from './index';


/**
 * The default running sessions extension.
 */
export
const runningSessionsExtension: JupyterLabPlugin<void> = {
  id: 'jupyter.extensions.running-sessions',
  requires: [IServiceManager],
  activate: activateRunningSessions,
  autoStart: true
};



function activateRunningSessions(app: JupyterLab, services: IServiceManager): void {
  let running = new RunningSessions({ manager: services });
  running.id = 'jp-running-sessions';
  running.title.label = 'Running';

  running.sessionOpenRequested.connect((sender, model) => {
    let path = model.notebook.path;
    let name = path.split('/').pop();
    if (CONSOLE_REGEX.test(name)) {
      app.commands.execute('console:open', { id: model.id });
    } else {
      app.commands.execute('file-operations:open', { path });
    }

  });
  running.terminalOpenRequested.connect((sender, model) => {
    app.commands.execute('terminal:open', { name: model.name });
  });
  // Rank has been chosen somewhat arbitrarily to give priority to the running
  // sessions widget in the sidebar.
  app.shell.addToLeftArea(running, { rank: 50 });
}
