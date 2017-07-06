// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ILayoutRestorer, JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  ICommandPalette, IMainMenu, InstanceTracker
} from '@jupyterlab/apputils';

import {
  ILauncher
} from '@jupyterlab/launcher';

import {
  IServiceManager
} from '@jupyterlab/services';

import {
  Terminal, ITerminalTracker
} from '@jupyterlab/terminal';

import {
  Menu
} from '@phosphor/widgets';


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
const TERMINAL_ICON_CLASS = 'jp-TerminalIcon';


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
  optional: [ILauncher],
  autoStart: true
};


/**
 * Export the plugin as default.
 */
export default plugin;


/**
 * Activate the terminal plugin.
 */
function activate(app: JupyterLab, services: IServiceManager, mainMenu: IMainMenu, palette: ICommandPalette, restorer: ILayoutRestorer, launcher: ILauncher | null): ITerminalTracker {
  // Bail if there are no terminals available.
  if (!services.terminals.isAvailable()) {
    console.log('Disabling terminals plugin because they are not available on the server');
    return;
  }

  const { commands } = app;
  const category = 'Terminal';
  const namespace = 'terminal';
  const tracker = new InstanceTracker<Terminal>({ namespace });

  // Handle state restoration.
  restorer.restore(tracker, {
    command: CommandIDs.createNew,
    args: widget => ({ name: widget.session.name }),
    name: widget => widget.session && widget.session.name
  });

  // Update the command registry when the terminal state changes.
  tracker.currentChanged.connect(() => {
    if (tracker.size <= 1) {
      commands.notifyCommandChanged(CommandIDs.refresh);
    }
  });

  addCommands(app, services, tracker);

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
    if (command !== CommandIDs.createNew) {
      menu.addItem({ command });
    }
  });
  mainMenu.addMenu(menu, {rank: 40});

  // Add a launcher item if the launcher is available.
  if (launcher) {
    launcher.add({
      displayName: 'Terminal',
      category: 'Other',
      rank: 0,
      iconClass: TERMINAL_ICON_CLASS,
      callback: () => {
        return commands.execute(CommandIDs.createNew);
      }
    });
  }

  app.contextMenu.addItem({command: CommandIDs.refresh, selector: '.jp-Terminal', rank: 1});

  return tracker;
}


/**
 * Add the commands for the terminal.
 */
export
function addCommands(app: JupyterLab, services: IServiceManager, tracker: InstanceTracker<Terminal>) {
  let { commands, shell } = app;

  /**
   * Whether there is an active terminal.
   */
  function hasWidget(): boolean {
    return tracker.currentWidget !== null;
  }

  // Add terminal commands.
  commands.addCommand(CommandIDs.createNew, {
    label: 'New Terminal',
    caption: 'Start a new terminal session',
    execute: args => {
      let name = args ? args['name'] as string : '';
      let term = new Terminal();
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
        shell.activateById(term.id);
        return term;
      }).catch(() => { term.dispose(); });
    }
  });

  commands.addCommand(CommandIDs.open, {
    execute: args => {
      const name = args['name'] as string;
      // Check for a running terminal with the given name.
      const widget = tracker.find(value => value.session.name === name);
      if (widget) {
        shell.activateById(widget.id);
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
      shell.activateById(current.id);

      return current.refresh().then(() => { current.activate(); });
    },
    isEnabled: () => tracker.currentWidget !== null
  });

  commands.addCommand('terminal:increase-font', {
    label: 'Increase Terminal Font Size',
    execute: () => {
      let options = Terminal.defaultOptions;
      if (options.fontSize < 72) {
        options.fontSize++;
        tracker.forEach(widget => { widget.fontSize = options.fontSize; });
      }
    },
    isEnabled: hasWidget
  });

  commands.addCommand('terminal:decrease-font', {
    label: 'Decrease Terminal Font Size',
    execute: () => {
      let options = Terminal.defaultOptions;
      if (options.fontSize > 9) {
        options.fontSize--;
        tracker.forEach(widget => { widget.fontSize = options.fontSize; });
      }
    },
    isEnabled: hasWidget
  });

  commands.addCommand('terminal:toggle-theme', {
    label: 'Toggle Terminal Theme',
    caption: 'Switch Terminal Theme',
    execute: () => {
      tracker.forEach(widget => {
        if (widget.theme === 'dark') {
          widget.theme = 'light';
        } else {
          widget.theme = 'dark';
        }
      });
    },
    isEnabled: hasWidget
  });
}

