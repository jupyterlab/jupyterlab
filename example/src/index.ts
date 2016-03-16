/*-----------------------------------------------------------------------------
| Copyright (c) 2014-2015, Jupyter Development Team.
|
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
'use strict';

import {
  NotebookModel, NotebookWidget, INotebookContent,
  serialize, deserialize, trustNotebook
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
  CommandPalette, StandardPaletteModel, IStandardPaletteItemOptions
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

  let items: IStandardPaletteItemOptions[] = [
  {
    category: 'Notebook',
    text: 'Save',
    shortcut: 'Accel S',
    handler: () => { nbModel.save() ; }
  },
  {
    category: 'Notebook',
    text: 'Interrupt Kernel',
    shortcut: 'I I',
    handler: () => { nbWidget.interrupt() ; }
  },
  {
    category: 'Notebook',
    text: 'Restart Kernel',
    shortcut: '0 0',
    handler: () => { nbWidget.restart() ; }
  },
  {
    category: 'Notebook',
    text: 'Trust Notebook',
    handler: () => { 
      trustNotebook(nbModel, nbWidget.node);
    }
  },
  {
    category: 'Notebook Cell',
    text: 'Run Selected',
    shortcut: 'Shift Enter',
    handler: () => { nbModel.runActiveCell(); }
  },
  {
    category: 'Notebook Cell',
    text: 'Cut Selected',
    shortcut: 'X',
    handler: () => { nbWidget.cut() ; }
  },
  {
    category: 'Notebook Cell',
    text: 'Copy Selected',
    shortcut: 'C',
    handler: () => { nbWidget.copy() ; }
  },
  {
    category: 'Notebook Cell',
    text: 'Paste',
    shortcut: 'V',
    handler: () => { nbWidget.paste() ; }
  },
  {
    category: 'Notebook Cell',
    text: 'Delete Selected',
    shortcut: 'D D',
    handler: () => { nbWidget.delete() ; }
  },
  {
    category: 'Notebook Cell',
    text: 'Undo Cell Deletion',
    shortcut: 'Z',
    handler: () => { nbWidget.undelete() ; }
  },
  {
    category: 'Notebook Cell',
    text: 'Insert Above',
    shortcut: 'A',
    handler: () => { nbWidget.insertAbove() ; }
  },
  {
    category: 'Notebook Cell',
    text: 'Insert Below',
    shortcut: 'B',
    handler: () => { nbWidget.insertBelow() ; }
  },
  {
    category: 'Notebook Cell',
    text: 'Merge Selected',
    shortcut: 'Shift M',
    handler: () => { nbWidget.merge() ; }
  },
  {
    category: 'Notebook Cell',
    text: 'To Code Type',
    shortcut: 'Y',
    handler: () => { nbWidget.changeCellType('code') ; }
  },
  {
    category: 'Notebook Cell',
    text: 'To Markdown Type',
    shortcut: 'M',
    handler: () => { nbWidget.changeCellType('markdown') ; }
  },
  {
    category: 'Notebook Cell',
    text: 'To Raw Type',
    shortcut: 'R',
    handler: () => { nbWidget.changeCellType('raw') ; }
  },
  {
    category: 'Notebook Cell',
    text: 'Select Previous',
    shortcut: 'ArrowUp',
    handler: () => { nbModel.activeCellIndex -= 1; }
  },
  {
    category: 'Notebook Cell',
    text: 'Select Next',
    shortcut: 'ArrowDown',
    handler: () => { nbModel.activeCellIndex += 1; }
  },
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
    sequence: ['I', 'I'],
    handler: () => {
      nbWidget.interrupt();
      return true;
    }
  }, 
  {
    selector: '.jp-Cell.jp-mod-commandMode',
    sequence: ['0', '0'],
    handler: () => {
      nbWidget.restart();
      return true;
    }
  }, 
  {
    selector: '.jp-Cell.jp-mod-commandMode',
    sequence: ['Y'],
    handler: () => {
      nbWidget.changeCellType('code');
      return true;
    }
  }, 
  {
    selector: '.jp-Cell.jp-mod-commandMode',
    sequence: ['M'],
    handler: () => {
      nbWidget.changeCellType('markdown');
      return true;
    }
  }, 
  {
    selector: '.jp-Cell.jp-mod-commandMode',
    sequence: ['R'],
    handler: () => {
      nbWidget.changeCellType('raw');
      return true;
    }
  }, 
  {
    selector: '.jp-Cell.jp-mod-commandMode',
    sequence: ['X'],
    handler: () => {
      nbWidget.cut();
      return true;
    }
  },
  {
    selector: '.jp-Cell.jp-mod-commandMode',
    sequence: ['C'],
    handler: () => {
      nbWidget.copy();
      return true;
    }
  },
  {
    selector: '.jp-Cell.jp-mod-commandMode',
    sequence: ['V'],
    handler: () => {
      nbWidget.paste();
      return true;
    }
  },
   {
    selector: '.jp-Cell.jp-mod-commandMode',
    sequence: ['D', 'D'],
    handler: () => {
      nbWidget.delete();
      return true;
    }
  },
  {
    selector: '.jp-Cell.jp-mod-commandMode',
    sequence: ['Z'],
    handler: () => {
      nbWidget.undelete();
      return true;
    }
  },
  {
    selector: '.jp-Cell.jp-mod-commandMode',
    sequence: ['Shift M'],
    handler: () => {
      nbWidget.merge();
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
  },
  {
    selector: '.jp-Cell.jp-mod-commandMode',
    sequence: ['J'],
    handler: () => {
      nbModel.activeCellIndex += 1;
      return true;
    }
  },
  {
    selector: '.jp-Cell.jp-mod-commandMode',
    sequence: ['ArrowDown'],
    handler: () => {
      nbModel.activeCellIndex += 1;
      return true;
    }
  },
  {
    selector: '.jp-Cell.jp-mod-commandMode',
    sequence: ['K'],
    handler: () => {
      nbModel.activeCellIndex -= 1;
      return true;
    }
  },
  {
    selector: '.jp-Cell.jp-mod-commandMode',
    sequence: ['ArrowUp'],
    handler: () => {
      nbModel.activeCellIndex -= 1;
      return true;
    }
  }
  ];
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
