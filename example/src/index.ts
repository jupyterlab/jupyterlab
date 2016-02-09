'use-strict';

import {
  NotebookModel, NotebookWidget,
  NBData, populateNotebookModel,
} from 'jupyter-js-notebook';

import {
  isMarkdownCellModel
} from 'jupyter-js-notebook/lib/cells'

import {
  ContentsManager, IContentsModel, startNewSession
} from 'jupyter-js-services';

import {
  getConfigOption
} from 'jupyter-js-utils';

import {
  IKeyBinding, KeymapManager, keystrokeForKeydownEvent
} from 'phosphor-keymap';

import {
  Widget
} from 'phosphor-widget';


// jupyter notebook --NotebookApp.allow_origin=* --port 8890
let SERVER_URL=getConfigOption('baseUrl');
let NOTEBOOK = 'test.ipynb';

function bindings(nbModel: NotebookModel) {
  let bindings: IKeyBinding[] = [
  {
    selector: '.jp-InputAreaWidget .CodeMirror',
    sequence: ["Shift Enter"],
    handler: () => {
      if (nbModel.selectedCellIndex !== void 0) {
        let cell = nbModel.cells.get(nbModel.selectedCellIndex);
        if (isMarkdownCellModel(cell) && !cell.rendered) {
          cell.rendered = true;
        }
      }
      return true;
    }
  },
  {
    selector: '*',
    sequence: ["ArrowDown"],
    handler: () => {
      nbModel.selectNextCell();
      return true;
    }
  },
  {
    selector: '*',
    sequence: ["ArrowUp"],
    handler: () => {
      nbModel.selectPreviousCell();
      return true;
    }
  },
  ];
  return bindings;
}


function main(): void {
  // Initialize the keymap manager with the bindings.
  var keymap = new KeymapManager();

  // Setup the keydown listener for the document.
  document.addEventListener('keydown', event => {
    keymap.processKeydownEvent(event);
  });
  // TODO: check out static example from the history
  // and make that a separate example.

  let contents = new ContentsManager(SERVER_URL);
  contents.get(NOTEBOOK, {}).then((data) => {
    let nbdata: NBData = makedata(data);
    let nbModel = new NotebookModel();
    populateNotebookModel(nbModel, nbdata);
    let nbWidget = new NotebookWidget(nbModel);
    keymap.add(bindings(nbModel));
    nbWidget.attach(document.body);

    // start session
    /*
    startNewSession({
      notebookPath: NOTEBOOK,
      kernelName: nbdata.content.metadata.kernelspec.name,
      baseUrl: SERVER_URL
    }).then((session) => {

      // when shift-enter is pressed, the notebook widget emits a signal saying 'execute this'
      // along with the cell's Model


      // when we get a session, we hook up a handler to the signal
      // with a function that will:
      //   - add the cell to the 'pending execution' notebook Model list.
      //   - clear the cell's output area right away?
      //   - execute the cell's text, take the cell out of 'pending execution' and put it in 'executing'
      //   - hook up an iopub handler to the kernel future returned that will modify the cell's output area Model
      //   - when the kernel future is done, ask the notebook to

      // should the 'cell executing' index be a notebook-level property, or a cell-level property?  Probably notebook-level
    })
    */
  })

/**
 * TODO
 * 1. Make cells executable
 *   - [ ] start kernel using jupyter-js-services
 *   - [ ] shift-enter on code cells executes
 *     - [ ] get text from cell
 *     - [ ] form execute_request message
 *     - [ ] set up reply handler which modifies the cell's output area
 */
}

function makedata(a: IContentsModel): NBData {
  return {
    content: a.content,
    name: a.name,
    path: a.path
  }
}

main();
