// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

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
} from '../services/plugin';

import {
  WidgetTracker
} from '../widgettracker';

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

  let tracker = new WidgetTracker<TerminalWidget>();
  let options = {
    background: 'black',
    color: 'white',
    fontSize: 14
  };

  commands.addCommand(newTerminalId, {
    label: 'New Terminal',
    caption: 'Start a new terminal session',
    execute: () => {
      let term = new TerminalWidget(options);
      term.title.closable = true;
      term.title.icon = `${LANDSCAPE_ICON_CLASS} ${TERMINAL_ICON_CLASS}`;
      app.shell.addToMainArea(term);
      tracker.addWidget(term);
      services.terminals.create().then(session => {
        term.session = session;
        // Trigger an update of the running kernels.
        services.terminals.listRunning();
      });
    }
  });
  commands.addCommand(increaseTerminalFontSize, {
    label: 'Increase Terminal Font Size',
    execute: () => {
      if (!tracker.isDisposed && options.fontSize < 72) {
        let widgets = tracker.widgets;
        options.fontSize++;
        for (let i = 0; i < widgets.length; i++) {
          widgets[i].fontSize = options.fontSize;
        }
      }
    }
  });
  commands.addCommand(decreaseTerminalFontSize, {
    label: 'Decrease Terminal Font Size',
    execute: () => {
      if (!tracker.isDisposed && options.fontSize > 9) {
        let widgets = tracker.widgets;
        options.fontSize--;
        for (let i = 0; i < widgets.length; i++) {
          widgets[i].fontSize = options.fontSize;
        }
      }
    }
  });
  commands.addCommand(toggleTerminalTheme, {
    label: 'Toggle Terminal Theme',
    caption: 'Switch Terminal Background and Font Colors',
    execute: () => {
      if (!tracker.isDisposed) {
        let widgets = tracker.widgets;
        if (options.background === 'black') {
          options.background = 'white';
          options.color = 'black';
        } else {
          options.background = 'black';
          options.color = 'white';
        }
        for (let i = 0; i < widgets.length; i++) {
          widgets[i].background = options.background;
          widgets[i].color = options.color;
        }
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
