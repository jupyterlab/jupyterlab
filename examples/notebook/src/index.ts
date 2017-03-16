// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

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
  restartKernel
} from '@jupyterlab/apputils';

import {
  editorServices
} from '@jupyterlab/codemirror';

import {
  DocumentManager
} from '@jupyterlab/docmanager';

import {
  DocumentRegistry, selectKernelForContext
} from '@jupyterlab/docregistry';

import {
  RenderMime
} from '@jupyterlab/rendermime';

import '@jupyterlab/default-theme/style/index.css';
import '../index.css';


let NOTEBOOK = 'test.ipynb';


/**
 * The map of command ids used by the notebook.
 */
const cmdIds = {
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

  let rendermime = new RenderMime({ items: RenderMime.getDefaultItems() });
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
  let editorFactory = editorServices.factoryService.newInlineEditor.bind(
    editorServices.factoryService);
  let contentFactory = new NotebookPanel.ContentFactory({ editorFactory });

  let wFactory = new NotebookWidgetFactory({
    name: 'Notebook',
    modelName: 'notebook',
    fileExtensions: ['.ipynb'],
    defaultFor: ['.ipynb'],
    preferKernel: true,
    canStartKernel: true,
    rendermime, contentFactory,
    mimeTypeService: editorServices.mimeTypeService
  });
  docRegistry.addModelFactory(mFactory);
  docRegistry.addWidgetFactory(wFactory);

  let nbWidget = docManager.open(NOTEBOOK) as NotebookPanel;
  let palette = new CommandPalette({ commands });

  let panel = new SplitPanel();
  panel.id = 'main';
  panel.orientation = 'horizontal';
  panel.spacing = 0;
  SplitPanel.setStretch(palette, 0);
  panel.addWidget(palette);
  panel.addWidget(nbWidget);
  Widget.attach(panel, document.body);

  SplitPanel.setStretch(nbWidget, 1);
  window.onresize = () => panel.update();

  commands.addCommand(cmdIds.save, {
    label: 'Save',
    execute: () => nbWidget.context.save()
  });
  commands.addCommand(cmdIds.interrupt, {
    label: 'Interrupt',
    execute: () => {
      if (nbWidget.context.kernel) {
        nbWidget.context.kernel.interrupt();
      }
    }
  });
  commands.addCommand(cmdIds.restart, {
    label: 'Restart Kernel',
    execute: () => restartKernel(nbWidget.kernel, nbWidget)
  });
  commands.addCommand(cmdIds.switchKernel, {
    label: 'Switch Kernel',
    execute: () => selectKernelForContext(nbWidget.context, manager.sessions, nbWidget)
  });
  commands.addCommand(cmdIds.runAndAdvance, {
    label: 'Run and Advance',
    execute: () => {
      NotebookActions.runAndAdvance(nbWidget.notebook, nbWidget.context.kernel);
    }
  });
  commands.addCommand(cmdIds.editMode, {
    label: 'Edit Mode',
    execute: () => { nbWidget.notebook.mode = 'edit'; }
  });
  commands.addCommand(cmdIds.commandMode, {
    label: 'Command Mode',
    execute: () => { nbWidget.notebook.mode = 'command'; }
  });
  commands.addCommand(cmdIds.selectBelow, {
    label: 'Select Below',
    execute: () => NotebookActions.selectBelow(nbWidget.notebook)
  });
  commands.addCommand(cmdIds.selectAbove, {
    label: 'Select Above',
    execute: () => NotebookActions.selectAbove(nbWidget.notebook)
  });
  commands.addCommand(cmdIds.extendAbove, {
    label: 'Extend Above',
    execute: () => NotebookActions.extendSelectionAbove(nbWidget.notebook)
  });
  commands.addCommand(cmdIds.extendBelow, {
    label: 'Extend Below',
    execute: () => NotebookActions.extendSelectionBelow(nbWidget.notebook)
  });
  commands.addCommand(cmdIds.merge, {
    label: 'Merge Cells',
    execute: () => NotebookActions.mergeCells(nbWidget.notebook)
  });
  commands.addCommand(cmdIds.split, {
    label: 'Split Cell',
    execute: () => NotebookActions.splitCell(nbWidget.notebook)
  });
  commands.addCommand(cmdIds.undo, {
    label: 'Undo',
    execute: () => NotebookActions.undo(nbWidget.notebook)
  });
  commands.addCommand(cmdIds.redo, {
    label: 'Redo',
    execute: () => NotebookActions.redo(nbWidget.notebook)
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

window.onload = main;
