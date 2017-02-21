// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  CommandRegistry
} from '@phosphor/widgetcommandregistry';

import {
  CommandPalette
} from '@phosphor/widgetcommandpalette';

import {
  Keymap
} from '@phosphor/widgetkeymap';

import {
  SplitPanel
} from '@phosphor/widgetsplitpanel';

import {
  Widget
} from '@phosphor/widgetwidget';

import {
  Session
} from '@jupyterlab/services';

import {
  editorServices
} from 'jupyterlab/lib/codemirror';

import {
  ConsolePanel
} from 'jupyterlab/lib/console';

import {
  RenderMime
} from 'jupyterlab/lib/rendermime';

import 'jupyterlab/lib/default-theme/index.css';
import '../index.css';

let TITLE = 'Console';


function main(): void {
  let path = 'dummy_path';
  let query: { [key: string]: string } = Object.create(null);

  window.location.search.substr(1).split('&').forEach(item => {
    let pair = item.split('=');
    if (pair[0]) {
      query[pair[0]] = pair[1];
    }
  });

  if (!query['path']) {
    Session.startNew({ path }).then(session => { startApp(session); });
    return;
  }

  Session.findByPath(query['path'])
    .then(model => { return Session.connectTo(model.id); })
    .then(session => { startApp(session); })
    .catch(error => {
      console.warn(`path="${query['path']}"`, error);
      Session.startNew({ path }).then(session => { startApp(session); });
    });
}


function startApp(session: Session.ISession) {
  // Initialize the keymap manager with the bindings.
  let commands = new CommandRegistry();
  let keymap = new Keymap({ commands });

  // Setup the keydown listener for the document.
  document.addEventListener('keydown', event => {
    keymap.processKeydownEvent(event);
  });

  let rendermime = new RenderMime({ items: RenderMime.getDefaultItems() });
  let editorFactory = editorServices.factoryService.newInlineEditor;
  let contentFactory = new ConsolePanel.ContentFactory({ editorFactory });
  let consolePanel = new ConsolePanel({
    rendermime,
    session,
    contentFactory,
    mimeTypeService: editorServices.mimeTypeService
  });
  consolePanel.title.label = TITLE;

  let palette = new CommandPalette({ commands, keymap });

  let panel = new SplitPanel();
  panel.id = 'main';
  panel.orientation = 'horizontal';
  panel.spacing = 0;
  SplitPanel.setStretch(palette, 0);
  SplitPanel.setStretch(consolePanel, 1);
  Widget.attach(panel, document.body);
  panel.addWidget(palette);
  panel.addWidget(consolePanel);
  window.onresize = () => { panel.update(); };

  let selector = '.jp-ConsolePanel';
  let category = 'Console';
  let command: string;


  command = 'console:clear';
  commands.addCommand(command, {
    label: 'Clear',
    execute: () => { consolePanel.console.clear(); }
  });
  palette.addItem({ command, category });

  command = 'console:execute';
  commands.addCommand(command, {
    label: 'Execute Prompt',
    execute: () => { consolePanel.console.execute(); }
  });
  palette.addItem({ command, category });
  keymap.addBinding({ command,  selector,  keys: ['Enter'] });

  command = 'console:execute-forced';
  commands.addCommand(command, {
    label: 'Execute Cell (forced)',
    execute: () => { consolePanel.console.execute(true); }
  });
  palette.addItem({ command, category });
  keymap.addBinding({ command,  selector,  keys: ['Shift Enter'] });

  command = 'console:linebreak';
  commands.addCommand(command, {
    label: 'Insert Line Break',
    execute: () => { consolePanel.console.insertLinebreak(); }
  });
  palette.addItem({ command, category });
  keymap.addBinding({ command,  selector,  keys: ['Ctrl Enter'] });
}

window.onload = main;
