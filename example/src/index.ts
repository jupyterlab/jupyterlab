/*-----------------------------------------------------------------------------
| Copyright (c) 2014-2015, Jupyter Development Team.
|
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
'use strict';

import {
  NotebookModel, NotebookWidget, INotebookContent,
  serialize, deserialize
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
import 'jupyter-js-ui/lib/dialog/index.css';
import 'jupyter-js-ui/lib/dialog/theme.css';


let SERVER_URL = getBaseUrl();
let NOTEBOOK = 'test.ipynb';


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
  let nbModel = new NotebookModel(contents);
  let nbWidget = new NotebookWidget(nbModel);
  nbWidget.title.text = NOTEBOOK;

  let box = new BoxPanel();
  box.id = 'main';
  box.attach(document.body);
  box.addChild(nbWidget);

  window.onresize = () => { box.update(); };

  contents.get(NOTEBOOK, {}).then(data => {
    deserialize(data.content, nbModel);
    let bindings = [
    {
      selector: '.jp-Notebook-cell',
      sequence: ['Shift Enter'],
      handler: () => {
        nbModel.runActiveCell();
        return true;
      }
    },
    {
      selector: '.jp-Notebook-cell',
      sequence: ['Accel S'],
      handler: () => {
        nbModel.save();
        return true;
      }
    }, 
    {
      selector: '.jp-Cell.jp-mod-commandMode',
      sequence: ['D', 'D'],
      handler: () => {
        nbWidget.cut();
        return true;
      }
    },
    {
      selector: '.jp-Cell.jp-mod-commandMode',
      sequence: ['A'],
      handler: () => {
        nbWidget.insertAbove();
        return true;
      }
    },
    {
      selector: '.jp-Cell.jp-mod-commandMode',
      sequence: ['B'],
      handler: () => {
        nbWidget.insertBelow();
        return true;
      }
    }];
    keymap.add(bindings);

    // start session
    startNewSession({
      notebookPath: NOTEBOOK,
      kernelName: data.content.metadata.kernelspec.name,
      baseUrl: SERVER_URL
    }).then(session => {
      nbModel.session = session;
      let content = serialize(nbModel);
      contents.save(NOTEBOOK, {
        type: 'notebook',
        content
      });
    });
  });
}

window.onload = main;
