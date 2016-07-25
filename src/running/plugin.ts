// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ServiceManager
} from 'jupyter-js-services';

import {
  Application
} from 'phosphide/lib/core/application';

import {
  RunningSessions
} from './index';


/**
 * The default running sessions extension.
 */
export
const runningSessionsExtension = {
  id: 'jupyter.extensions.running-sessions',
  requires: [ServiceManager],
  activate: activateRunningSessions
};



function activateRunningSessions(app: Application, services: ServiceManager): void {
  let running = new RunningSessions({ manager: services });
  running.id = 'jp-running-sessions';
  running.title.text = 'Running';

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
