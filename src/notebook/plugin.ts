// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  AbstractFileHandler, DocumentManager
} from 'jupyter-js-docmanager';

import {
  NotebookWidget, NotebookModel, populateNotebookModel, buildOutputModel, Output, INotebookModel, getNotebookContent
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


let runCellCommandId = 'notebook:run-selected-cell';
let selectNextCellCommandId = 'notebook:select-next-cell';
let selectPreviousCellCommandId = 'notebook:select-previous-cell';

let notebookContainerClass = 'jp-NotebookContainer';


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
  app.commands.add([{
    id: runCellCommandId,
    handler: () => handler.runSelectedCell()
  }, {
    id: selectNextCellCommandId,
    handler: () => handler.selectNextCell()
  }, {
    id: selectPreviousCellCommandId,
    handler: () => handler.selectPreviousCell()
  }]);
  app.palette.add([{
    command: runCellCommandId,
    category: 'Notebook Operations',
    text: 'Run current cell',
    caption: 'Run the current cell'
  }, {
    command: selectNextCellCommandId,
    category: 'Notebook Operations',
    text: 'Select next cell',
    caption: 'Select next cell'
  }, {
    command: selectPreviousCellCommandId,
    category: 'Notebook Operations',
    text: 'Select previous cell',
    caption: 'Select previous cell'
  }]);
  return Promise.resolve(void 0);
}


/**
 * A container which manages a notebook and widgets.
 */
class NotebookContainer extends Panel {

  /**
   * Construct a new NotebookContainer.
   */
  constructor() {
    super();
    this._model = new NotebookModel();
    let widgetarea = new Widget();
    this._manager = new WidgetManager(widgetarea.node);
    let widget = new NotebookWidget(this._model);

    this.addChild(widgetarea);
    this.addChild(widget);
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
   * Run the selected cell on the active widget.
   */
  runSelectedCell(): void {
    let w = this.activeWidget;
    if (w) w.model.runSelectedCell();
  }

  /**
   * Select the next cell on the active widget.
   */
  selectNextCell(): void {
    let w = this.activeWidget;
    if (w) w.model.selectNextCell();
  }

  /**
   * Select the previous cell on the active widget.
   */
  selectPreviousCell(): void {
    let w = this.activeWidget;
    if (w) w.model.selectPreviousCell();
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
      let content = getNotebookContent(widget.model);
      return Promise.resolve({ type: 'notebook', content });
  }

  /**
   * Create the widget from an `IContentsModel`.
   */
  protected createWidget(contents: IContentsModel): NotebookContainer {
    let panel = new NotebookContainer();
    panel.model.stateChanged.connect(this._onModelChanged, this);
    panel.title.text = contents.name;
    panel.addClass(notebookContainerClass);

    this.session.startNew({notebookPath: contents.path}).then(s => {
      panel.setSession(s);
    });

    return panel;
  }

  /**
   * Populate the notebook widget with the contents of the notebook.
   */
  protected populateWidget(widget: NotebookContainer, model: IContentsModel): Promise<IContentsModel> {
    populateNotebookModel(widget.model, model.content);
    if (widget.model.cells.length === 0) {
      let cell = widget.model.createCodeCell();
      widget.model.cells.add(cell);
    }
    widget.model.selectedCellIndex = 0;

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
