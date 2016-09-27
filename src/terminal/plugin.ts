// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  each
} from 'phosphor/lib/algorithm/iteration';

import {
  find
} from 'phosphor/lib/algorithm/searching';

import {
  FocusTracker
} from 'phosphor/lib/ui/focustracker';

import {
  Menu
} from 'phosphor/lib/ui/menu';

import {
  JupyterLab, JupyterLabPlugin
} from '../application';

import {
  ICommandPalette
} from '../commandpalette';

import {
  IMainMenu
} from '../mainmenu';

import {
  IServiceManager
} from '../services';

import {
  TerminalWidget
} from './index';


/**
 * The default terminal extension.
 */
export
const terminalExtension: JupyterLabPlugin<void> = {
  id: 'jupyter.extensions.terminal',
  requires: [IServiceManager, IMainMenu, ICommandPalette],
  activate: activateTerminal,
  autoStart: true
};

/**
 * The class name for all main area landscape tab icons.
 */
const LANDSCAPE_ICON_CLASS = 'jp-MainAreaLandscapeIcon';

/**
 * The class name for the terminal icon in the default theme.
 */
const TERMINAL_ICON_CLASS = 'jp-ImageTerminal';


function activateTerminal(app: JupyterLab, services: IServiceManager, mainMenu: IMainMenu, palette: ICommandPalette): void {

  let { commands, keymap } = app;
  let newTerminalId = 'terminal:create-new';
  let increaseTerminalFontSize = 'terminal:increase-font';
  let decreaseTerminalFontSize = 'terminal:decrease-font';
  let toggleTerminalTheme = 'terminal:toggle-theme';
  let openTerminalId = 'terminal:open';

  let tracker = new FocusTracker<TerminalWidget>();
  let options = {
    background: 'black',
    color: 'white',
    fontSize: 13
  };

  commands.addCommand(newTerminalId, {
    label: 'New Terminal',
    caption: 'Start a new terminal session',
    execute: args => {
      let name = args ? args['name'] as string : '';
      let term = new TerminalWidget(options);
      term.title.closable = true;
      term.title.icon = `${LANDSCAPE_ICON_CLASS} ${TERMINAL_ICON_CLASS}`;
      app.shell.addToMainArea(term);
      tracker.add(term);
      services.terminals.create({ name }).then(session => {
        term.session = session;
        // Trigger an update of the running kernels.
        services.terminals.listRunning();
      });
    }
  });
  commands.addCommand(increaseTerminalFontSize, {
    label: 'Increase Terminal Font Size',
    execute: () => {
      if (options.fontSize < 72) {
        options.fontSize++;
        each(tracker.widgets, widget => {
          widget.fontSize = options.fontSize;
        });
      }
    }
  });
  commands.addCommand(decreaseTerminalFontSize, {
    label: 'Decrease Terminal Font Size',
    execute: () => {
      if (options.fontSize > 9) {
        options.fontSize--;
        each(tracker.widgets, widget => {
          widget.fontSize = options.fontSize;
        });
      }
    }
  });
  commands.addCommand(toggleTerminalTheme, {
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
      each(tracker.widgets, widget => {
        widget.background = options.background;
        widget.color = options.color;
      });
    }
  });
  commands.addCommand(openTerminalId, {
    execute: args => {
      let name = args['name'] as string;
      // Check for a running terminal with the given name.
      let widget = find(tracker.widgets, value => value.session.name === name);
      if (widget) {
        app.shell.activateMain(widget.id);
      } else {
        // Otherwise, create a new terminal with a given name.
        commands.execute(newTerminalId, { name });
      }
    }
  });

  let category = 'Terminal';
  [
    newTerminalId,
    increaseTerminalFontSize,
    decreaseTerminalFontSize,
    toggleTerminalTheme
  ].forEach(command => palette.addItem({ command, category }));

  let menu = new Menu({ commands, keymap });
  menu.title.label = 'Terminal';
  menu.addItem({ command: newTerminalId });
  menu.addItem({ command: increaseTerminalFontSize });
  menu.addItem({ command: decreaseTerminalFontSize });
  menu.addItem({ command: toggleTerminalTheme });

  mainMenu.addMenu(menu, {rank: 40});
}
