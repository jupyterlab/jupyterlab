// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import 'es6-promise/auto';  // polyfill Promise on IE
import '@jupyterlab/theme-light-extension/style/embed.css';
import '../index.css';

import {
  CommandRegistry
} from '@phosphor/commands';

import {
  SplitPanel, Widget
} from '@phosphor/widgets';

import {
  ClientSession
} from '@jupyterlab/apputils';

import {
  SessionManager
} from '@jupyterlab/services';

import {
  CodeCellModel, CodeCell
} from '@jupyterlab/cells';

import {
  CompleterModel, Completer, CompletionHandler
} from '@jupyterlab/completer';

import {
  RenderMime, defaultRendererFactories
} from '@jupyterlab/rendermime';


function main(): void {
  let manager = new SessionManager();
  let session = new ClientSession({ manager });
  session.initialize().then(() => { console.log('initialized'); });

  // Initialize the command registry with the bindings.
  let commands = new CommandRegistry();
  let useCapture = true;

  // Setup the keydown listener for the document.
  document.addEventListener('keydown', event => {
    commands.processKeydownEvent(event);
  }, useCapture);

  let rendermime = new RenderMime({
    initialFactories: defaultRendererFactories
  });

  let cellWidget = new CodeCell({
    rendermime,
    model: new CodeCellModel({})
  });

  const editor = cellWidget.editor;
  const model = new CompleterModel();
  const completer = new Completer({ editor, model });
  const handler = new CompletionHandler({ completer, session });

  // Set the handler's editor.
  handler.editor = editor;

  // Hide the widget when it first loads.
  completer.hide();

  let panel = new SplitPanel();
  panel.id = 'main';
  panel.orientation = 'horizontal';
  panel.spacing = 0;
  panel.addWidget(completer);
  panel.addWidget(cellWidget);
  Widget.attach(panel, document.body);

  SplitPanel.setStretch(cellWidget, 1);
  window.onresize = () => panel.update();

  commands.addCommand('invoke:completer', {
    execute: () => { handler.invoke(); }
  });
  commands.addCommand('run:cell', {
    execute: () => CodeCell.execute(cellWidget, session)
  });

  commands.addKeyBinding({
    selector: '.jp-InputArea-editor.jp-mod-completer-enabled',
    keys: ['Tab'],
    command: 'invoke:completer'
  });
  commands.addKeyBinding({
    selector: '.jp-InputArea-editor',
    keys: ['Shift Enter'],
    command: 'run:cell'
  });
}

window.onload = main;
