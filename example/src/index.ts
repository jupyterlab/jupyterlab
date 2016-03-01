/*-----------------------------------------------------------------------------
| Copyright (c) 2014-2015, Jupyter Development Team.
|
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
'use strict';

import {
  NotebookModel, NotebookWidget, INotebookContent
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
  BoxPanel
} from 'phosphor-boxpanel';

import 'jupyter-js-notebook/lib/index.css';
import 'jupyter-js-notebook/lib/theme.css';


let SERVER_URL = getBaseUrl();
let NOTEBOOK = 'test.ipynb';


function bindings(nbModel: NotebookModel) {
  let bindings: IKeyBinding[] = [{
    selector: '.jp-Notebook-cell',
    sequence: ['Shift Enter'],
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
    let nbModel = new NotebookModel();
    nbModel.fromJSON(data.content as INotebookContent);
    let nbWidget = new NotebookWidget(nbModel);
    nbWidget.title.text = NOTEBOOK;

    keymap.add(bindings(nbModel));

    let box = new BoxPanel();
    box.id = 'main';
    box.attach(document.body);
    box.addChild(nbWidget);

    // start session
    startNewSession({
      notebookPath: NOTEBOOK,
      kernelName: data.content.metadata.kernelspec.name,
      baseUrl: SERVER_URL
    }).then(session => {
      nbModel.session = session;
      let content = nbModel.toJSON();
      contents.save(NOTEBOOK, {
        type: 'notebook',
        content
      });
    });
  });
}

window.onload = main;
