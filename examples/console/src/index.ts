// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import 'es6-promise/auto';  // polyfill Promise on IE

import {
  CommandRegistry
} from '@phosphor/commands';

import {
  CommandPalette, SplitPanel, Widget
} from '@phosphor/widgets';

import {
  ServiceManager
} from '@jupyterlab/services';

import {
  editorServices
} from '@jupyterlab/codemirror';

import {
  ConsolePanel
} from '@jupyterlab/console';

import {
  RenderMime, defaultRendererFactories
} from '@jupyterlab/rendermime';

import '@jupyterlab/theming/style/index.css';
import '@jupyterlab/theming/style/variables-light.css';
import '../index.css';

let TITLE = 'Console';


function main(): void {
  let path = '';
  let query: { [key: string]: string } = Object.create(null);

  window.location.search.substr(1).split('&').forEach(item => {
    let pair = item.split('=');
    if (pair[0]) {
      query[pair[0]] = pair[1];
    }
  });

  if (query['path']) {
    path = query['path'];
  }

  let manager = new ServiceManager();
  manager.ready.then(() => {
    startApp(path, manager);
  });
}


/**
 * Start the application.
 */
function startApp(path: string, manager: ServiceManager.IManager) {

  // Initialize the command registry with the key bindings.
  let commands = new CommandRegistry();

  // Setup the keydown listener for the document.
  document.addEventListener('keydown', event => {
    commands.processKeydownEvent(event);
  });

  let rendermime = new RenderMime({
    initialFactories: defaultRendererFactories
  });

  let editorFactory = editorServices.factoryService.newInlineEditor.bind(
    editorServices.factoryService);
  let contentFactory = new ConsolePanel.ContentFactory({ editorFactory });
  let consolePanel = new ConsolePanel({
    rendermime,
    manager,
    path,
    contentFactory,
    mimeTypeService: editorServices.mimeTypeService
  });
  consolePanel.title.label = TITLE;

  let palette = new CommandPalette({ commands });

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
  commands.addKeyBinding({ command,  selector,  keys: ['Enter'] });

  command = 'console:execute-forced';
  commands.addCommand(command, {
    label: 'Execute Cell (forced)',
    execute: () => { consolePanel.console.execute(true); }
  });
  palette.addItem({ command, category });
  commands.addKeyBinding({ command,  selector,  keys: ['Shift Enter'] });

  command = 'console:linebreak';
  commands.addCommand(command, {
    label: 'Insert Line Break',
    execute: () => { consolePanel.console.insertLinebreak(); }
  });
  palette.addItem({ command, category });
  commands.addKeyBinding({ command,  selector,  keys: ['Ctrl Enter'] });
}

window.onload = main;
