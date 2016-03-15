// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  NotebookWidget, NotebookModel, serialize, INotebookModel, deserialize
} from 'jupyter-js-notebook';

import {
  isCodeCellModel, isMarkdownCellModel
} from 'jupyter-js-notebook/lib/cells';

import {
  IContentsModel, IContentsManager, IContentsOpts,
  NotebookSessionManager, INotebookSessionManager,
  INotebookSession, IKernelMessage, IComm
} from 'jupyter-js-services';

import {
  AbstractFileHandler, DocumentManager
} from 'jupyter-js-ui/lib/docmanager';

import {
  Application
} from 'phosphide/lib/core/application';

import {
  Panel
} from 'phosphor-panel';

import {
  IChangedArgs, Property
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
  run: 'notebook-cells:run',
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
}


/**
 * The class name added to the top level notebook container.
 */

let NB_CONTAINER_CLASS = 'jp-NotebookContainer';


/**
 * The class name added to the widget area.
 */
let WIDGET_CLASS = 'jp-NotebookContainer-widget';


/**
 * The notebook file handler provider.
 */
export
const notebookHandlerExtension = {
  id: 'jupyter.extensions.notebookHandler',
  requires: [DocumentManager, JupyterServices],
  activate: activateNotebookHandler
}


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
    id: cmdIds['run'],  
    handler: () => { 
      let widget = handler.currentWidget;
      if (widget) widget.run(); 
    }
  },
  {
    id: cmdIds['restart'],
    handler: () => { 
      let widget = handler.currentWidget;
      if (widget) widget.restart(); 
    }
  },
  {
    id: cmdIds['interrupt'],
    handler: () => { 
      let widget = handler.currentWidget;
      if (widget) widget.interrupt(); 
    }
  },
  {
    id: cmdIds['toCode'],
    handler: () => { 
      let widget = handler.currentWidget;
      if (widget) widget.changeCellType('code'); }
  },
  {
    id: cmdIds['toMarkdown'],
    handler: () => { 
      let widget = handler.currentWidget;
      if (widget) widget.changeCellType('markdown'); }
  },
  {
    id: cmdIds['toRaw'],
    handler: () => { 
      let widget = handler.currentWidget;
      if (widget) widget.changeCellType('raw'); 
    }
  },
  {
    id: cmdIds['cut'],
    handler: () => { 
      let widget = handler.currentWidget;
      if (widget) widget.cut();
    }
  },
  {
    id: cmdIds['copy'],
    handler: () => {
      let widget = handler.currentWidget;
      if (widget) widget.copy(); 
    }
  },
  {
    id: cmdIds['paste'],
    handler: () => { 
      let widget = handler.currentWidget;
      if (widget) widget.paste(); 
    }
  },
  {
    id: cmdIds['insertAbove'],
    handler: () => { 
      let widget = handler.currentWidget;
      if (widget) widget.insertAbove(); 
    }
  },
  {
    id: cmdIds['insertBelow'],
    handler: () => { 
      let widget = handler.currentWidget;
      if (widget) widget.insertBelow(); 
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
  ]);
  app.palette.add([
  {
    command: cmdIds['run'],
    category: 'Notebook Cell Operations',
    text: 'Run selected',
  },
  {
    command: cmdIds['interrupt'],
    category: 'Notebook Operations',
    text: 'Interrupt Kernel',
  },
  {
    command: cmdIds['restart'],
    category: 'Notebook Operations',
    text: 'Restart Kernel',
  },
  {
    command: cmdIds['toCode'],
    category: 'Notebook Cell Operations',
    text: 'Covert to Code',
  },
  {
    command: cmdIds['toMarkdown'],
    category: 'Notebook Cell Operations',
    text: 'Covert to Markdown',
  },
  {
    command: cmdIds['toRaw'],
    category: 'Notebook Cell Operations',
    text: 'Covert to Raw',
  },
  {
    command: cmdIds['cut'],
    category: 'Notebook Cell Operations',
    text: 'Cut selected',
  },
  {
    command: cmdIds['copy'],
    category: 'Notebook Cell Operations',
    text: 'Copy selected',
  },
  {
    command: cmdIds['paste'],
    category: 'Notebook Cell Operations',
    text: 'Paste cell(s)',
  },
  {
    command: cmdIds['insertAbove'],
    category: 'Notebook Cell Operations',
    text: 'Insert cell above',
  },
  {
    command: cmdIds['insertBelow'],
    category: 'Notebook Cell Operations',
    text: 'Insert cell below',
  },
  {
    command: cmdIds['selectPrevious'],
    category: 'Notebook Cell Operations',
    text: 'Select previous cell',
  },
  {
    command: cmdIds['selectNext'],
    category: 'Notebook Cell Operations',
    text: 'Select next cell',
  },
  ]);
  return Promise.resolve(void 0);
}


/**
 * A container which manages a notebook and widgets.
 */
class NotebookContainer extends Panel {

  /**
   * Construct a new NotebookContainer.
   */
  constructor(manager: IContentsManager) {
    super();
    this._model = new NotebookModel(manager);
    let widgetarea = new Widget();
    widgetarea.addClass(WIDGET_CLASS);
    this._manager = new WidgetManager(widgetarea.node);
    this._widget = new NotebookWidget(this._model);

    this.addChild(widgetarea);
    this.addChild(this._widget);
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
    return this._widget;
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

    let commHandler = (comm: IComm, msg: IKernelMessage) => {    
      console.log('comm message', msg);    
    
      let modelPromise = this._manager.handle_comm_open(comm, msg);    
    
      comm.onMsg = (msg) => {    
        this._manager.handle_comm_open(comm, msg)    
        // create the widget model and (if needed) the view    
        console.log('comm widget message', msg);    
      }    
      comm.onClose = (msg) => {    
        console.log('comm widget close', msg);    
      }    
    };    
    
    this._session.kernel.registerCommTarget('ipython.widget', commHandler)      
    this._session.kernel.registerCommTarget('jupyter.widget', commHandler);
  }

  private _model: INotebookModel = null;
  private _session: INotebookSession = null;
  private _manager: WidgetManager = null;
  private _widget: NotebookWidget = null;
}


/**
 * An implementation of a file handler.
 */
class NotebookFileHandler extends AbstractFileHandler<NotebookContainer> {

  constructor(contents: IContentsManager, session: INotebookSessionManager) {
    super(contents);
    this.session = session;
  }

  /**
   * Get the list of file extensions supported by the handler.
   */
  get fileExtensions(): string[] {
    return ['.ipynb']
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
   * Set the dirty state of a widget (defaults to current active widget).
   */
  setDirty(widget?: NotebookContainer): void {
    super.setDirty(widget);
    widget = this.resolveWidget(widget);
    if (widget) {
      widget.model.dirty = true;
    }
  }

  /**
   * Clear the dirty state of a widget (defaults to current active widget).
   */
  clearDirty(widget?: NotebookContainer): void {
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
  protected getSaveOptions(widget: NotebookContainer, model: IContentsModel): Promise<IContentsOpts> {
      let content = serialize(widget.model);
      return Promise.resolve({ type: 'notebook', content });
  }

  /**
   * Create the widget from an `IContentsModel`.
   */
  protected createWidget(contents: IContentsModel): NotebookContainer {
    let panel = new NotebookContainer(this.manager);
    panel.model.stateChanged.connect(this._onModelChanged, this);
    panel.title.text = contents.name;
    panel.addClass(NB_CONTAINER_CLASS);

    this.session.startNew({notebookPath: contents.path}).then(s => {
      panel.setSession(s);
    });

    return panel;
  }

  /**
   * Populate the notebook widget with the contents of the notebook.
   */
  protected populateWidget(widget: NotebookContainer, model: IContentsModel): Promise<IContentsModel> {
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
