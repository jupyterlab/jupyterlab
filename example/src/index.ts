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
  getBaseUrl
} from 'jupyter-js-utils';

import {
  IKeyBinding, KeymapManager, keystrokeForKeydownEvent
} from 'phosphor-keymap';

import {
  Widget
} from 'phosphor-widget';


// jupyter notebook --NotebookApp.allow_origin=* --port 8890
let SERVER_URL = getBaseUrl();
let NOTEBOOK = 'test.ipynb';

function bindings(nbModel: NotebookModel) {
  let bindings: IKeyBinding[] = [{
    selector: '.jp-NotebookWidget-cell',
    sequence: ["Shift Enter"],
    handler: () => {
      nbModel.runSelectedCell();
      return true;
    }
  }];
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
  contents.get(NOTEBOOK, {}).then(data => {
    let nbdata = {
      content: data.content,
      name: data.name,
      path: data.path
    }
    let nbModel = new NotebookModel();
    populateNotebookModel(nbModel, nbdata);
    let nbWidget = new NotebookWidget(nbModel);
    keymap.add(bindings(nbModel));
    nbWidget.attach(document.body);

    // start session
    startNewSession({
      notebookPath: NOTEBOOK,
      kernelName: nbdata.content.metadata.kernelspec.name,
      baseUrl: SERVER_URL
    }).then(session => {
      nbModel.session = session;
    });
  });
}

main();
