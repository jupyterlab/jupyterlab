// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ILayoutRestorer,
  JupyterLab,
  JupyterLabPlugin
} from '@jupyterlab/application';

import {
  ICommandPalette,
  InstanceTracker,
  MainAreaWidget
} from '@jupyterlab/apputils';

import { ILauncher } from '@jupyterlab/launcher';

import { IMainMenu } from '@jupyterlab/mainmenu';

import { ServiceManager } from '@jupyterlab/services';

import { ITerminalTracker, Terminal } from '@jupyterlab/terminal';

import { ISettingRegistry } from '@jupyterlab/coreutils';

/**
 * The command IDs used by the terminal plugin.
 */
namespace CommandIDs {
  export const createNew = 'terminal:create-new';

  export const open = 'terminal:open';

  export const refresh = 'terminal:refresh';

  export const increaseFont = 'terminal:increase-font';

  export const decreaseFont = 'terminal:decrease-font';

  export const toggleTheme = 'terminal:toggle-theme';
}

/**
 * The class name for the terminal icon in the default theme.
 */
const TERMINAL_ICON_CLASS = 'jp-TerminalIcon';

/**
 * The default terminal extension.
 */
const plugin: JupyterLabPlugin<ITerminalTracker> = {
  activate,
  id: '@jupyterlab/terminal-extension:plugin',
  provides: ITerminalTracker,
  requires: [IMainMenu, ICommandPalette, ILayoutRestorer, ISettingRegistry],
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
function activate(
  app: JupyterLab,
  mainMenu: IMainMenu,
  palette: ICommandPalette,
  restorer: ILayoutRestorer,
  settingRegistry: ISettingRegistry,
  launcher: ILauncher | null
): ITerminalTracker {
  const { serviceManager } = app;
  const category = 'Terminal';
  const namespace = 'terminal';
  const tracker = new InstanceTracker<MainAreaWidget<Terminal>>({ namespace });

  // Bail if there are no terminals available.
  if (!serviceManager.terminals.isAvailable()) {
    console.log(
      'Disabling terminals plugin because they are not available on the server'
    );
    return tracker;
  }

  // Handle state restoration.
  restorer.restore(tracker, {
    command: CommandIDs.createNew,
    args: widget => ({ name: widget.content.session.name }),
    name: widget => widget.content.session && widget.content.session.name
  });

  // The terminal options from the setting editor.
  let options: Partial<Terminal.IOptions>;

  /**
   * Update the option values.
   */
  function updateOptions(settings: ISettingRegistry.ISettings): void {
    options = settings.composite as Partial<Terminal.IOptions>;
    Object.keys(options).forEach((key: keyof Terminal.IOptions) => {
      Terminal.defaultOptions[key] = options[key];
    });
  }

  /**
   * Update terminal
   */
  function updateTerminal(widget: MainAreaWidget<Terminal>): void {
    const terminal = widget.content;
    if (!terminal) {
      return;
    }
    Object.keys(options).forEach((key: keyof Terminal.IOptions) => {
      terminal.setOption(key, options[key]);
    });
  }

  /**
   * Update the settings of the current tracker instances.
   */
  function updateTracker(): void {
    tracker.forEach(widget => updateTerminal(widget));
  }

  // Fetch the initial state of the settings.
  settingRegistry
    .load(plugin.id)
    .then(settings => {
      updateOptions(settings);
      updateTracker();
      settings.changed.connect(() => {
        updateOptions(settings);
        updateTracker();
      });
    })
    .catch((reason: Error) => {
      console.error(reason.message);
    });

  addCommands(app, serviceManager, tracker, settingRegistry);

  // Add some commands to the application view menu.
  const viewGroup = [
    CommandIDs.increaseFont,
    CommandIDs.decreaseFont,
    CommandIDs.toggleTheme
  ].map(command => {
    return { command };
  });
  mainMenu.settingsMenu.addGroup(viewGroup, 40);

  // Add command palette items.
  [
    CommandIDs.createNew,
    CommandIDs.refresh,
    CommandIDs.increaseFont,
    CommandIDs.decreaseFont,
    CommandIDs.toggleTheme
  ].forEach(command => {
    palette.addItem({ command, category, args: { isPalette: true } });
  });

  // Add terminal creation to the file menu.
  mainMenu.fileMenu.newMenu.addGroup([{ command: CommandIDs.createNew }], 20);

  // Add a launcher item if the launcher is available.
  if (launcher) {
    launcher.add({
      command: CommandIDs.createNew,
      category: 'Other',
      rank: 0
    });
  }

  app.contextMenu.addItem({
    command: CommandIDs.refresh,
    selector: '.jp-Terminal',
    rank: 1
  });

  return tracker;
}

/**
 * Add the commands for the terminal.
 */
export function addCommands(
  app: JupyterLab,
  services: ServiceManager,
  tracker: InstanceTracker<MainAreaWidget<Terminal>>,
  settingRegistry: ISettingRegistry
) {
  let { commands, shell } = app;

  // Add terminal commands.
  commands.addCommand(CommandIDs.createNew, {
    label: args => (args['isPalette'] ? 'New Terminal' : 'Terminal'),
    caption: 'Start a new terminal session',
    iconClass: args => (args['isPalette'] ? '' : TERMINAL_ICON_CLASS),
    execute: args => {
      const name = args['name'] as string;
      const initialCommand = args['initialCommand'] as string;
      const term = new Terminal({ initialCommand });
      const promise = name
        ? services.terminals.connectTo(name)
        : services.terminals.startNew();

      term.title.icon = TERMINAL_ICON_CLASS;
      term.title.label = '...';
      let main = new MainAreaWidget({ content: term });
      shell.addToMainArea(main);

      return promise
        .then(session => {
          term.session = session;
          tracker.add(main);
          shell.activateById(main.id);

          return main;
        })
        .catch(() => {
          term.dispose();
        });
    }
  });

  commands.addCommand(CommandIDs.open, {
    execute: args => {
      const name = args['name'] as string;
      // Check for a running terminal with the given name.
      const widget = tracker.find(value => {
        let content = value.content;
        return (content.session && content.session.name === name) || false;
      });
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

      return current.content.refresh().then(() => {
        if (current) {
          current.content.activate();
        }
      });
    },
    isEnabled: () => tracker.currentWidget !== null
  });

  function showErrorMessage(error: Error): void {
    console.error(`Failed to set ${plugin.id}: ${error.message}`);
  }

  commands.addCommand(CommandIDs.increaseFont, {
    label: 'Increase Terminal Font Size',
    execute: () => {
      let { fontSize } = Terminal.defaultOptions;
      if (fontSize < 72) {
        return settingRegistry
          .set(plugin.id, 'fontSize', fontSize + 1)
          .catch(showErrorMessage);
      }
    }
  });

  commands.addCommand(CommandIDs.decreaseFont, {
    label: 'Decrease Terminal Font Size',
    execute: () => {
      let { fontSize } = Terminal.defaultOptions;
      if (fontSize > 9) {
        return settingRegistry
          .set(plugin.id, 'fontSize', fontSize - 1)
          .catch(showErrorMessage);
      }
    }
  });

  commands.addCommand(CommandIDs.toggleTheme, {
    label: 'Use Dark Terminal Theme',
    caption: 'Whether to use the dark terminal theme',
    isToggled: () => Terminal.defaultOptions.theme === 'dark',
    execute: () => {
      let { theme } = Terminal.defaultOptions;
      theme = theme === 'dark' ? 'light' : 'dark';
      return settingRegistry
        .set(plugin.id, 'theme', theme)
        .then(() => commands.notifyCommandChanged(CommandIDs.toggleTheme))
        .catch(showErrorMessage);
    }
  });
}
