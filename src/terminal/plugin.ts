// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  InstanceTracker
} from '../common/instancetracker';

import {
  Menu
} from '@phosphor/widgets';

import {
  JupyterLab, JupyterLabPlugin
} from '../application';

import {
  ICommandPalette
} from '../commandpalette';

import {
  IInstanceRestorer
} from '../instancerestorer';

import {
  IMainMenu
} from '../mainmenu';

import {
  IServiceManager
} from '../services';

import {
  CommandIDs, TerminalWidget, ITerminalTracker, addDefaultCommands
} from './';


/**
 * The class name for all main area landscape tab icons.
 */
const LANDSCAPE_ICON_CLASS = 'jp-MainAreaLandscapeIcon';

/**
 * The class name for the terminal icon in the default theme.
 */
const TERMINAL_ICON_CLASS = 'jp-ImageTerminal';


/**
 * The default terminal extension.
 */
const plugin: JupyterLabPlugin<ITerminalTracker> = {
  activate,
  id: 'jupyter.extensions.terminal',
  provides: ITerminalTracker,
  requires: [
    IServiceManager, IMainMenu, ICommandPalette, IInstanceRestorer
  ],
  autoStart: true
};


/**
 * Export the plugin as default.
 */
export default plugin;


/**
 * Activate the terminal plugin.
 */
function activate(app: JupyterLab, services: IServiceManager, mainMenu: IMainMenu, palette: ICommandPalette, restorer: IInstanceRestorer): ITerminalTracker {
  // Bail if there are no terminals available.
  if (!services.terminals.isAvailable()) {
    console.log('Disabling terminals plugin because they are not available on the server');
    return;
  }

  const category = 'Terminal';
  const namespace = 'terminal';
  const tracker = new InstanceTracker<TerminalWidget>({ namespace });

  let { commands, shell } = app;

  // Handle state restoration.
  restorer.restore(tracker, {
    command: CommandIDs.createNew,
    args: widget => ({ name: widget.session.name }),
    name: widget => widget.session && widget.session.name
  });

  addDefaultCommands(tracker, commands);

  // Add terminal commands.
  commands.addCommand(CommandIDs.createNew, {
    label: 'New Terminal',
    caption: 'Start a new terminal session',
    execute: args => {
      let name = args ? args['name'] as string : '';
      let term = new TerminalWidget();
      term.title.closable = true;
      term.title.icon = `${LANDSCAPE_ICON_CLASS} ${TERMINAL_ICON_CLASS}`;
      tracker.add(term);
      shell.addToMainArea(term);
      shell.activateMain(term.id);

      if (name) {
        services.terminals.connectTo(name).then(session => {
          term.session = session;
        });
      } else {
        services.terminals.startNew().then(session => {
          term.session = session;
        });
      }
    }
  });

  commands.addCommand(CommandIDs.open, {
    execute: args => {
      let name = args['name'] as string;
      // Check for a running terminal with the given name.
      let widget = tracker.find(value => value.session.name === name);
      if (widget) {
        shell.activateMain(widget.id);
      } else {
        // Otherwise, create a new terminal with a given name.
        return commands.execute(CommandIDs.createNew, { name });
      }
    }
  });

  // Add command palette and menu items.
  let menu = new Menu({ commands });
  menu.title.label = category;
  [
    CommandIDs.createNew,
    CommandIDs.refresh,
    CommandIDs.increaseFont,
    CommandIDs.decreaseFont,
    CommandIDs.toggleTheme
  ].forEach(command => {
    palette.addItem({ command, category });
    menu.addItem({ command });
  });
  mainMenu.addMenu(menu, {rank: 40});

  return tracker;
}
