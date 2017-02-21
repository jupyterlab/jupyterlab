// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  TerminalSession
} from '@jupyterlab/services';

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
  CommandIDs, TerminalWidget
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
const plugin: JupyterLabPlugin<void> = {
  activate,
  id: 'jupyter.extensions.terminal',
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
function activate(app: JupyterLab, services: IServiceManager, mainMenu: IMainMenu, palette: ICommandPalette, restorer: IInstanceRestorer): void {
  // Bail if there are no terminals available.
  if (!services.terminals.isAvailable()) {
    console.log('Disabling terminals plugin because they are not available on the server');
    return;
  }

  const category = 'Terminal';
  const namespace = 'terminal';
  const tracker = new InstanceTracker<TerminalWidget>({ namespace });

  let { commands } = app;
  let options = {
    background: 'black',
    color: 'white',
    fontSize: 13
  };

  // Handle state restoration.
  restorer.restore(tracker, {
    command: CommandIDs.createNew,
    args: widget => ({ name: widget.session.name }),
    name: widget => widget.session && widget.session.name
  });

  // Add terminal commands.
  commands.addCommand(CommandIDs.createNew, {
    label: 'New Terminal',
    caption: 'Start a new terminal session',
    execute: args => {
      let name = args ? args['name'] as string : '';
      let promise: Promise<TerminalSession.ISession>;
      if (name) {
        promise = services.terminals.connectTo(name);
      } else {
        promise = services.terminals.startNew();
      }
      return promise.then(session => {
        return session.ready.then(() => {
          let term = new TerminalWidget(options);
          term.session = session;
          term.title.closable = true;
          term.title.icon = `${LANDSCAPE_ICON_CLASS} ${TERMINAL_ICON_CLASS}`;
          tracker.add(term);
          app.shell.addToMainArea(term);
          app.shell.activateMain(term.id);
        });
      });
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
      app.shell.activateMain(current.id);
      return current.refresh().then(() => {
        current.activate();
      });
    }
  });

  commands.addCommand(CommandIDs.increaseFont, {
    label: 'Increase Terminal Font Size',
    execute: () => {
      if (options.fontSize < 72) {
        options.fontSize++;
        tracker.forEach(widget => { widget.fontSize = options.fontSize; });
      }
    }
  });

  commands.addCommand(CommandIDs.decreaseFont, {
    label: 'Decrease Terminal Font Size',
    execute: () => {
      if (options.fontSize > 9) {
        options.fontSize--;
        tracker.forEach(widget => { widget.fontSize = options.fontSize; });
      }
    }
  });

  commands.addCommand(CommandIDs.toggleTheme, {
    label: 'Toggle Terminal Theme',
    caption: 'Switch Terminal Background and Font Colors',
    execute: () => {
      if (options.background === 'black') {
        options.background = 'white';
        options.color = 'black';
      } else {
        options.background = 'black';
        options.color = 'white';
      }
      tracker.forEach(widget => {
        widget.background = options.background;
        widget.color = options.color;
      });
    }
  });

  commands.addCommand(CommandIDs.open, {
    execute: args => {
      let name = args['name'] as string;
      // Check for a running terminal with the given name.
      let widget = tracker.find(value => value.session.name === name);
      if (widget) {
        app.shell.activateMain(widget.id);
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
}
