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
  requires: [WidgetTracker],
  activate: activateTerminal
};


function activateTerminal(app: Application, tracker: WidgetTracker): void {

  let newTerminalId = 'terminal:create-new';

  // Track the current active terminal.
  let activeTerm: TerminalWidget;
  tracker.activeWidgetChanged.connect((sender, widget) => {
    if (widget instanceof TerminalWidget) {
      activeTerm = widget as TerminalWidget;
    } else {
      activeTerm = null;
    }
  });

  app.commands.add([{
    id: newTerminalId,
    handler: () => {
      let term = new TerminalWidget();
      term.title.closable = true;
      app.shell.addToMainArea(term);
      tracker.addWidget(term);
    }
  }]);
  app.palette.add([
    {
      command: newTerminalId,
      category: 'Terminal',
      text: 'New Terminal',
      caption: 'Start a new terminal session'
    }
  ]);
}
