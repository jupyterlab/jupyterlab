// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { PageConfig, URLExt } from '@jupyterlab/coreutils';
// @ts-ignore
__webpack_public_path__ = URLExt.join(PageConfig.getBaseUrl(), 'example/');

import '@jupyterlab/application/style/index.css';
import '@jupyterlab/console/style/index.css';
import '@jupyterlab/theme-light-extension/style/index.css';
import '../index.css';

import { CommandRegistry } from '@lumino/commands';

import { CommandPalette, SplitPanel, Widget } from '@lumino/widgets';

import { ServiceManager } from '@jupyterlab/services';

import { editorServices } from '@jupyterlab/codemirror';

import { ConsolePanel } from '@jupyterlab/console';

import {
  RenderMimeRegistry,
  standardRendererFactories as initialFactories
} from '@jupyterlab/rendermime';

const TITLE = 'Console';

function main(): void {
  console.debug('in main');
  let path = '';
  const query: { [key: string]: string } = Object.create(null);

  window.location.search
    .substr(1)
    .split('&')
    .forEach(item => {
      const pair = item.split('=');
      if (pair[0]) {
        query[pair[0]] = pair[1];
      }
    });

  if (query['path']) {
    path = query['path'];
  }

  const manager = new ServiceManager();
  void manager.ready.then(() => {
    startApp(path, manager);
  });
}

/**
 * Start the application.
 */
function startApp(path: string, manager: ServiceManager.IManager) {
  console.debug('starting app');
  // Initialize the command registry with the key bindings.
  const commands = new CommandRegistry();

  // Setup the keydown listener for the document.
  document.addEventListener('keydown', event => {
    commands.processKeydownEvent(event);
  });

  const rendermime = new RenderMimeRegistry({ initialFactories });

  const editorFactory = editorServices.factoryService.newInlineEditor;
  const contentFactory = new ConsolePanel.ContentFactory({ editorFactory });
  const consolePanel = new ConsolePanel({
    rendermime,
    manager,
    path,
    contentFactory,
    mimeTypeService: editorServices.mimeTypeService
  });
  consolePanel.title.label = TITLE;

  const palette = new CommandPalette({ commands });

  const panel = new SplitPanel();
  panel.id = 'main';
  panel.orientation = 'horizontal';
  panel.spacing = 0;
  SplitPanel.setStretch(palette, 0);
  SplitPanel.setStretch(consolePanel, 1);
  panel.addWidget(palette);
  panel.addWidget(consolePanel);

  // Attach the panel to the DOM.
  Widget.attach(panel, document.body);

  // Handle resize events.
  window.addEventListener('resize', () => {
    panel.update();
  });

  const selector = '.jp-ConsolePanel';
  const category = 'Console';
  let command: string;

  // Add the commands.
  command = 'console:clear';
  commands.addCommand(command, {
    label: 'Clear',
    execute: () => {
      consolePanel.console.clear();
    }
  });
  palette.addItem({ command, category });

  command = 'console:execute';
  commands.addCommand(command, {
    label: 'Execute Prompt',
    execute: () => {
      return consolePanel.console.execute();
    }
  });
  palette.addItem({ command, category });
  commands.addKeyBinding({ command, selector, keys: ['Enter'] });

  command = 'console:execute-forced';
  commands.addCommand(command, {
    label: 'Execute Cell (forced)',
    execute: () => {
      return consolePanel.console.execute(true);
    }
  });
  palette.addItem({ command, category });
  commands.addKeyBinding({ command, selector, keys: ['Shift Enter'] });

  command = 'console:linebreak';
  commands.addCommand(command, {
    label: 'Insert Line Break',
    execute: () => {
      consolePanel.console.insertLinebreak();
    }
  });
  palette.addItem({ command, category });
  commands.addKeyBinding({ command, selector, keys: ['Ctrl Enter'] });

  console.debug('Example started!');
}

window.addEventListener('load', main);
