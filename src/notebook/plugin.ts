// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  NotebookPanel, NotebookModelFactory, INotebookModel,
  NotebookWidgetFactory, NotebookActions
} from './index';

import {
  IKernelId
} from 'jupyter-js-services';

import {
  IDocumentContext, DocumentRegistry, selectKernelForContext
} from '../docregistry';

import {
  RenderMime
} from '../rendermime';

import {
  Application
} from 'phosphide/lib/core/application';

import {
  MimeData as IClipboard
} from 'phosphor-dragdrop';

import {
  ISignal, Signal
} from 'phosphor-signaling';

import {
  Widget
} from 'phosphor-widget';

import {
  JupyterServices
} from '../services/plugin';


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
  requires: [DocumentRegistry, JupyterServices, RenderMime, IClipboard],
  activate: activateNotebookHandler
};


/**
 * An interface exposing the current active notebook.
 */
export
class ActiveNotebook {
  /**
   * Construct a new active notebook tracker.
   */
  constructor() {
    // Temporary notebook focus follower.
    document.body.addEventListener('focus', event => {
      for (let widget of this._widgets) {
        let target = event.target as HTMLElement;
        if (widget.isAttached && widget.isVisible) {
          if (widget.node.contains(target)) {
            this.activeNotebook = widget;
            return;
          }
        }
      }
    }, true);
  }

  /**
   * A signal emitted when the active notebook changes.
   */
  get activeNotebookChanged(): ISignal<ActiveNotebook, NotebookPanel> {
    return Private.activeNotebookChangedSignal.bind(this);
  }

  /**
   * The current active notebook.
   */
  get activeNotebook(): NotebookPanel {
    return this._activeWidget;
  }
  set activeNotebook(widget: NotebookPanel) {
    if (this._activeWidget === widget) {
      return;
    }
    if (this._widgets.indexOf(widget) !== -1) {
      this._activeWidget = widget;
      this.activeNotebookChanged.emit(widget);
      return;
    }
    if (widget === null) {
      return;
    }
    this._widgets.push(widget);
    widget.disposed.connect(() => {
      let index = this._widgets.indexOf(widget);
      this._widgets.splice(index, 1);
      if (this._activeWidget === widget) {
        this.activeNotebook = null;
      }
    });
  }

  private _activeWidget: NotebookPanel = null;
  private _widgets: NotebookPanel[] = [];
}


/**
 * A service tracking the active notebook widget.
 */
export
const activeNotebookProvider = {
  id: 'jupyter.services.activeNotebook',
  provides: ActiveNotebook,
  resolve: () => {
    return Private.notebookTracker;
  }
};


/**
 * A version of the notebook widget factory that uses the notebook tracker.
 */
class TrackingNotebookWidgetFactory extends NotebookWidgetFactory {
  /**
   * Create a new widget.
   */
  createNew(context: IDocumentContext<INotebookModel>, kernel?: IKernelId): NotebookPanel {
    let widget = super.createNew(context, kernel);
    Private.notebookTracker.activeNotebook = widget;
    return widget;
  }
}


/**
 * Activate the notebook handler extension.
 */
function activateNotebookHandler(app: Application, registry: DocumentRegistry, services: JupyterServices, rendermime: RenderMime<Widget>, clipboard: IClipboard): Promise<void> {

  let widgetFactory = new TrackingNotebookWidgetFactory(rendermime, clipboard);
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

  let tracker = Private.notebookTracker;
  app.commands.add([
  {
    id: cmdIds['runAndAdvance'],
    handler: () => {
      if (tracker.activeNotebook) {
        let nbWidget = tracker.activeNotebook;
        NotebookActions.runAndAdvance(nbWidget.content, nbWidget.context.kernel);
      }
    }
  },
  {
    id: cmdIds['run'],
    handler: () => {
      if (tracker.activeNotebook) {
        let nbWidget = tracker.activeNotebook;
        NotebookActions.run(nbWidget.content, nbWidget.context.kernel);
      }
    }
  },
  {
    id: cmdIds['runAndInsert'],
    handler: () => {
      if (tracker.activeNotebook) {
        let nbWidget = tracker.activeNotebook;
        NotebookActions.runAndInsert(nbWidget.content, nbWidget.context.kernel);
      }
    }
  },
  {
    id: cmdIds['runAll'],
    handler: () => {
      if (tracker.activeNotebook) {
        let nbWidget = tracker.activeNotebook;
        NotebookActions.runAll(nbWidget.content, nbWidget.context.kernel);
      }
    }
  },
  {
    id: cmdIds['restart'],
    handler: () => {
      if (tracker.activeNotebook) {
        let nbWidget = tracker.activeNotebook;
        nbWidget.restart();
      }
    }
  },
  {
    id: cmdIds['restartClear'],
    handler: () => {
      if (tracker.activeNotebook) {
        let nbWidget = tracker.activeNotebook;
        nbWidget.restart().then(result => {
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
      if (tracker.activeNotebook) {
        let nbWidget = tracker.activeNotebook;
        nbWidget.restart().then(result => {
          NotebookActions.runAll(nbWidget.content, nbWidget.context.kernel);
        });
      }
    }
  },
  {
    id: cmdIds['clearAllOutputs'],
    handler: () => {
      if (tracker.activeNotebook) {
        let nbWidget = tracker.activeNotebook;
        NotebookActions.clearAllOutputs(nbWidget.content);
      }
    }
  },
  {
    id: cmdIds['clearOutputs'],
    handler: () => {
      if (tracker.activeNotebook) {
        let nbWidget = tracker.activeNotebook;
        NotebookActions.clearOutputs(nbWidget.content);
      }
    }
  },
  {
    id: cmdIds['interrupt'],
    handler: () => {
      if (tracker.activeNotebook) {
        let kernel = tracker.activeNotebook.context.kernel;
        if (kernel) {
          kernel.interrupt();
        }
      }
    }
  },
  {
    id: cmdIds['toCode'],
    handler: () => {
      if (tracker.activeNotebook) {
        let nbWidget = tracker.activeNotebook;
        NotebookActions.changeCellType(nbWidget.content, 'code');
      }
    }
  },
  {
    id: cmdIds['toMarkdown'],
    handler: () => {
      if (tracker.activeNotebook) {
        let nbWidget = tracker.activeNotebook;
        NotebookActions.changeCellType(nbWidget.content, 'markdown');
      }
    }
  },
  {
    id: cmdIds['toRaw'],
    handler: () => {
      if (tracker.activeNotebook) {
        let nbWidget = tracker.activeNotebook;
        NotebookActions.changeCellType(nbWidget.content, 'raw');
      }
    }
  },
  {
    id: cmdIds['cut'],
    handler: () => {
      if (tracker.activeNotebook) {
        let nbWidget = tracker.activeNotebook;
        NotebookActions.cut(nbWidget.content, nbWidget.clipboard);
      }
    }
  },
  {
    id: cmdIds['copy'],
    handler: () => {
      if (tracker.activeNotebook) {
        let nbWidget = tracker.activeNotebook;
        NotebookActions.copy(nbWidget.content, nbWidget.clipboard);
      }
    }
  },
  {
    id: cmdIds['paste'],
    handler: () => {
      if (tracker.activeNotebook) {
        let nbWidget = tracker.activeNotebook;
        NotebookActions.paste(nbWidget.content, nbWidget.clipboard);
      }
    }
  },
  {
    id: cmdIds['deleteCell'],
    handler: () => {
      if (tracker.activeNotebook) {
        let nbWidget = tracker.activeNotebook;
        NotebookActions.deleteCells(nbWidget.content);
      }
    }
  },
  {
    id: cmdIds['split'],
    handler: () => {
      if (tracker.activeNotebook) {
        let nbWidget = tracker.activeNotebook;
        NotebookActions.splitCell(nbWidget.content);
      }
    }
  },
  {
    id: cmdIds['merge'],
    handler: () => {
      if (tracker.activeNotebook) {
        let nbWidget = tracker.activeNotebook;
        NotebookActions.mergeCells(nbWidget.content);
      }
    }
  },
  {
    id: cmdIds['insertAbove'],
    handler: () => {
      if (tracker.activeNotebook) {
        let nbWidget = tracker.activeNotebook;
        NotebookActions.insertAbove(nbWidget.content);
      }
    }
  },
  {
    id: cmdIds['insertBelow'],
    handler: () => {
      if (tracker.activeNotebook) {
        let nbWidget = tracker.activeNotebook;
        NotebookActions.insertBelow(nbWidget.content);
      }
    }
  },
  {
    id: cmdIds['selectAbove'],
    handler: () => {
      if (tracker.activeNotebook) {
        let nbWidget = tracker.activeNotebook;
        NotebookActions.selectAbove(nbWidget.content);
      }
    }
  },
  {
    id: cmdIds['selectBelow'],
    handler: () => {
      if (tracker.activeNotebook) {
        let nbWidget = tracker.activeNotebook;
        NotebookActions.selectBelow(nbWidget.content);
      }
    }
  },
  {
    id: cmdIds['extendAbove'],
    handler: () => {
      if (tracker.activeNotebook) {
        let nbWidget = tracker.activeNotebook;
        NotebookActions.extendSelectionAbove(nbWidget.content);
      }
    }
  },
  {
    id: cmdIds['extendBelow'],
    handler: () => {
      if (tracker.activeNotebook) {
        let nbWidget = tracker.activeNotebook;
        NotebookActions.extendSelectionBelow(nbWidget.content);
      }
    }
  },
  {
    id: cmdIds['toggleLines'],
    handler: () => {
      if (tracker.activeNotebook) {
        let nbWidget = tracker.activeNotebook;
        NotebookActions.toggleLineNumbers(nbWidget.content);
      }
    }
  },
  {
    id: cmdIds['toggleAllLines'],
    handler: () => {
      if (tracker.activeNotebook) {
        let nbWidget = tracker.activeNotebook;
        NotebookActions.toggleAllLineNumbers(nbWidget.content);
      }
    }
  },
  {
    id: cmdIds['commandMode'],
    handler: () => {
      if (tracker.activeNotebook) {
        tracker.activeNotebook.content.mode = 'command';
      }
    }
  },
  {
    id: cmdIds['editMode'],
    handler: () => {
      if (tracker.activeNotebook) {
        tracker.activeNotebook.content.mode = 'edit';
      }
    }
  },
  {
    id: cmdIds['undo'],
    handler: () => {
      if (tracker.activeNotebook) {
        NotebookActions.undo(tracker.activeNotebook.content);
      }
    }
  },
  {
    id: cmdIds['redo'],
    handler: () => {
      if (tracker.activeNotebook) {
        NotebookActions.redo(tracker.activeNotebook.content);
      }
    }
  },
  {
    id: cmdIds['switchKernel'],
    handler: () => {
      if (tracker.activeNotebook) {
        selectKernelForContext(tracker.activeNotebook.context, tracker.activeNotebook.node);
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

  return Promise.resolve(void 0);
}


/**
 * A namespace for notebook plugin private data.
 */
namespace Private {
  /**
   * A signal emitted when the active notebook changes.
   */
  export
  const activeNotebookChangedSignal = new Signal<ActiveNotebook, NotebookPanel>();

  /**
   * A singleton notebook tracker instance.
   */
  export
  const notebookTracker = new ActiveNotebook();
}
