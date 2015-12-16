'use-strict';

import {
  Widget
} from 'phosphor-widget';

import {
  NotebookViewModel, NotebookWidget, makeModels
} from '../lib/index';

import {
  isMarkdownCell
} from 'jupyter-js-cells';

import {
  IKeyBinding, KeymapManager, keystrokeForKeydownEvent
} from 'phosphor-keymap';


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

  System.import('example/data/data.json').then((data: any) => {
    let nbModel = makeModels(data);
    let nbWidget = new NotebookWidget(nbModel);
    keymap.add(bindings(nbModel));
    nbWidget.attach(document.body);
  });
}

main();
