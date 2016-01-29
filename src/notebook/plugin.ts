// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  NotebookWidget, NotebookModel, NBData, populateNotebookModel, buildOutputModel, Output
} from 'jupyter-js-notebook';

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
  IContentsModel, IContentsManager,
  NotebookSessionManager, INotebookSessionManager,
  INotebookSession, IKernelMessage
} from 'jupyter-js-services';

import {
  Panel
} from 'phosphor-panel';

import {
  IServicesProvider, IFileOpener, IFileHandler
} from '../index';

import {
  AbstractFileHandler
} from 'jupyter-js-filebrowser';

import {
  Widget
} from 'phosphor-widget';


import {
  CodeCellModel, ICellModel, isCodeCell, BaseCellModel
} from 'jupyter-js-cells';

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
function resolve(container: Container): Promise<IFileHandler> {
  return container.resolve({
    requires: [IServicesProvider, IFileOpener, ICommandRegistry, IShortcutManager],
    create: (services: IServicesProvider, opener: IFileOpener,
             registry: ICommandRegistry, shortcuts: IShortcutManager) => {
      let handler = new NotebookFileHandler(services.contentsManager, services.notebookSessionManager, shortcuts);
      opener.register(handler);
      registry.add([{
        id: executeCellCommandId,
        command: executeCommand
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
  if (isCodeCell(cell)) {
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
      // a new shortcut for every open notebook.  To do this, we need the application
      // state (or somewhere) to include the 'current document'
      // this is better because it makes one shortcut, and it also is better because
      // then it is easy for the command to be invoked via the menu, palette, plugin, etc.
      this.shortcuts.add([{
        sequence: ['Shift Enter'],
        selector: `.${notebookContainerClass}.notebook-id-${notebookId}`,
        command: executeCellCommandId,
        args: {model: model, session: s}
      }])

      s.kernel.commOpened.connect((kernel, msg) => {
        let content = msg.content;
        if (content.target_name !== 'jupyter.widget') {
          return;
        }
        let comm = kernel.connectToComm('jupyter.widget', content.comm_id);
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
