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


function activateTerminal(app: Application): void {

  let newTerminalId = 'terminal:create-new';
  let increaseTerminalFontSize = 'terminal:increase-font';
  let decreaseTerminalFontSize = 'terminal:decrease-font';
  let toggleTerminalTheme = 'terminal:toggle-theme';

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
    }
  ]);

  function increaseFont(): void {
    if (!tracker.isDisposed) {
      for (var i = 0; i < tracker.widgets.length; i++) {
        if (tracker.widgets[i].fontSize < 72) {
          tracker.widgets[i].fontSize = tracker.widgets[i].fontSize + 1;
        }
      }
    }
  }

  function decreaseFont(): void {
    if (!tracker.isDisposed) {
      for (var i = 0; i < tracker.widgets.length; i++) {
        if (tracker.widgets[i].fontSize > 9) {
          tracker.widgets[i].fontSize = tracker.widgets[i].fontSize - 1;
        }
      }
    }
  }

  function toggleTheme(): void {
    if (!tracker.isDisposed) {
      for (var i = 0; i < tracker.widgets.length; i++) {
        if (tracker.widgets[i].background === 'black') {
          tracker.widgets[i].background = 'white';
          tracker.widgets[i].color = 'black';
        }
        else {
          tracker.widgets[i].background = 'black';
          tracker.widgets[i].color = 'white';
        }
      }
    }
  }
}
