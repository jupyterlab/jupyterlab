// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  AbstractFileHandler, DocumentManager
} from 'jupyter-js-docmanager';

import {
  NotebookWidget, NotebookModel, NBData, populateNotebookModel, buildOutputModel, Output, INotebookModel
} from 'jupyter-js-notebook';

import {
  isCodeCellModel, isMarkdownCellModel
} from 'jupyter-js-notebook/lib/cells';

import {
  IContentsModel, IContentsManager,
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


let runCellCommandId = 'notebook:run-selected-cell';
let selectNextCellCommandId = 'notebook:select-next-cell';
let selectPreviousCellCommandId = 'notebook:select-previous-cell';

let notebookContainerClass = 'jp-NotebookContainer';


/**
 * The class name added to a dirty documents.
 */
const DIRTY_CLASS = 'jp-mod-dirty';


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
    this._model.stateChanged.connect(this._onModelChanged, this);
    let widgetarea = new Widget();
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
  }

  private _onModelChanged(model: INotebookModel, args: IChangedArgs<INotebookModel>): void {
    if (args.name === 'dirty') {
      if (args.newValue) {
        this.addClass(DIRTY_CLASS);
      } else {
        this.removeClass(DIRTY_CLASS);
      }
    }
  }

  private _model: INotebookModel = null;
  private _session: INotebookSession = null;
}


/**
 * An implementation of a file handler.
 */
export
class NotebookFileHandler extends AbstractFileHandler {

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
    let w = this.activeWidget as NotebookContainer;
    if (w) w.model.runSelectedCell();
  }

  /**
   * Select the next cell on the active widget.
   */
  selectNextCell(): void {
    let w = this.activeWidget as NotebookContainer;
    if (w) w.model.selectNextCell();
  }

  /**
   * Select the previous cell on the active widget.
   */
  selectPreviousCell(): void {
    let w = this.activeWidget as NotebookContainer;
    if (w) w.model.selectPreviousCell();
  }

  /**
   * Get file contents given a contents model.
   */
  protected getContents(model: IContentsModel): Promise<IContentsModel> {
    return this.manager.get(model.path, { type: 'notebook' });
  }

  /**
   * Create the widget from an `IContentsModel`.
   */
  protected createWidget(contents: IContentsModel): Widget {
    let panel = new NotebookContainer();
    panel.title.text = contents.name;
    panel.addClass(notebookContainerClass);

    this.session.startNew({notebookPath: contents.path}).then(s => {
      panel.setSession(s);
    })

    return panel;
  }

  /**
   * Populate the notebook widget with the contents of the notebook.
   */
  protected setState(widget: Widget, model: IContentsModel): Promise<void> {
    let nbData: NBData = {
      content: model.content,
      name: model.name,
      path: model.path
    }
    let nbWidget: NotebookWidget = ((widget as Panel).childAt(1)) as NotebookWidget;
    populateNotebookModel(nbWidget.model, nbData);
    if (nbWidget.model.cells.length === 0) {
      let cell = nbWidget.model.createCodeCell();
      nbWidget.model.cells.add(cell);
    }
    nbWidget.model.selectedCellIndex = 0;

    return Promise.resolve();
  }

  /**
   * Get the current state of the notebook.
   */
  protected getState(widget: Widget, model: IContentsModel): Promise<IContentsModel> {
    return Promise.resolve(void 0);
  }

  session: INotebookSessionManager;
}
