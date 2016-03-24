// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  NotebookWidget, NotebookModel, serialize, INotebookModel, deserialize,
  NotebookManager, NotebookToolbar, selectKernel
} from 'jupyter-js-notebook';

import {
  IContentsModel, IContentsManager, IContentsOpts,
  INotebookSessionManager, INotebookSession,
  IKernelMessage, IComm, KernelStatus, getKernelSpecs
} from 'jupyter-js-services';

import {
  showDialog
} from 'jupyter-js-ui/lib/dialog';

import {
  AbstractFileHandler, DocumentManager
} from 'jupyter-js-ui/lib/docmanager';

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
  requires: [DocumentManager, JupyterServices],
  activate: activateNotebookHandler
};


/**
 * Activate the notebook handler extension.
 */
function activateNotebookHandler(app: Application, manager: DocumentManager, services: JupyterServices): Promise<void> {
  let handler = new NotebookFileHandler(
    services.contentsManager,
    services.notebookSessionManager
  );
  manager.register(handler);
  app.commands.add([
  {
    id: cmdIds['runAndAdvance'],
    handler: () => {
      let manager = handler.currentManager;
      if (manager) manager.runAndAdvance();
    }
  },
  {
    id: cmdIds['run'],
    handler: () => {
      let manager = handler.currentManager;
      if (manager) manager.run();
    }
  },
  {
    id: cmdIds['runAndInsert'],
    handler: () => {
      let manager = handler.currentManager;
      if (manager) manager.runAndInsert();
    }
  },
  {
    id: cmdIds['restart'],
    handler: () => {
      let manager = handler.currentManager;
      if (manager) manager.restart();
    }
  },
  {
    id: cmdIds['interrupt'],
    handler: () => {
      let manager = handler.currentManager;
      if (manager) manager.interrupt();
    }
  },
  {
    id: cmdIds['toCode'],
    handler: () => {
      let manager = handler.currentManager;
      if (manager) manager.changeCellType('code'); }
  },
  {
    id: cmdIds['toMarkdown'],
    handler: () => {
      let manager = handler.currentManager;
      if (manager) manager.changeCellType('markdown'); }
  },
  {
    id: cmdIds['toRaw'],
    handler: () => {
      let manager = handler.currentManager;
      if (manager) manager.changeCellType('raw');
    }
  },
  {
    id: cmdIds['cut'],
    handler: () => {
      let manager = handler.currentManager;
      if (manager) manager.cut();
    }
  },
  {
    id: cmdIds['copy'],
    handler: () => {
      let manager = handler.currentManager;
      if (manager) manager.copy();
    }
  },
  {
    id: cmdIds['paste'],
    handler: () => {
      let manager = handler.currentManager;
      if (manager) manager.paste();
    }
  },
  {
    id: cmdIds['insertAbove'],
    handler: () => {
      let manager = handler.currentManager;
      if (manager) manager.insertAbove();
    }
  },
  {
    id: cmdIds['insertBelow'],
    handler: () => {
      let manager = handler.currentManager;
      if (manager) manager.insertBelow();
    }
  },
  {
    id: cmdIds['selectPrevious'],
    handler: () => {
      let model = handler.currentModel;
      if (model) model.activeCellIndex -= 1;
    }
  },
  {
    id: cmdIds['selectNext'],
    handler: () => {
      let model = handler.currentModel;
      if (model) model.activeCellIndex += 1;
    }
  },
  {
    id: cmdIds['commandMode'],
    handler: () => {
      let model = handler.currentModel;
      if (model) model.mode = 'command';
    }
  },
  {
    id: cmdIds['editMode'],
    handler: () => {
      let model = handler.currentModel;
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
        let widget = handler.currentWidget;
        if (widget) {
          let model = handler.currentModel;
          selectKernel(widget.parent.node, model, specs);
        }
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


/**
 * A container which manages a notebook and widgets.
 */
class NotebookPane extends Panel {

  /**
   * Construct a new NotebookPane.
   */
  constructor(manager: IContentsManager) {
    super();
    this.addClass(NB_PANE);
    this._model = new NotebookModel();
    this._nbManager = new NotebookManager(this._model, manager);
    let widgetArea = new Panel();
    widgetArea.addClass(WIDGET_CLASS);
    this._widgetManager = new WidgetManager(widgetArea);
    this._notebook = new NotebookWidget(this._model);

    this.addChild(widgetArea);
    this.addChild(new NotebookToolbar(this._nbManager));

    let container = new Widget();
    container.addClass(NB_CONTAINER);
    container.layout = new PanelLayout();
    (container.layout as PanelLayout).addChild(this._notebook);
    this.addChild(container);
  }

  /**
   * Get the notebook model used by the widget.
   *
   * #### Notes
   * This is a read-only property.
   */
  get model(): INotebookModel {
    return this._model;
  }

  /**
   * Get the notebook widget used by the container.
   *
   * #### Notes
   * This is a read-only property.
   */
  get widget(): NotebookWidget {
    return this._notebook;
  }

  /**
   * Get the notebook manager used by the widget.
   *
   * #### Notes
   * This is a read-only property.
   */
  get manager(): NotebookManager {
    return this._nbManager;
  }

  /**
   * Get the notebook session used by the widget.
   *
   * #### Notes
   * This is a read-only property.
   */
  get session(): INotebookSession {
    return this._session;
  }

  /**
   * Set the session and set up widget handling.
   */
  setSession(value: INotebookSession) {
    this._session = value;
    this._model.session = value;
    let manager = this._widgetManager;

    let commHandler = (comm: IComm, msg: IKernelMessage) => {
      console.log('comm message', msg);

      manager.handle_comm_open(comm, msg);

      comm.onMsg = (message) => {
        manager.handle_comm_open(comm, message);
        // create the widget model and (if needed) the view
        console.log('comm widget message', message);
      };
      comm.onClose = (message) => {
        console.log('comm widget close', message);
      };
    };

    this._session.kernel.registerCommTarget('ipython.widget', commHandler);
    this._session.kernel.registerCommTarget('jupyter.widget', commHandler);
  }

  private _model: INotebookModel = null;
  private _session: INotebookSession = null;
  private _widgetManager: WidgetManager = null;
  private _nbManager: NotebookManager = null;
  private _notebook: NotebookWidget = null;
}


/**
 * An implementation of a file handler.
 */
class NotebookFileHandler extends AbstractFileHandler<NotebookPane> {

  constructor(contents: IContentsManager, session: INotebookSessionManager) {
    super(contents);
    this.session = session;
  }

  /**
   * Get the list of file extensions supported by the handler.
   */
  get fileExtensions(): string[] {
    return ['.ipynb'];
  }

  /**
   * Get the notebook widget for the current container widget.
   */
  get currentWidget(): NotebookWidget {
    let w = this.activeWidget;
    if (w) return w.widget;
  }

  /**
   * Get the notebook model for the current container widget.
   */
  get currentModel(): INotebookModel {
    let w = this.activeWidget;
    if (w) return w.model;
  }

  /**
   * Get the notebook model for the current container widget.
   */
  get currentManager(): NotebookManager {
    let w = this.activeWidget;
    if (w) return w.manager;
  }

  /**
   * Close a widget.
   *
   * @param widget - The widget to close (defaults to current active widget).
   *
   * returns A boolean indicating whether the widget was closed.
   *
   * #### Notes
   * The user is prompted to close the kernel if it is active
   */
  close(widget?: NotebookPane): Promise<boolean> {
    if (!widget.session || widget.session.status === KernelStatus.Dead) {
      return super.close(widget);
    }
    return showDialog({
      title: 'Shutdown kernel?',
      body: `Shutdown "${widget.session.kernel.name}" kernel?`,
      host: widget.node
    }).then(result => {
      if (result.text === 'OK') {
        return widget.session.shutdown();
      }
    }).then(() => {
      return super.close(widget);
    });
  }

  /**
   * Set the dirty state of a widget (defaults to current active widget).
   */
  setDirty(widget?: NotebookPane): void {
    super.setDirty(widget);
    widget = this.resolveWidget(widget);
    if (widget) {
      widget.model.dirty = true;
    }
  }

  /**
   * Clear the dirty state of a widget (defaults to current active widget).
   */
  clearDirty(widget?: NotebookPane): void {
    super.clearDirty(widget);
    widget = this.resolveWidget(widget);
    if (widget) {
      widget.model.dirty = false;
    }
  }

  /**
   * Get options use to fetch the model contents from disk.
   */
  protected getFetchOptions(model: IContentsModel): IContentsOpts {
    return { type: 'notebook' };
  }

  /**
   * Get the options used to save the widget content.
   */
  protected getSaveOptions(widget: NotebookPane, model: IContentsModel): Promise<IContentsOpts> {
      let content = serialize(widget.model);
      return Promise.resolve({ type: 'notebook', content });
  }

  /**
   * Create the widget from an `IContentsModel`.
   */
  protected createWidget(contents: IContentsModel): NotebookPane {
    let panel = new NotebookPane(this.manager);
    panel.model.stateChanged.connect(this._onModelChanged, this);
    panel.title.text = contents.name;

    this.session.startNew({notebookPath: contents.path}).then(s => {
      panel.setSession(s);
    });

    return panel;
  }

  /**
   * Populate the notebook widget with the contents of the notebook.
   */
  protected populateWidget(widget: NotebookPane, model: IContentsModel): Promise<IContentsModel> {
    deserialize(model.content, widget.model);
    return Promise.resolve(model);
  }

  /**
   * Handle changes to the model state of a widget.
   */
  private _onModelChanged(model: INotebookModel, args: IChangedArgs<INotebookModel>): void {
    if (args.name !== 'dirty') {
      return;
    }
    for (let i = 0; i < this.widgetCount(); i++) {
      let widget = this.widgetAt(i);
      if (widget.model === model) {
        if (args.newValue) {
          this.setDirty(widget);
        } else {
          this.clearDirty(widget);
        }
        return;
      }
    }
  }

  session: INotebookSessionManager;
}
