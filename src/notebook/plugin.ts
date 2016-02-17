// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  AbstractFileHandler
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
  INotebookSession, IKernelMessage
} from 'jupyter-js-services';

import {
  ICommandRegistry, ICommandPalette
} from 'phosphide';

import {
  Container
} from 'phosphor-di';

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
  IServicesProvider, IDocumentManager
} from '../index';

import {
  WidgetManager
} from './widgetmanager';


let executeCellCommandId = 'notebook:execute-selected-cell';
let renderCellCommandId = 'notebook:render-selected-cell';
let selectNextCellCommandId = 'notebook:select-next-cell';
let selectPreviousCellCommandId = 'notebook:select-previous-cell';

let notebookContainerClass = 'jp-NotebookContainer';


/**
 * The class name added to a dirty documents.
 */
const DIRTY_CLASS = 'jp-mod-dirty';


/**
 * Register the plugin contributions.
 *
 * @param container - The di container for type registration.
 *
 * #### Notes
 * This is called automatically when the plugin is loaded.
 */
export
function resolve(container: Container): Promise<AbstractFileHandler> {
  return container.resolve({
    requires: [IServicesProvider, IDocumentManager, ICommandRegistry, ICommandPalette],
    create: (services: IServicesProvider, manager: IDocumentManager,
             registry: ICommandRegistry,
             palette: ICommandPalette) => {
      let handler = new NotebookFileHandler(
        services.contentsManager,
        services.notebookSessionManager
      );
      manager.register(handler);
      registry.add([{
        id: executeCellCommandId,
        handler: () => handler.executeSelectedCell()
      }, {
        id: renderCellCommandId,
        handler: () => handler.renderSelectedCell()
      }, {
        id: selectNextCellCommandId,
        handler: () => handler.selectNextCell()
      }, {
        id: selectPreviousCellCommandId,
        handler: () => handler.selectPreviousCell()
      }]);
      palette.add([{
        id: executeCellCommandId,
        category: 'Notebook Operations',
        args: void 0,
        text: 'Execute current cell',
        caption: 'Execute the current cell'
      }, {
        id: renderCellCommandId,
        category: 'Notebook Operations',
        args: void 0,
        text: 'Render current markdown cell',
        caption: 'Render the current markdown cell'
      }, {
        id: selectNextCellCommandId,
        category: 'Notebook Operations',
        args: void 0,
        text: 'Select next cell',
        caption: 'Select next cell'
      }, {
        id: selectPreviousCellCommandId,
        category: 'Notebook Operations',
        args: void 0,
        text: 'Select previous cell',
        caption: 'Select previous cell'
      }]);
      return handler;
    }
  });
}


/**
 * Convert a kernel message to an output model.
 */
function messageToModel(msg: IKernelMessage) {
  let m: Output = msg.content;
  let type = msg.header.msg_type;
  if (type === 'execute_result') {
    m.output_type = 'display_data';
  } else {
    m.output_type = type;
  }
  return buildOutputModel(m);
}


/**
 * Execute the selected cell in a notebook.
 */
function executeSelectedCell(model: INotebookModel, session: INotebookSession)  {
  let cell = model.cells.get(model.selectedCellIndex);
  if (isCodeCellModel(cell)) {
    let exRequest = {
      code: cell.input.textEditor.text,
      silent: false,
      store_history: true,
      stop_on_error: true,
      allow_stdin: true
    };
    let output = cell.output;
    console.log(`executing`, exRequest)
    let ex = session.kernel.execute(exRequest);
    output.clear(false);
    ex.onIOPub = (msg => {
      let model = messageToModel(msg);
      console.log('iopub', msg);
      if (model !== void 0) {
        output.add(model)
      }
    });
    model.selectNextCell();
    ex.onReply = (msg => {console.log('a', msg)});
    ex.onDone = (msg => {console.log('b', msg)});
  }
}


/**
 * Render the selected cell in a notebook.
 */
function renderSelectedCell(model: INotebookModel)  {
  let cell = model.cells.get(model.selectedCellIndex);
  if (isMarkdownCellModel(cell)) {
    cell.rendered = true;
  }
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

    this._session.kernel.registerCommTarget('jupyter.widget', (comm, msg) => {
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
    });
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

  private _manager: WidgetManager = null;
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
   * Execute the selected cell on the active widget.
   */
  executeSelectedCell(): void {
    let w = this.activeWidget as NotebookContainer;
    if (w) executeSelectedCell(w.model, w.session);
  }

  /**
   * Render the selected cell on the active widget.
   */
  renderSelectedCell(): void {
    let w = this.activeWidget as NotebookContainer;
    if (w) renderSelectedCell(w.model);
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
    if (nbData.content.cells.length == 0) {
      nbData.content.cells.push({
        cell_type: 'code',
        source: '',
        outputs: [],
        execution_count: 1,
        metadata: { collapsed: true }
      });
    }
    let nbWidget: NotebookWidget = ((widget as Panel).childAt(1)) as NotebookWidget;
    populateNotebookModel(nbWidget.model, nbData);

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
