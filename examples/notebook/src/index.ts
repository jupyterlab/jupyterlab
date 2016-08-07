// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  NotebookPanel, NotebookWidgetFactory,
  NotebookModelFactory, NotebookActions
} from 'jupyterlab/lib/notebook';

import {
  IServiceManager, createServiceManager
} from 'jupyter-js-services';

import {
  DocumentManager
} from 'jupyterlab/lib/docmanager';

import {
  DocumentRegistry, restartKernel, selectKernelForContext
} from 'jupyterlab/lib/docregistry';

import {
  RenderMime
} from 'jupyterlab/lib/rendermime';

import {
  HTMLRenderer, LatexRenderer, ImageRenderer, TextRenderer,
  JavascriptRenderer, SVGRenderer, MarkdownRenderer
} from 'jupyterlab/lib/renderers';

import {
  defaultSanitizer
} from 'jupyterlab/lib/sanitizer';

import {
  MimeData
} from 'phosphor/lib/core/mimedata';

import {
  CommandRegistry
} from 'phosphor/lib/ui/commandregistry';

import {
  CommandPalette
} from 'phosphor/lib/ui/commandpalette';

import {
  Keymap
} from 'phosphor/lib/ui/keymap';

import {
  SplitPanel
} from 'phosphor/lib/ui/splitpanel';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import 'jupyterlab/lib/dialog/index.css';
import 'jupyterlab/lib/dialog/theme.css';
import 'jupyterlab/lib/iframe/index.css';
import 'jupyterlab/lib/notebook/index.css';
import 'jupyterlab/lib/notebook/theme.css';
import 'jupyterlab/lib/notebook/completion/index.css';

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
  createServiceManager().then(manager => {
    createApp(manager);
  });
}


function createApp(manager: IServiceManager): void {
  // Initialize the keymap manager with the bindings.
  let commands = new CommandRegistry();
  let keymap = new Keymap({ commands });
  let useCapture = true;

  // Setup the keydown listener for the document.
  document.addEventListener('keydown', event => {
    keymap.processKeydownEvent(event);
  }, useCapture);

  const transformers = [
    new JavascriptRenderer(),
    new MarkdownRenderer(),
    new HTMLRenderer(),
    new ImageRenderer(),
    new SVGRenderer(),
    new LatexRenderer(),
    new TextRenderer()
  ];
  let renderers: RenderMime.MimeMap<RenderMime.IRenderer> = {};
  let order: string[] = [];
  for (let t of transformers) {
    for (let m of t.mimetypes) {
      renderers[m] = t;
      order.push(m);
    }
  }
  let sanitizer = defaultSanitizer;
  let rendermime = new RenderMime({ renderers, order, sanitizer });

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
  let mFactory = new NotebookModelFactory();
  let clipboard = new MimeData();
  let wFactory = new NotebookWidgetFactory(rendermime, clipboard);
  docRegistry.addModelFactory(mFactory);
  docRegistry.addWidgetFactory(wFactory, {
    displayName: 'Notebook',
    modelName: 'notebook',
    fileExtensions: ['.ipynb'],
    defaultFor: ['.ipynb'],
    preferKernel: true,
    canStartKernel: true
  });

  let nbWidget = docManager.open(NOTEBOOK) as NotebookPanel;
  let palette = new CommandPalette({ commands, keymap });

  let panel = new SplitPanel();
  panel.id = 'main';
  panel.orientation = 'horizontal';
  panel.spacing = 0;
  SplitPanel.setStretch(palette, 0);
  Widget.attach(panel, document.body);
  panel.addWidget(palette);
  panel.addWidget(nbWidget);
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
    execute: () => restartKernel(nbWidget.kernel, nbWidget.node)
  });
  commands.addCommand(cmdIds.switchKernel, {
    label: 'Switch Kernel',
    execute: () => selectKernelForContext(nbWidget.context, nbWidget.node)
  });
  commands.addCommand(cmdIds.runAndAdvance, {
    label: 'Run and Advance',
    execute: () => {
      NotebookActions.runAndAdvance(nbWidget.content, nbWidget.context.kernel);
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
    selector: '.jp-Notebook.jp-mod-commandMode',
    keys: ['I', 'I'],
    command: cmdIds.interrupt
  },
  {
    selector: '.jp-Notebook.jp-mod-commandMode',
    keys: ['0', '0'],
    command: cmdIds.restart
  },
  {
    selector: '.jp-Notebook.jp-mod-commandMode',
    keys: ['Enter'],
    command: cmdIds.editMode
  },
  {
    selector: '.jp-Notebook.jp-mod-editMode',
    keys: ['Escape'],
    command: cmdIds.commandMode
  },
  {
    selector: '.jp-Notebook.jp-mod-commandMode',
    keys: ['Shift M'],
    command: cmdIds.merge
  },
  {
    selector: '.jp-Notebook.jp-mod-editMode',
    keys: ['Ctrl Shift -'],
    command: cmdIds.split
  },
  {
    selector: '.jp-Notebook.jp-mod-commandMode',
    keys: ['J'],
    command: cmdIds.selectBelow
  },
  {
    selector: '.jp-Notebook.jp-mod-commandMode',
    keys: ['ArrowDown'],
    command: cmdIds.selectBelow
  },
  {
    selector: '.jp-Notebook.jp-mod-commandMode',
    keys: ['K'],
    command: cmdIds.selectAbove
  },
  {
    selector: '.jp-Notebook.jp-mod-commandMode',
    keys: ['ArrowUp'],
    command: cmdIds.selectAbove
  },
  {
    selector: '.jp-Notebook.jp-mod-commandMode',
    keys: ['Shift K'],
    command: cmdIds.extendAbove
  },
  {
    selector: '.jp-Notebook.jp-mod-commandMode',
    keys: ['Shift J'],
    command: cmdIds.extendBelow
  },
  {
    selector: '.jp-Notebook.jp-mod-commandMode',
    keys: ['Z'],
    command: cmdIds.undo
  },
    {
    selector: '.jp-Notebook.jp-mod-commandMode',
    keys: ['Y'],
    command: cmdIds.redo
  }
  ];
  bindings.map(binding => keymap.addBinding(binding));
}

window.onload = main;
