// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Application
} from 'phosphide/lib/core/application';

import {
  MimeData as IClipboard
} from 'phosphor-dragdrop';

import {
  Widget
} from 'phosphor-widget';

import {
  DocumentRegistry, restartKernel, selectKernelForContext
} from '../docregistry';

import {
  RenderMime
} from '../rendermime';

import {
  JupyterServices
} from '../services/plugin';

import {
  WidgetTracker
} from '../widgettracker';

import {
  NotebookPanel, NotebookModelFactory, NotebookWidgetFactory, NotebookActions
} from './index';


/**
 * The map of command ids used by the notebook.
 */
const cmdIds = {
  interrupt: 'notebook:interrupt-kernel',
  restart: 'notebook:restart-kernel',
  restartClear: 'notebook:restart-clear',
  restartRunAll: 'notebook:restart-runAll',
  switchKernel: 'notebook:switch-kernel',
  clearAllOutputs: 'notebook:clear-outputs',
  run: 'notebook-cells:run',
  runAndAdvance: 'notebook-cells:runAndAdvance',
  runAndInsert: 'notebook-cells:runAndInsert',
  runAll: 'notebook:run-all',
  toCode: 'notebook-cells:to-code',
  toMarkdown: 'notebook-cells:to-markdown',
  toRaw: 'notebook-cells:to-raw',
  cut: 'notebook-cells:cut',
  copy: 'notebook-cells:copy',
  paste: 'notebook-cells:paste',
  clearOutputs: 'notebook-cells:clear-output',
  deleteCell: 'notebook-cells:delete',
  insertAbove: 'notebook-cells:insert-above',
  insertBelow: 'notebook-cells:insert-below',
  selectAbove: 'notebook-cells:select-above',
  selectBelow: 'notebook-cells:select-below',
  extendAbove: 'notebook-cells:extend-above',
  extendBelow: 'notebook-cells:extend-below',
  editMode: 'notebook:editMode',
  merge: 'notebook-cells:merge',
  split: 'notebook-cells:split',
  commandMode: 'notebook:commandMode',
  newNotebook: 'notebook:create-new',
  toggleLines: 'notebook-cells:toggle-lineNumbers',
  toggleAllLines: 'notebook-cells:toggle-allLineNumbers',
  undo: 'notebook-cells:undo',
  redo: 'notebook-cells:redo'
};


/**
 * The notebook file handler provider.
 */
export
const notebookHandlerExtension = {
  id: 'jupyter.extensions.notebookHandler',
  requires: [DocumentRegistry, JupyterServices, RenderMime, IClipboard, WidgetTracker],
  activate: activateNotebookHandler
};


/**
 * Activate the notebook handler extension.
 */
function activateNotebookHandler(app: Application, registry: DocumentRegistry, services: JupyterServices, rendermime: RenderMime<Widget>, clipboard: IClipboard, tracker: WidgetTracker): void {

  let widgetFactory = new NotebookWidgetFactory(rendermime, clipboard);
  registry.addModelFactory(new NotebookModelFactory());
  registry.addWidgetFactory(widgetFactory,
  {
    fileExtensions: ['.ipynb'],
    displayName: 'Notebook',
    modelName: 'notebook',
    defaultFor: ['.ipynb'],
    preferKernel: true,
    canStartKernel: true
  });


  // Add the ability to launch notebooks for each kernel type.
  let displayNameMap: { [key: string]: string } = Object.create(null);
  let specs = services.kernelspecs;
  for (let kernelName in specs.kernelspecs) {
    let displayName = specs.kernelspecs[kernelName].spec.display_name;
    displayNameMap[displayName] = kernelName;
  }
  let displayNames = Object.keys(displayNameMap).sort((a, b) => {
    return a.localeCompare(b);
  });
  for (let displayName of displayNames) {
    registry.addCreator({
      name: `${displayName} Notebook`,
      extension: '.ipynb',
      type: 'notebook',
      kernelName: displayNameMap[displayName]
    });
  }

  // Track the current active notebook.
  let activeNotebook: NotebookPanel;
  tracker.activeWidgetChanged.connect((sender, widget) => {
    if (widget instanceof NotebookPanel) {
      activeNotebook = widget as NotebookPanel;
    } else {
      activeNotebook = null;
    }
  });

  app.commands.add([
  {
    id: cmdIds['runAndAdvance'],
    handler: () => {
      if (activeNotebook) {
        let nbWidget = activeNotebook;
        NotebookActions.runAndAdvance(nbWidget.content, nbWidget.context.kernel);
      }
    }
  },
  {
    id: cmdIds['run'],
    handler: () => {
      if (activeNotebook) {
        let nbWidget = activeNotebook;
        NotebookActions.run(nbWidget.content, nbWidget.context.kernel);
      }
    }
  },
  {
    id: cmdIds['runAndInsert'],
    handler: () => {
      if (activeNotebook) {
        let nbWidget = activeNotebook;
        NotebookActions.runAndInsert(nbWidget.content, nbWidget.context.kernel);
      }
    }
  },
  {
    id: cmdIds['runAll'],
    handler: () => {
      if (activeNotebook) {
        let nbWidget = activeNotebook;
        NotebookActions.runAll(nbWidget.content, nbWidget.context.kernel);
      }
    }
  },
  {
    id: cmdIds['restart'],
    handler: () => {
      if (activeNotebook) {
        let nbWidget = activeNotebook;
        restartKernel(nbWidget.kernel, nbWidget.node);
      }
    }
  },
  {
    id: cmdIds['restartClear'],
    handler: () => {
      if (activeNotebook) {
        let nbWidget = activeNotebook;
        let promise = restartKernel(nbWidget.kernel, nbWidget.node);
        promise.then(result => {
          if (result) {
            NotebookActions.clearAllOutputs(nbWidget.content);
          }
        });
      }
    }
  },
  {
    id: cmdIds['restartRunAll'],
    handler: () => {
      if (activeNotebook) {
        let nbWidget = activeNotebook;
        let promise = restartKernel(nbWidget.kernel, nbWidget.node);
        promise.then(result => {
          NotebookActions.runAll(nbWidget.content, nbWidget.context.kernel);
        });
      }
    }
  },
  {
    id: cmdIds['clearAllOutputs'],
    handler: () => {
      if (activeNotebook) {
        let nbWidget = activeNotebook;
        NotebookActions.clearAllOutputs(nbWidget.content);
      }
    }
  },
  {
    id: cmdIds['clearOutputs'],
    handler: () => {
      if (activeNotebook) {
        let nbWidget = activeNotebook;
        NotebookActions.clearOutputs(nbWidget.content);
      }
    }
  },
  {
    id: cmdIds['interrupt'],
    handler: () => {
      if (activeNotebook) {
        let kernel = activeNotebook.context.kernel;
        if (kernel) {
          kernel.interrupt();
        }
      }
    }
  },
  {
    id: cmdIds['toCode'],
    handler: () => {
      if (activeNotebook) {
        let nbWidget = activeNotebook;
        NotebookActions.changeCellType(nbWidget.content, 'code');
      }
    }
  },
  {
    id: cmdIds['toMarkdown'],
    handler: () => {
      if (activeNotebook) {
        let nbWidget = activeNotebook;
        NotebookActions.changeCellType(nbWidget.content, 'markdown');
      }
    }
  },
  {
    id: cmdIds['toRaw'],
    handler: () => {
      if (activeNotebook) {
        let nbWidget = activeNotebook;
        NotebookActions.changeCellType(nbWidget.content, 'raw');
      }
    }
  },
  {
    id: cmdIds['cut'],
    handler: () => {
      if (activeNotebook) {
        let nbWidget = activeNotebook;
        NotebookActions.cut(nbWidget.content, nbWidget.clipboard);
      }
    }
  },
  {
    id: cmdIds['copy'],
    handler: () => {
      if (activeNotebook) {
        let nbWidget = activeNotebook;
        NotebookActions.copy(nbWidget.content, nbWidget.clipboard);
      }
    }
  },
  {
    id: cmdIds['paste'],
    handler: () => {
      if (activeNotebook) {
        let nbWidget = activeNotebook;
        NotebookActions.paste(nbWidget.content, nbWidget.clipboard);
      }
    }
  },
  {
    id: cmdIds['deleteCell'],
    handler: () => {
      if (activeNotebook) {
        let nbWidget = activeNotebook;
        NotebookActions.deleteCells(nbWidget.content);
      }
    }
  },
  {
    id: cmdIds['split'],
    handler: () => {
      if (activeNotebook) {
        let nbWidget = activeNotebook;
        NotebookActions.splitCell(nbWidget.content);
      }
    }
  },
  {
    id: cmdIds['merge'],
    handler: () => {
      if (activeNotebook) {
        let nbWidget = activeNotebook;
        NotebookActions.mergeCells(nbWidget.content);
      }
    }
  },
  {
    id: cmdIds['insertAbove'],
    handler: () => {
      if (activeNotebook) {
        let nbWidget = activeNotebook;
        NotebookActions.insertAbove(nbWidget.content);
      }
    }
  },
  {
    id: cmdIds['insertBelow'],
    handler: () => {
      if (activeNotebook) {
        let nbWidget = activeNotebook;
        NotebookActions.insertBelow(nbWidget.content);
      }
    }
  },
  {
    id: cmdIds['selectAbove'],
    handler: () => {
      if (activeNotebook) {
        let nbWidget = activeNotebook;
        NotebookActions.selectAbove(nbWidget.content);
      }
    }
  },
  {
    id: cmdIds['selectBelow'],
    handler: () => {
      if (activeNotebook) {
        let nbWidget = activeNotebook;
        NotebookActions.selectBelow(nbWidget.content);
      }
    }
  },
  {
    id: cmdIds['extendAbove'],
    handler: () => {
      if (activeNotebook) {
        let nbWidget = activeNotebook;
        NotebookActions.extendSelectionAbove(nbWidget.content);
      }
    }
  },
  {
    id: cmdIds['extendBelow'],
    handler: () => {
      if (activeNotebook) {
        let nbWidget = activeNotebook;
        NotebookActions.extendSelectionBelow(nbWidget.content);
      }
    }
  },
  {
    id: cmdIds['toggleLines'],
    handler: () => {
      if (activeNotebook) {
        let nbWidget = activeNotebook;
        NotebookActions.toggleLineNumbers(nbWidget.content);
      }
    }
  },
  {
    id: cmdIds['toggleAllLines'],
    handler: () => {
      if (activeNotebook) {
        let nbWidget = activeNotebook;
        NotebookActions.toggleAllLineNumbers(nbWidget.content);
      }
    }
  },
  {
    id: cmdIds['commandMode'],
    handler: () => {
      if (activeNotebook) {
        activeNotebook.content.mode = 'command';
      }
    }
  },
  {
    id: cmdIds['editMode'],
    handler: () => {
      if (activeNotebook) {
        activeNotebook.content.mode = 'edit';
      }
    }
  },
  {
    id: cmdIds['undo'],
    handler: () => {
      if (activeNotebook) {
        NotebookActions.undo(activeNotebook.content);
      }
    }
  },
  {
    id: cmdIds['redo'],
    handler: () => {
      if (activeNotebook) {
        NotebookActions.redo(activeNotebook.content);
      }
    }
  },
  {
    id: cmdIds['switchKernel'],
    handler: () => {
      if (activeNotebook) {
        selectKernelForContext(activeNotebook.context, activeNotebook.node);
      }
    }
  }
  ]);
  app.palette.add([
  {
    command: cmdIds['run'],
    category: 'Notebook Cell Operations',
    text: 'Run Cell(s)'
  },
  {
    command: cmdIds['runAndAdvance'],
    category: 'Notebook Cell Operations',
    text: 'Run Cell(s) and Advance'
  },
  {
    command: cmdIds['runAndInsert'],
    category: 'Notebook Cell Operations',
    text: 'Run Cell(s) and Insert'
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
    command: cmdIds['restartClear'],
    category: 'Notebook Operations',
    text: 'Restart Kernel & Clear Outputs'
  },
  {
    command: cmdIds['restartRunAll'],
    category: 'Notebook Operations',
    text: 'Restart Kernel & Run All'
  },
  {
    command: cmdIds['runAll'],
    category: 'Notebook Operations',
    text: 'Run All Cells'
  },
  {
    command: cmdIds['clearAllOutputs'],
    category: 'Notebook Operations',
    text: 'Clear All Outputs'
  },
  {
    command: cmdIds['clearOutputs'],
    category: 'Notebook Cell Operations',
    text: 'Clear Output(s)'
  },
  {
    command: cmdIds['toCode'],
    category: 'Notebook Cell Operations',
    text: 'Convert to Code'
  },
  {
    command: cmdIds['toMarkdown'],
    category: 'Notebook Cell Operations',
    text: 'Convert to Markdown'
  },
  {
    command: cmdIds['toRaw'],
    category: 'Notebook Cell Operations',
    text: 'Convert to Raw'
  },
  {
    command: cmdIds['cut'],
    category: 'Notebook Cell Operations',
    text: 'Cut Cell(s)'
  },
  {
    command: cmdIds['copy'],
    category: 'Notebook Cell Operations',
    text: 'Copy Cell(s)'
  },
  {
    command: cmdIds['paste'],
    category: 'Notebook Cell Operations',
    text: 'Paste Cell(s)'
  },
  {
    command: cmdIds['deleteCell'],
    category: 'Notebook Cell Operations',
    text: 'Delete Cell(s)'
  },
  {
    command: cmdIds['split'],
    category: 'Notebook Cell Operations',
    text: 'Split Cell'
  },
  {
    command: cmdIds['merge'],
    category: 'Notebook Cell Operations',
    text: 'Merge Selected Cell(s)'
  },
  {
    command: cmdIds['insertAbove'],
    category: 'Notebook Cell Operations',
    text: 'Insert Cell Above'
  },
  {
    command: cmdIds['insertBelow'],
    category: 'Notebook Cell Operations',
    text: 'Insert Cell Below'
  },
  {
    command: cmdIds['selectAbove'],
    category: 'Notebook Cell Operations',
    text: 'Select Cell Above'
  },
  {
    command: cmdIds['selectBelow'],
    category: 'Notebook Cell Operations',
    text: 'Select Cell Below'
  },
  {
    command: cmdIds['extendAbove'],
    category: 'Notebook Cell Operations',
    text: 'Extend Selection Above'
  },
  {
    command: cmdIds['extendBelow'],
    category: 'Notebook Cell Operations',
    text: 'Extend Selection Below'
  },
  {
    command: cmdIds['toggleLines'],
    category: 'Notebook Cell Operations',
    text: 'Toggle Line Numbers'
  },
  {
    command: cmdIds['toggleAllLines'],
    category: 'Notebook Operations',
    text: 'Toggle All Line Numbers'
  },
  {
    command: cmdIds['editMode'],
    category: 'Notebook Operations',
    text: 'To Edit Mode'
  },
  {
    command: cmdIds['commandMode'],
    category: 'Notebook Operations',
    text: 'To Command Mode'
  },
  {
    command: cmdIds['switchKernel'],
    category: 'Notebook Operations',
    text: 'Switch Kernel'
  },
  {
    command: cmdIds['undo'],
    category: 'Notebook Cell Operations',
    text: 'Undo Cell Operation'
  },
  {
    command: cmdIds['redo'],
    category: 'Notebook Cell Operations',
    text: 'Redo Cell Operation'
  }
  ]);
}
