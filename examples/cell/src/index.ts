// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import 'es6-promise/auto';  // polyfill Promise on IE
import '@jupyterlab/theme-light-extension/static/embed.css';
import '../index.css';

import {
  ClientSession, Toolbar
} from '@jupyterlab/apputils';

import {
  CodeCellModel, CodeCell
} from '@jupyterlab/cells';

import {
  CodeMirrorMimeTypeService
} from '@jupyterlab/codemirror';

import {
  CompleterModel, Completer, CompletionHandler, KernelConnector
} from '@jupyterlab/completer';

import {
  RenderMimeRegistry, standardRendererFactories as initialFactories
} from '@jupyterlab/rendermime';

import {
  SessionManager
} from '@jupyterlab/services';

import {
  CommandRegistry
} from '@phosphor/commands';

import {
  BoxPanel, Widget
} from '@phosphor/widgets';


function main(): void {
  const manager = new SessionManager();
  const session = new ClientSession({ manager, name: 'Example' });
  const mimeService = new CodeMirrorMimeTypeService();

  // Initialize the command registry with the bindings.
  const commands = new CommandRegistry();
  const useCapture = true;

  // Setup the keydown listener for the document.
  document.addEventListener('keydown', event => {
    commands.processKeydownEvent(event);
  }, useCapture);

  // Create the cell widget with a default rendermime instance.
  const rendermime = new RenderMimeRegistry({ initialFactories });

  const cellWidget = new CodeCell({
    rendermime,
    model: new CodeCellModel({})
  });

  // Handle the mimeType for the current kernel.
  session.kernelChanged.connect(() => {
    session.kernel.ready.then(() => {
      const lang = session.kernel.info.language_info;
      const mimeType = mimeService.getMimeTypeByLanguage(lang);
      cellWidget.model.mimeType = mimeType;
    });
  });

  // Start the default kernel.
  session.kernelPreference = { autoStartDefault: true };
  session.initialize();

  // Set up a completer.
  const editor = cellWidget.editor;
  const model = new CompleterModel();
  const completer = new Completer({ editor, model });
  const connector = new KernelConnector({ session });
  const handler = new CompletionHandler({ completer, connector });

  // Set the handler's editor.
  handler.editor = editor;

  // Hide the widget when it first loads.
  completer.hide();

  // Create a toolbar for the cell.
  const toolbar = new Toolbar();
  toolbar.addItem('spacer', Toolbar.createSpacerItem());
  toolbar.addItem('interrupt', Toolbar.createInterruptButton(session));
  toolbar.addItem('restart', Toolbar.createRestartButton(session));
  toolbar.addItem('name', Toolbar.createKernelNameItem(session));
  toolbar.addItem('status', Toolbar.createKernelStatusItem(session));

  // Lay out the widgets.
  const panel = new BoxPanel();
  panel.id = 'main';
  panel.direction = 'top-to-bottom';
  panel.spacing = 0;
  panel.addWidget(completer);
  panel.addWidget(toolbar);
  panel.addWidget(cellWidget);
  BoxPanel.setStretch(toolbar, 0);
  BoxPanel.setStretch(cellWidget, 1);

  // Attach the panel to the DOM.
  Widget.attach(panel, document.body);

  // Handle widget state.
  window.addEventListener('resize', () => { panel.update(); });
  cellWidget.activate();

  // Add the commands.
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

window.addEventListener('load', main);

