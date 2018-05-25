// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import 'es6-promise/auto';  // polyfill Promise on IE
import '@jupyterlab/theme-light-extension/static/embed.css';
import '../index.css';

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
  NotebookPanel, NotebookWidgetFactory,
  NotebookModelFactory, NotebookActions
} from '@jupyterlab/notebook';

import {
  CompleterModel, Completer, CompletionHandler, KernelConnector
} from '@jupyterlab/completer';

import {
  editorServices
} from '@jupyterlab/codemirror';

import {
  DocumentManager
} from '@jupyterlab/docmanager';

import {
  DocumentRegistry
} from '@jupyterlab/docregistry';

import {
  RenderMimeRegistry, standardRendererFactories as initialFactories
} from '@jupyterlab/rendermime';


let NOTEBOOK = 'test.ipynb';


/**
 * The map of command ids used by the notebook.
 */
const cmdIds = {
  invoke: 'completer:invoke',
  select: 'completer:select',
  invokeNotebook: 'completer:invoke-notebook',
  selectNotebook: 'completer:select-notebook',
  save: 'notebook:save',
  interrupt: 'notebook:interrupt-kernel',
  restart: 'notebook:restart-kernel',
  switchKernel: 'notebook:switch-kernel',
  runAndAdvance: 'notebook-cells:run-and-advance',
  deleteCell: 'notebook-cells:delete',
  selectAbove: 'notebook-cells:select-above',
  selectBelow: 'notebook-cells:select-below',
  extendAbove: 'notebook-cells:extend-above',
  extendBelow: 'notebook-cells:extend-below',
  editMode: 'notebook:edit-mode',
  merge: 'notebook-cells:merge',
  split: 'notebook-cells:split',
  commandMode: 'notebook:command-mode',
  undo: 'notebook-cells:undo',
  redo: 'notebook-cells:redo'
};


function main(): void {
  let manager = new ServiceManager();
  manager.ready.then(() => {
    createApp(manager);
  });
}


function createApp(manager: ServiceManager.IManager): void {
  // Initialize the command registry with the bindings.
  let commands = new CommandRegistry();
  let useCapture = true;

  // Setup the keydown listener for the document.
  document.addEventListener('keydown', event => {
    commands.processKeydownEvent(event);
  }, useCapture);

  let rendermime = new RenderMimeRegistry({ initialFactories });

  let opener = {
    open: (widget: Widget) => {
      // Do nothing for sibling widgets for now.
    }
  };

  let docRegistry = new DocumentRegistry();
  let docManager = new DocumentManager({
    registry: docRegistry,
    manager,
    opener
  });
  let mFactory = new NotebookModelFactory({});
  let editorFactory = editorServices.factoryService.newInlineEditor;
  let contentFactory = new NotebookPanel.ContentFactory({ editorFactory });

  let wFactory = new NotebookWidgetFactory({
    name: 'Notebook',
    modelName: 'notebook',
    fileTypes: ['notebook'],
    defaultFor: ['notebook'],
    preferKernel: true,
    canStartKernel: true,
    rendermime, contentFactory,
    mimeTypeService: editorServices.mimeTypeService
  });
  docRegistry.addModelFactory(mFactory);
  docRegistry.addWidgetFactory(wFactory);

  let nbWidget = docManager.open(NOTEBOOK) as NotebookPanel;
  let palette = new CommandPalette({ commands });

  const editor = nbWidget.content.activeCell && nbWidget.content.activeCell.editor;
  const model = new CompleterModel();
  const completer = new Completer({ editor, model });
  const connector = new KernelConnector({ session: nbWidget.session });
  const handler = new CompletionHandler({ completer, connector });

  // Set the handler's editor.
  handler.editor = editor;

  // Listen for active cell changes.
  nbWidget.content.activeCellChanged.connect((sender, cell) => {
    handler.editor = cell && cell.editor;
  });

  // Hide the widget when it first loads.
  completer.hide();

  let panel = new SplitPanel();
  panel.id = 'main';
  panel.orientation = 'horizontal';
  panel.spacing = 0;
  SplitPanel.setStretch(palette, 0);
  SplitPanel.setStretch(nbWidget, 1);
  panel.addWidget(completer);
  panel.addWidget(palette);
  panel.addWidget(nbWidget);

  // Attach the panel to the DOM.
  Widget.attach(panel, document.body);

  // Handle resize events.
  window.addEventListener('resize', () => { panel.update(); });

  // Add commands.
  commands.addCommand(cmdIds.invoke, {
    label: 'Completer: Invoke',
    execute: () => handler.invoke()
  });
  commands.addCommand(cmdIds.select, {
    label: 'Completer: Select',
    execute: () => handler.completer.selectActive()
  });
  commands.addCommand(cmdIds.invokeNotebook, {
    label: 'Invoke Notebook',
    execute: () => {
      if (nbWidget.content.activeCell.model.type === 'code') {
        return commands.execute(cmdIds.invoke);
      }
    }
  });
  commands.addCommand(cmdIds.selectNotebook, {
    label: 'Select Notebook',
    execute: () => {
      if (nbWidget.content.activeCell.model.type === 'code') {
        return commands.execute(cmdIds.select);
      }
    }
  });
  commands.addCommand(cmdIds.save, {
    label: 'Save',
    execute: () => nbWidget.context.save()
  });
  commands.addCommand(cmdIds.interrupt, {
    label: 'Interrupt',
    execute: () => {
      if (nbWidget.context.session.kernel) {
        nbWidget.context.session.kernel.interrupt();
      }
    }
  });
  commands.addCommand(cmdIds.restart, {
    label: 'Restart Kernel',
    execute: () => nbWidget.context.session.restart()
  });
  commands.addCommand(cmdIds.switchKernel, {
    label: 'Switch Kernel',
    execute: () => nbWidget.context.session.selectKernel()
  });
  commands.addCommand(cmdIds.runAndAdvance, {
    label: 'Run and Advance',
    execute: () => {
      NotebookActions.runAndAdvance(nbWidget.content, nbWidget.context.session);
    }
  });
  commands.addCommand(cmdIds.editMode, {
    label: 'Edit Mode',
    execute: () => { nbWidget.content.mode = 'edit'; }
  });
  commands.addCommand(cmdIds.commandMode, {
    label: 'Command Mode',
    execute: () => { nbWidget.content.mode = 'command'; }
  });
  commands.addCommand(cmdIds.selectBelow, {
    label: 'Select Below',
    execute: () => NotebookActions.selectBelow(nbWidget.content)
  });
  commands.addCommand(cmdIds.selectAbove, {
    label: 'Select Above',
    execute: () => NotebookActions.selectAbove(nbWidget.content)
  });
  commands.addCommand(cmdIds.extendAbove, {
    label: 'Extend Above',
    execute: () => NotebookActions.extendSelectionAbove(nbWidget.content)
  });
  commands.addCommand(cmdIds.extendBelow, {
    label: 'Extend Below',
    execute: () => NotebookActions.extendSelectionBelow(nbWidget.content)
  });
  commands.addCommand(cmdIds.merge, {
    label: 'Merge Cells',
    execute: () => NotebookActions.mergeCells(nbWidget.content)
  });
  commands.addCommand(cmdIds.split, {
    label: 'Split Cell',
    execute: () => NotebookActions.splitCell(nbWidget.content)
  });
  commands.addCommand(cmdIds.undo, {
    label: 'Undo',
    execute: () => NotebookActions.undo(nbWidget.content)
  });
  commands.addCommand(cmdIds.redo, {
    label: 'Redo',
    execute: () => NotebookActions.redo(nbWidget.content)
  });

  let category = 'Notebook Operations';
  [
    cmdIds.interrupt,
    cmdIds.restart,
    cmdIds.editMode,
    cmdIds.commandMode,
    cmdIds.switchKernel
  ].forEach(command => palette.addItem({ command, category }));

  category = 'Notebook Cell Operations';
  [
    cmdIds.runAndAdvance,
    cmdIds.split,
    cmdIds.merge,
    cmdIds.selectAbove,
    cmdIds.selectBelow,
    cmdIds.extendAbove,
    cmdIds.extendBelow,
    cmdIds.undo,
    cmdIds.redo
  ].forEach(command => palette.addItem({ command, category }));

  let bindings = [
  {
    selector: '.jp-Notebook.jp-mod-editMode .jp-mod-completer-enabled',
    keys: ['Tab'],
    command: cmdIds.invokeNotebook
  },
  {
    selector: `.jp-mod-completer-enabled`,
    keys: ['Enter'],
    command: cmdIds.selectNotebook
  },
  {
    selector: '.jp-Notebook',
    keys: ['Shift Enter'],
    command: cmdIds.runAndAdvance
  },
  {
    selector: '.jp-Notebook',
    keys: ['Accel S'],
    command: cmdIds.save
  },
  {
    selector: '.jp-Notebook.jp-mod-commandMode:focus',
    keys: ['I', 'I'],
    command: cmdIds.interrupt
  },
  {
    selector: '.jp-Notebook.jp-mod-commandMode:focus',
    keys: ['0', '0'],
    command: cmdIds.restart
  },
  {
    selector: '.jp-Notebook.jp-mod-commandMode:focus',
    keys: ['Enter'],
    command: cmdIds.editMode
  },
  {
    selector: '.jp-Notebook.jp-mod-editMode',
    keys: ['Escape'],
    command: cmdIds.commandMode
  },
  {
    selector: '.jp-Notebook.jp-mod-commandMode:focus',
    keys: ['Shift M'],
    command: cmdIds.merge
  },
  {
    selector: '.jp-Notebook.jp-mod-editMode',
    keys: ['Ctrl Shift -'],
    command: cmdIds.split
  },
  {
    selector: '.jp-Notebook.jp-mod-commandMode:focus',
    keys: ['J'],
    command: cmdIds.selectBelow
  },
  {
    selector: '.jp-Notebook.jp-mod-commandMode:focus',
    keys: ['ArrowDown'],
    command: cmdIds.selectBelow
  },
  {
    selector: '.jp-Notebook.jp-mod-commandMode:focus',
    keys: ['K'],
    command: cmdIds.selectAbove
  },
  {
    selector: '.jp-Notebook.jp-mod-commandMode:focus',
    keys: ['ArrowUp'],
    command: cmdIds.selectAbove
  },
  {
    selector: '.jp-Notebook.jp-mod-commandMode:focus',
    keys: ['Shift K'],
    command: cmdIds.extendAbove
  },
  {
    selector: '.jp-Notebook.jp-mod-commandMode:focus',
    keys: ['Shift J'],
    command: cmdIds.extendBelow
  },
  {
    selector: '.jp-Notebook.jp-mod-commandMode:focus',
    keys: ['Z'],
    command: cmdIds.undo
  },
    {
    selector: '.jp-Notebook.jp-mod-commandMode:focus',
    keys: ['Y'],
    command: cmdIds.redo
  }
  ];
  bindings.map(binding => commands.addKeyBinding(binding));
}

window.addEventListener('load', main);
