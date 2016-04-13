// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  NotebookWidget, NotebookModel, serialize, INotebookModel, deserialize,
  NotebookManager, NotebookToolbar, selectKernel,
  findKernel, NotebookFileHandler, NotebookCreator, NotebookPanel
} from 'jupyter-js-notebook';

import {
  IContentsModel, IContentsManager, IContentsOpts,
  INotebookSessionManager, INotebookSession, IKernelSpecIds,
  IKernelMessage, IComm, KernelStatus, getKernelSpecs
} from 'jupyter-js-services';

import {
  RenderMime
} from 'jupyter-js-ui/lib/rendermime';

import {
  HTMLRenderer, LatexRenderer, ImageRenderer, TextRenderer,
  ConsoleTextRenderer, JavascriptRenderer, SVGRenderer
} from 'jupyter-js-ui/lib/renderers';

import {
  showDialog
} from 'jupyter-js-ui/lib/dialog';

import {
  FileHandlerRegistry
} from 'jupyter-js-ui/lib/filehandler';

import {
  Application
} from 'phosphide/lib/core/application';

import {
  Panel, PanelLayout
} from 'phosphor-panel';

import {
  IChangedArgs
} from 'phosphor-properties';

import {
  Widget
} from 'phosphor-widget';

import {
  JupyterServices
} from '../services/plugin';

import {
   WidgetManager
} from './widgetmanager';


/**
 * The map of command ids used by the notebook.
 */
const cmdIds = {
  interrupt: 'notebook:interrupt-kernel',
  restart: 'notebook:restart-kernel',
  switchKernel: 'notebook:switch-kernel',
  run: 'notebook-cells:run',
  runAndAdvance: 'notebook-cells:runAndAdvance',
  runAndInsert: 'notebook-cells:runAndInsert',
  toCode: 'notebook-cells:to-code',
  toMarkdown: 'notebook-cells:to-markdown',
  toRaw: 'notebook-cells:to-raw',
  cut: 'notebook-cells:cut',
  copy: 'notebook-cells:copy',
  paste: 'notebook-cells:paste',
  insertAbove: 'notebook-cells:insert-above',
  insertBelow: 'notebook-cells:insert-below',
  selectPrevious: 'notebook-cells:select-previous',
  selectNext: 'notebook-cells:select-next',
  toggleLinenumbers: 'notebook-cells:toggle-linenumbers',
  toggleAllLinenumbers: 'notebook:toggle-allLinenumbers',
  editMode: 'notebook-cells:editMode',
  commandMode: 'notebook-cells:commandMode'
};


/**
 * The class name added to notebook container widgets.
 */
const NB_CONTAINER = 'jp-Notebook-container';

/**
 * The class name added to notebook panels.
 */
const NB_PANE = 'jp-Notebook-panel';


/**
 * The class name added to the widget area.
 */
let WIDGET_CLASS = 'jp-NotebookPane-widget';


/**
 * The notebook file handler provider.
 */
export
const notebookHandlerExtension = {
  id: 'jupyter.extensions.notebookHandler',
  requires: [FileHandlerRegistry, JupyterServices, RenderMime],
  activate: activateNotebookHandler
};


/**
 * Activate the notebook handler extension.
 */
function activateNotebookHandler(app: Application, registry: FileHandlerRegistry, services: JupyterServices, rendermime: RenderMime<Widget>): Promise<void> {
  let handler = new NotebookFileHandler(
    services.contentsManager,
    services.notebookSessionManager,
    rendermime
  );
  registry.addHandler(handler);

  let creator = new NotebookCreator(handler);
  registry.addCreator('New Notebook', creator.createNew.bind(creator));

  // Temporary notebook focus follower.
  let activeWidget: NotebookPanel;
  let widgets: NotebookPanel[] = [];
  document.body.addEventListener('focus', event => {
    for (let widget of widgets) {
      let target = event.target as HTMLElement;
      if (widget.isAttached && widget.isVisible) {
        if (widget.node.contains(target)) {
          activeWidget = widget;
          return;
        }
      }
    }
  });

  // Add opened notebooks to the widget list temporarily
  handler.opened.connect((h, widget) => {
    activeWidget = widget;
    widgets.push(widget);
  });

  app.commands.add([
  {
    id: cmdIds['runAndAdvance'],
    handler: () => {
      let manager = activeWidget.manager;
      if (manager) manager.runAndAdvance();
    }
  },
  {
    id: cmdIds['run'],
    handler: () => {
      let manager = activeWidget.manager;
      if (manager) manager.run();
    }
  },
  {
    id: cmdIds['runAndInsert'],
    handler: () => {
      let manager = activeWidget.manager;
      if (manager) manager.runAndInsert();
    }
  },
  {
    id: cmdIds['restart'],
    handler: () => {
      let manager = activeWidget.manager;
      if (manager) manager.restart();
    }
  },
  {
    id: cmdIds['interrupt'],
    handler: () => {
      let manager = activeWidget.manager;
      if (manager) manager.interrupt();
    }
  },
  {
    id: cmdIds['toCode'],
    handler: () => {
      let manager = activeWidget.manager;
      if (manager) manager.changeCellType('code'); }
  },
  {
    id: cmdIds['toMarkdown'],
    handler: () => {
      let manager = activeWidget.manager;
      if (manager) manager.changeCellType('markdown'); }
  },
  {
    id: cmdIds['toRaw'],
    handler: () => {
      let manager = activeWidget.manager;
      if (manager) manager.changeCellType('raw');
    }
  },
  {
    id: cmdIds['cut'],
    handler: () => {
      let manager = activeWidget.manager;
      if (manager) manager.cut();
    }
  },
  {
    id: cmdIds['copy'],
    handler: () => {
      let manager = activeWidget.manager;
      if (manager) manager.copy();
    }
  },
  {
    id: cmdIds['paste'],
    handler: () => {
      let manager = activeWidget.manager;
      if (manager) manager.paste();
    }
  },
  {
    id: cmdIds['insertAbove'],
    handler: () => {
      let manager = activeWidget.manager;
      if (manager) manager.insertAbove();
    }
  },
  {
    id: cmdIds['insertBelow'],
    handler: () => {
      let manager = activeWidget.manager;
      if (manager) manager.insertBelow();
    }
  },
  {
    id: cmdIds['selectPrevious'],
    handler: () => {
      let model = activeWidget.model;
      if (model) model.activeCellIndex -= 1;
    }
  },
  {
    id: cmdIds['selectNext'],
    handler: () => {
      let model = activeWidget.model;;
      if (model) model.activeCellIndex += 1;
    }
  },
  {
    id: cmdIds['toggleLinenumbers'],
    handler: () => {
      let model = activeWidget.model;
      if (model) {
        let cell = model.cells.get(model.activeCellIndex);
        let lineNumbers = cell.input.textEditor.lineNumbers;
        for (let i = 0; i < model.cells.length; i++) {
          cell = model.cells.get(i);
          if (model.isSelected(cell) || i === model.activeCellIndex) {
            cell.input.textEditor.lineNumbers = !lineNumbers;
          }
        }
      }
    }
  },
  {
    id: cmdIds['toggleAllLinenumbers'],
    handler: () => {
      let model = activeWidget.model;
      if (model) {
        let cell = model.cells.get(model.activeCellIndex);
        let lineNumbers = cell.input.textEditor.lineNumbers;
        for (let i = 0; i < model.cells.length; i++) {
          cell = model.cells.get(i);
          cell.input.textEditor.lineNumbers = !lineNumbers;
        }
      }
    }
  },
  {
    id: cmdIds['commandMode'],
    handler: () => {
      let model = activeWidget.model;
      if (model) model.mode = 'command';
    }
  },
  {
    id: cmdIds['editMode'],
    handler: () => {
      let model = activeWidget.model;
      if (model) model.mode = 'edit';
    }
  }
  ]);
  app.palette.add([
  {
    command: cmdIds['run'],
    category: 'Notebook Cell Operations',
    text: 'Run selected'
  },
  {
    command: cmdIds['runAndAdvance'],
    category: 'Notebook Cell Operations',
    text: 'Run and Advance'
  },
  {
    command: cmdIds['runAndInsert'],
    category: 'Notebook Cell Operations',
    text: 'Run and Insert'
  },
  {
    command: cmdIds['interrupt'],
    category: 'Notebook Operations',
    text: 'Interrupt Kernel'
  },
  {
    command: cmdIds['restart'],
    category: 'Notebook Operations',
    text: 'Restart Kernel'
  },
  {
    command: cmdIds['toCode'],
    category: 'Notebook Cell Operations',
    text: 'Covert to Code'
  },
  {
    command: cmdIds['toMarkdown'],
    category: 'Notebook Cell Operations',
    text: 'Covert to Markdown'
  },
  {
    command: cmdIds['toRaw'],
    category: 'Notebook Cell Operations',
    text: 'Covert to Raw'
  },
  {
    command: cmdIds['cut'],
    category: 'Notebook Cell Operations',
    text: 'Cut selected'
  },
  {
    command: cmdIds['copy'],
    category: 'Notebook Cell Operations',
    text: 'Copy selected'
  },
  {
    command: cmdIds['paste'],
    category: 'Notebook Cell Operations',
    text: 'Paste cell(s)'
  },
  {
    command: cmdIds['insertAbove'],
    category: 'Notebook Cell Operations',
    text: 'Insert cell above'
  },
  {
    command: cmdIds['insertBelow'],
    category: 'Notebook Cell Operations',
    text: 'Insert cell below'
  },
  {
    command: cmdIds['selectPrevious'],
    category: 'Notebook Cell Operations',
    text: 'Select previous cell'
  },
  {
    command: cmdIds['selectNext'],
    category: 'Notebook Cell Operations',
    text: 'Select next cell'
  },
  {
    command: cmdIds['toggleLinenumbers'],
    category: 'Notebook Cell Operations',
    text: 'Toggle line numbers'
  },
  {
    command: cmdIds['toggleAllLinenumbers'],
    category: 'Notebook Operations',
    text: 'Toggle all line numbers'
  },
  {
    command: cmdIds['editMode'],
    category: 'Notebook Cell Operations',
    text: 'To Edit Mode'
  },
  {
    command: cmdIds['commandMode'],
    category: 'Notebook Cell Operations',
    text: 'To Command Mode'
  }
  ]);

  getKernelSpecs({}).then(specs => {
    app.commands.add([
    {
      id: cmdIds['switchKernel'],
      handler: () => {
        let model = activeWidget.model;
        let name = model.kernelspec.name;
        if (model) selectKernel(activeWidget.parent.node, name, specs);
      }
    }]);
    app.palette.add([
    {
      command: cmdIds['switchKernel'],
      category: 'Notebook Operations',
      text: 'Switch Kernel'
    }]);
  });

  return Promise.resolve(void 0);
}
