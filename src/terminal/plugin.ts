// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  TerminalWidget, ITerminalOptions
} from 'jupyter-js-ui/lib/terminal';

import {
  Application
} from 'phosphide/lib/core/application';

import {
  TabPanel
} from 'phosphor-tabs';


/**
 * The default terminal extension. 
 */
export
const terminalExtension = {
  id: 'jupyter.extensions.terminal',
  activate: activateTerminal
};


function activateTerminal(app: Application): Promise<void> {

  let newTerminalId = 'terminal:new';

  app.commands.add([{
    id: newTerminalId,
    handler: () => {
      let term = new TerminalWidget();
      term.color = 'black';
      term.background = 'white';
      term.title.closable = true;
      app.shell.addToMainArea(term);
      let stack = term.parent;
      if (!stack) {
        return;
      }
      let tabs = stack.parent;
      if (tabs instanceof TabPanel) {
        tabs.currentWidget = term;
      }
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

  return Promise.resolve(void 0);
}
