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

  let tracker = new WidgetTracker<TerminalWidget>();

  let newTerminalId = 'terminal:create-new';

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
