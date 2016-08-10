// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterLab, JupyterLabPlugin
} from '../application';

import {
  IServiceManager
} from '../services';

import {
  RunningSessions
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

  // TODO: replace these with execute calls in new phosphor.
  running.sessionOpenRequested.connect((sender, model) => {
    console.log('requested session', model.notebook.path);
  });
  running.terminalOpenRequested.connect((sender, model) => {
    console.log('requested terminal', model.name);
  });
  // Rank has been chosen somewhat arbitrarily to give priority to the running
  // sessions widget in the sidebar.
  app.shell.addToRightArea(running, { rank: 1 });
}
