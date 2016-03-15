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
  CommandPalette, StandardPaletteModel
} from 'phosphor-commandpalette';

import {
  IKeyBinding, KeymapManager, keystrokeForKeydownEvent
} from 'phosphor-keymap';

import {
  SplitPanel
} from 'phosphor-splitpanel';

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

  let pModel = new StandardPaletteModel();
  let palette = new CommandPalette(); 
  palette.model = pModel;

  let panel = new SplitPanel();
  panel.id = 'main';
  panel.orientation = SplitPanel.Horizontal;
  SplitPanel.setStretch(palette, 1);
  SplitPanel.setStretch(nbWidget, 2);
  panel.attach(document.body);
  panel.addChild(palette);
  panel.addChild(nbWidget);
  window.onresize = () => { panel.update(); };

  let items = [
  {
    category: 'Notebook',
    text: 'Run Cell',
    handler: () => { nbModel.runActiveCell(); }
  }
  ]
  pModel.addItems(items);

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

  contents.get(NOTEBOOK, {}).then(data => {
    deserialize(data.content, nbModel);

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
