// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Application
} from 'phosphide/lib/core/application';

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
const terminalExtension = {
  id: 'jupyter.extensions.terminal',
  activate: activateTerminal
};

/**
 * The class name for all main area landscape tab icons.
 */
const LANDSCAPE_ICON_CLASS = 'jp-MainAreaLandscapeIcon';

/**
 * The class name for the terminal icon in the default theme.
 */
const TERMINAL_ICON_CLASS = 'jp-ImageTerminal';


function activateTerminal(app: Application): void {

  let newTerminalId = 'terminal:create-new';
  let increaseTerminalFontSize = 'terminal:increase-font';
  let decreaseTerminalFontSize = 'terminal:decrease-font';
  let toggleTerminalTheme = 'terminal:toggle-theme';
  let closeAllTerminals = 'terminal:close-all-terminals';

  // Track the current active terminal.
  let tracker = new WidgetTracker<TerminalWidget>();
  let activeTerm: TerminalWidget;
  tracker.activeWidgetChanged.connect((sender, widget) => {
    activeTerm = widget;
  });

  app.commands.add([
    {
      id: newTerminalId,
      handler: () => {
        let term = new TerminalWidget();
        term.title.closable = true;
        term.title.icon = `${LANDSCAPE_ICON_CLASS} ${TERMINAL_ICON_CLASS}`;
        app.shell.addToMainArea(term);
        tracker.addWidget(term);
      }
    },
    {
      id: increaseTerminalFontSize,
      handler: increaseFont
    },
    {
      id: decreaseTerminalFontSize,
      handler: decreaseFont
    },
    {
      id: toggleTerminalTheme,
      handler: toggleTheme
    },
    {
      id: closeAllTerminals,
      handler: closeAllTerms
    }
]);
  app.palette.add([
    {
      command: newTerminalId,
      category: 'Terminal',
      text: 'New Terminal',
      caption: 'Start a new terminal session'
    },
    {
      command: increaseTerminalFontSize,
      category: 'Terminal',
      text: 'Increase Terminal Font Size',
    },
    {
      command: decreaseTerminalFontSize,
      category: 'Terminal',
      text: 'Decrease Terminal Font Size',
    },
    {
      command: toggleTerminalTheme,
      category: 'Terminal',
      text: 'Toggle Terminal Theme',
      caption: 'Switch Terminal Background and Font Colors'
    },
    {
      command: closeAllTerminals,
      category: 'Terminal',
      text: 'Close All Terminals'
    }
  ]);

  function increaseFont(): void {
    if (!tracker.isDisposed) {
      let widgets = tracker.widgets;
      for (let i = 0; i < widgets.length; i++) {
        if (widgets[i].fontSize < 72) {
          widgets[i].fontSize = widgets[i].fontSize + 1;
        }
      }
    }
  }

  function decreaseFont(): void {
    if (!tracker.isDisposed) {
      let widgets = tracker.widgets;
      for (let i = 0; i < widgets.length; i++) {
        if (widgets[i].fontSize > 9) {
          widgets[i].fontSize = widgets[i].fontSize - 1;
        }
      }
    }
  }

  function toggleTheme(): void {
    if (!tracker.isDisposed) {
      let widgets = tracker.widgets;
      for (let i = 0; i < widgets.length; i++) {
        if (widgets[i].background === 'black') {
          widgets[i].background = 'white';
          widgets[i].color = 'black';
        }
        else {
          widgets[i].background = 'black';
          widgets[i].color = 'white';
        }
      }
    }
  }

  function closeAllTerms(): void {
    if (!tracker.isDisposed) {
      let widgets = tracker.widgets;
      for (let i = 0; i < widgets.length; i++) {
        widgets[i].dispose();
      }
    }
  }
}
