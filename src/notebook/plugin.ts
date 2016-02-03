// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  AbstractFileHandler
} from 'jupyter-js-filebrowser';

import {
  NotebookWidget, NotebookModel, NBData, populateNotebookModel, buildOutputModel, Output
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
  ICommandRegistry, IShortcutManager
} from 'phosphide';

import {
  SimpleCommand
} from 'phosphor-command';

import {
  Container
} from 'phosphor-di';

import {
  Panel
} from 'phosphor-panel';

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
let executeCommand = new SimpleCommand({
  category: 'Notebook Operations',
  text: 'Execute current cell',
  caption: 'Execute the current cell',
  handler: (args) => {
    executeSelectedCell(args.model, args.session);
  }
})

let renderCellCommandId = 'notebook:render-selected-cell';
let renderCommand = new SimpleCommand({
  category: 'Notebook Operations',
  text: 'Render current markdown cell',
  caption: 'Render the current markdown cell',
  handler: (args) => {
    renderSelectedCell(args.model);
  }
})


let selectNextCellCommandId = 'notebook:select-next-cell';
let selectNextCell = new SimpleCommand({
  category: 'Notebook Operations',
  text: 'Select next cell',
  caption: 'Select next cell',
  handler: (args) => {
    args.model.selectNextCell();
  }
})

let selectPreviousCellCommandId = 'notebook:select-previous-cell';
let selectPreviousCell = new SimpleCommand({
  category: 'Notebook Operations',
  text: 'Select previous cell',
  caption: 'Select previous cell',
  handler: (args) => {
    args.model.selectPreviousCell();
  }
})


let notebookContainerClass = 'jp-NotebookContainer';

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
    requires: [IServicesProvider, IDocumentManager, ICommandRegistry, IShortcutManager],
    create: (services: IServicesProvider, manager: IDocumentManager,
             registry: ICommandRegistry, shortcuts: IShortcutManager) => {
      let handler = new NotebookFileHandler(services.contentsManager, services.notebookSessionManager, shortcuts);
      manager.register(handler);
      registry.add([{
        id: executeCellCommandId,
        command: executeCommand
      }, {
        id: renderCellCommandId,
        command: renderCommand
      }, {
        id: selectNextCellCommandId,
        command: selectNextCell
      }, {
        id: selectPreviousCellCommandId,
        command: selectPreviousCell
      }])
      return handler;
    }
  });
}




export
class SessionStoreMapping {
  constructor(services: IServicesProvider) {
    this.services = services;
  }
  public services: IServicesProvider;
}


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


function executeSelectedCell(model: NotebookModel, session: INotebookSession)  {
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
    ex.onReply = (msg => {console.log('a', msg)});
    ex.onDone = (msg => {console.log('b', msg)});
  }
}

function renderSelectedCell(model: NotebookModel)  {
  let cell = model.cells.get(model.selectedCellIndex);
  if (isMarkdownCellModel(cell)) {
    cell.rendered = true;
  }
}

/**
 * An implementation of a file handler.
 */
export
class NotebookFileHandler extends AbstractFileHandler {

  constructor(contents: IContentsManager, session: INotebookSessionManager,
  shortcuts: IShortcutManager) {
    super(contents);
    this.session = session;
    this.shortcuts = shortcuts;
  }

  /**
   * Get the list of file extensions supported by the handler.
   */
  get fileExtensions(): string[] {
    return ['.ipynb']
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
    let model = new NotebookModel();
    let panel = new Panel();

    let widgetarea = new Widget();
    let manager = new WidgetManager(widgetarea.node);

    let notebookId = this.notebookId;
    this.notebookId += 1;

    this.session.startNew({notebookPath: contents.path}).then(s => {
      // TODO: it's probably better to make *one* shortcut that executes whatever
      // the current notebook's selected cell is, rather than registering a
      // a new shortcut for every open notebook.
      // One way to do this is to have the active notebook have a
      // specific `.jp-active-document` class, for example. Then the keyboard shortcut
      // selects on that. The application state would also have a handle on this active
      // document (model or widget), and so we could execute the current active cell.
      let prefix = `.${notebookContainerClass}.notebook-id-${notebookId}`
      this.shortcuts.add([{
        sequence: ['Shift Enter'],
        selector: `${prefix} .jp-CodeCell`,
        command: executeCellCommandId,
        args: {model: model, session: s}
      }, {
        sequence: ['Shift Enter'],
        selector: `${prefix} .jp-MarkdownCell`,
        command: renderCellCommandId,
        args: {model: model}
      }, {
        sequence: ['ArrowDown'],
        selector: `${prefix} .jp-Cell`,
        command: selectNextCellCommandId,
        args: {model: model}
      }, {
        sequence: ['ArrowUp'],
        selector: `${prefix} .jp-Cell`,
        command: selectPreviousCellCommandId,
        args: {model: model}
      }])

      s.kernel.registerCommTarget('jupyter.widget', (comm, msg) => {
        console.log('comm message', msg);

        let modelPromise = manager.handle_comm_open(comm, msg);

        comm.onMsg = (msg) => {
          manager.handle_comm_open(comm, msg)
          // create the widget model and (if needed) the view
          console.log('comm widget message', msg);
        }
        comm.onClose = (msg) => {
          console.log('comm widget close', msg);
        }
      })
    })

    panel.addChild(widgetarea)
    panel.addChild(new NotebookWidget(model));
    panel.title.text = contents.name;
    panel.addClass(notebookContainerClass);
    panel.addClass(`notebook-id-${notebookId}`);
    return panel;
  }

  /**
   * Populate the notebook widget with the contents of the notebook.
   */
  protected setState(widget: Widget, model: IContentsModel): Promise<void> {
    let nbData: NBData = makedata(model);
    let nbWidget: NotebookWidget = ((widget as Panel).childAt(1)) as NotebookWidget;
    populateNotebookModel(nbWidget.model, nbData);
    return Promise.resolve();
  }

  protected getState(widget: Widget): Promise<IContentsModel> {
    return Promise.resolve(void 0);
  }

  session: INotebookSessionManager;
  shortcuts: IShortcutManager;
  notebookId: number = 0;
}


function makedata(a: IContentsModel): NBData {
  return {
    content: a.content,
    name: a.name,
    path: a.path
  }
}
