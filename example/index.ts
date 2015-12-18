'use-strict';

import {
  Widget
} from 'phosphor-widget';

import {
  NotebookViewModel, NotebookWidget, makeModels,
  NBData
} from '../lib/index';

import {
  isMarkdownCell
} from 'jupyter-js-cells';

import {
  IKeyBinding, KeymapManager, keystrokeForKeydownEvent
} from 'phosphor-keymap';

import {
  Contents, IContentsModel, startNewSession
} from 'jupyter-js-services';

let SERVER_URL='http://localhost:8890';
let NOTEBOOK = 'test.ipynb';

function bindings(nbModel: NotebookViewModel) {
  let bindings: IKeyBinding[] = [{
      selector: '.jp-InputAreaWidget .CodeMirror',
      sequence: ["Shift Enter"],
      handler: () => {
        if (nbModel.selectedCellIndex !== void 0) {
          let cell = nbModel.cells.get(nbModel.selectedCellIndex);
          if (isMarkdownCell(cell) && !cell.rendered) {
            cell.rendered = true;
          }
        }
        console.log('shift-enter');
      }
  },
  {
    selector: '*',
    sequence: ["ArrowDown"],
    handler: () => {nbModel.selectNextCell()}
  },
  {
    selector: '*',
    sequence: ["ArrowUp"],
    handler: () => {nbModel.selectPreviousCell()}
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
  
  let contents = new Contents(SERVER_URL);
  contents.get(NOTEBOOK, {}).then((data) => {
    let nbdata: NBData = makedata(data);
    let nbModel = makeModels(nbdata);
    let nbWidget = new NotebookWidget(nbModel);
    keymap.add(bindings(nbModel));
    nbWidget.attach(document.body);
  })
}

function makedata(a: IContentsModel): NBData {
  return {
    content: a.content,
    name: a.name,
    path: a.path
  }
}

main();
