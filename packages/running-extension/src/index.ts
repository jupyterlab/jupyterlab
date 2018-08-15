// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ILayoutRestorer,
  JupyterLab,
  JupyterLabPlugin
} from '@jupyterlab/application';

import { CommandRegistry } from '@phosphor/commands';

import { Menu } from '@phosphor/widgets';

namespace CommandIDs {
  export const moveToRightSidebar = 'running:move-to-right-area';

  export const moveToLeftSidebar = 'running:move-to-left-area';
}

import { RunningSessions } from '@jupyterlab/running';
// import { CommandRegistry } from '@phosphor/commands';

// import { Menu } from '@phosphor/widgets';

/**
 * The default running sessions extension.
 */
const plugin: JupyterLabPlugin<void> = {
  activate,
  id: '@jupyterlab/running-extension:plugin',
  requires: [ILayoutRestorer],
  autoStart: true
};

// namespace CommandIDs {
//   export const moveToRightSidebar = 'running:move-to-right-area';

//   export const moveToLeftSidebar = 'running:move-to-left-area';
// }

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
  running.title.label = 'Running';

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

  addCommands(app);
  const { commands } = app;

  let node = running.node;
  node.addEventListener('contextmenu', (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const menu = createContextMenu(commands);
    menu.open(event.clientX, event.clientY);
  });

  // Rank has been chosen somewhat arbitrarily to give priority to the running
  // sessions widget in the sidebar.
  app.shell.addToLeftArea(running, { rank: 200 });
}

function addCommands(app: JupyterLab): void {
  const { commands } = app;

  commands.addCommand(CommandIDs.moveToRightSidebar, {
    label: 'Move Running to Left Sidebar',
    execute: args => {
      app.shell.moveRightActiveToLeftArea();
    }
  });

  commands.addCommand(CommandIDs.moveToLeftSidebar, {
    label: 'Move Running to Right Sidebar',
    execute: () => {
      app.shell.moveLeftActiveToRightArea();
    }
  });
}

function createContextMenu(commands: CommandRegistry): Menu {
  const menu = new Menu({ commands });
  menu.addItem({ command: CommandIDs.moveToRightSidebar });
  menu.addItem({ command: CommandIDs.moveToLeftSidebar });

  return menu;
}
