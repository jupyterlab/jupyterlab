// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IServiceManager
} from '@jupyterlab/services';

import {
  Menu
} from '@phosphor/widgets';

import {
  JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  ICommandPalette, ILayoutRestorer, InstanceTracker, IMainMenu
} from '@jupyterlab/apputils';

import {
  TerminalWidget, ITerminalTracker, addDefaultCommands
} from '@jupyterlab/terminal';



/**
 * The command IDs used by the terminal plugin.
 */
namespace CommandIDs {
  export
  const createNew = 'terminal:create-new';

  export
  const open = 'terminal:open';

  export
  const refresh = 'terminal:refresh';

  export
  const increaseFont = 'terminal:increase-font';

  export
  const decreaseFont = 'terminal:decrease-font';

  export
  const toggleTheme = 'terminal:toggle-theme';
};



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
    IServiceManager, IMainMenu, ICommandPalette, ILayoutRestorer
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
function activate(app: JupyterLab, services: IServiceManager, mainMenu: IMainMenu, palette: ICommandPalette, restorer: ILayoutRestorer): ITerminalTracker {
  // Bail if there are no terminals available.
  if (!services.terminals.isAvailable()) {
    console.log('Disabling terminals plugin because they are not available on the server');
    return;
  }

  const { commands, shell } = app;
  const category = 'Terminal';
  const namespace = 'terminal';
  const tracker = new InstanceTracker<TerminalWidget>({ namespace, shell });

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
      term.title.icon = TERMINAL_ICON_CLASS;
      term.title.label = '...';
      shell.addToMainArea(term);

      let promise = name ?
        services.terminals.connectTo(name)
        : services.terminals.startNew();

      return promise.then(session => {
        term.session = session;
        tracker.add(term);
        tracker.activate(term);
      }).catch(() => { term.dispose(); });
    }
  });

  commands.addCommand(CommandIDs.open, {
    execute: args => {
      let name = args['name'] as string;
      // Check for a running terminal with the given name.
      let widget = tracker.find(value => value.session.name === name);
      if (widget) {
        tracker.activate(widget);
      } else {
        // Otherwise, create a new terminal with a given name.
        return commands.execute(CommandIDs.createNew, { name });
      }
    }
  });

  commands.addCommand(CommandIDs.refresh, {
    label: 'Refresh Terminal',
    caption: 'Refresh the current terminal session',
    execute: () => {
      let current = tracker.currentWidget;
      if (!current) {
        return;
      }
      tracker.activate(current);
      return current.refresh().then(() => {
        current.activate();
      });
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
