/*-----------------------------------------------------------------------------
| Copyright (c) 2014-2015, Jupyter Development Team.
|
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
'use strict';

import {
  NotebookModel, NotebookPanel, NotebookManager, INotebookModel,
  deserialize, selectKernel, trustNotebook, findKernel, NotebookFileHandler
} from 'jupyter-js-notebook';

import {
  ContentsManager, IKernelSpecIds, NotebookSessionManager,
  getKernelSpecs
} from 'jupyter-js-services';

import {
  RenderMime
} from 'jupyter-js-ui/lib/rendermime';

import {
  HTMLRenderer, LatexRenderer, ImageRenderer, TextRenderer,
  ConsoleTextRenderer, JavascriptRenderer, SVGRenderer, MarkdownRenderer
} from 'jupyter-js-ui/lib/renderers';

import {
  getBaseUrl
} from 'jupyter-js-utils';

import {
  CommandPalette, StandardPaletteModel, IStandardPaletteItemOptions
} from 'phosphor-commandpalette';

import {
  KeymapManager
} from 'phosphor-keymap';

import {
  SplitPanel
} from 'phosphor-splitpanel';

import {
  Widget
} from 'phosphor-widget';

import 'jupyter-js-notebook/lib/index.css';
import 'jupyter-js-notebook/lib/theme.css';
import 'jupyter-js-ui/lib/dialog/index.css';
import 'jupyter-js-ui/lib/dialog/theme.css';


let NOTEBOOK = 'test.ipynb';


function main(): void {
  // Initialize the keymap manager with the bindings.
  var keymap = new KeymapManager();
  let useCapture = true;

  // Setup the keydown listener for the document.
  document.addEventListener('keydown', event => {
    keymap.processKeydownEvent(event);
  }, useCapture);
  // TODO: check out static example from the history
  // and make that a separate example.

  let contents = new ContentsManager();
  let sessions = new NotebookSessionManager();
  let rendermime = new RenderMime<Widget>();
  const transformers = [
    new JavascriptRenderer(),
    new MarkdownRenderer(),
    new HTMLRenderer(),
    new ImageRenderer(),
    new SVGRenderer(),
    new LatexRenderer(),
    new ConsoleTextRenderer(),
    new TextRenderer()
  ];

  for (let t of transformers) {
    for (let m of t.mimetypes) {
      rendermime.order.push(m);
      rendermime.renderers[m] = t;
    }
  }

  let handler = new NotebookFileHandler(contents, sessions, rendermime);
  let nbWidget = handler.open(NOTEBOOK);
  let nbModel = nbWidget.model;
  let nbManager = nbWidget.manager;

  let pModel = new StandardPaletteModel();
  let palette = new CommandPalette();
  palette.model = pModel;

  let panel = new SplitPanel();
  panel.id = 'main';
  panel.orientation = SplitPanel.Horizontal;
  panel.spacing = 0;
  SplitPanel.setStretch(palette, 0);
  SplitPanel.setStretch(nbWidget, 1);
  panel.attach(document.body);
  panel.addChild(palette);
  panel.addChild(nbWidget);
  window.onresize = () => { panel.update(); };

  let kernelspecs: IKernelSpecIds;

  let items: IStandardPaletteItemOptions[] = [
  {
    category: 'Notebook',
    text: 'Save',
    shortcut: 'Accel S',
    handler: () => { nbManager.save() ; }
  },
  {
    category: 'Notebook',
    text: 'Switch Kernel',
    handler: () => {
      if (!kernelspecs) {
        return;
      }
      selectKernel(nbWidget.node, nbModel.kernelspec.name, kernelspecs)
        .then(name => {
          if (name) {
            nbModel.session.changeKernel({name});
          }
        });
    }
  },
  {
    category: 'Notebook',
    text: 'Interrupt Kernel',
    shortcut: 'I I',
    handler: () => { nbManager.interrupt() ; }
  },
  {
    category: 'Notebook',
    text: 'Restart Kernel',
    shortcut: '0 0',
    handler: () => { nbManager.restart() ; }
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
    text: 'Run and Advance',
    shortcut: 'Shift Enter',
    handler: () => { nbManager.runAndAdvance(); }
  },
  {
    category: 'Notebook Cell',
    text: 'Run Selected',
    handler: () => { nbManager.run(); }
  },
  {
    category: 'Notebook Cell',
    text: 'Run and Insert Below',
    handler: () => { nbManager.runAndInsert(); }
  },
  {
    category: 'Notebook Cell',
    text: 'To Edit Mode',
    handler: () => { nbModel.mode = 'edit'; }
  },
  {
    category: 'Notebook Cell',
    text: 'To Command Mode',
    handler: () => { nbModel.mode = 'command'; }
  },
  {
    category: 'Notebook Cell',
    text: 'Cut Selected',
    shortcut: 'X',
    handler: () => { nbManager.cut() ; }
  },
  {
    category: 'Notebook Cell',
    text: 'Copy Selected',
    shortcut: 'C',
    handler: () => { nbManager.copy() ; }
  },
  {
    category: 'Notebook Cell',
    text: 'Paste',
    shortcut: 'V',
    handler: () => { nbManager.paste() ; }
  },
  {
    category: 'Notebook Cell',
    text: 'Delete Selected',
    shortcut: 'D D',
    handler: () => { nbManager.delete() ; }
  },
  {
    category: 'Notebook Cell',
    text: 'Undo Cell Deletion',
    shortcut: 'Z',
    handler: () => { nbManager.undelete() ; }
  },
  {
    category: 'Notebook Cell',
    text: 'Insert Above',
    shortcut: 'A',
    handler: () => { nbManager.insertAbove() ; }
  },
  {
    category: 'Notebook Cell',
    text: 'Insert Below',
    shortcut: 'B',
    handler: () => { nbManager.insertBelow() ; }
  },
  {
    category: 'Notebook Cell',
    text: 'Extend Selection Above',
    shortcut: 'Shift J',
    handler: () => { nbManager.extendSelectionAbove() ; }
  },
  {
    category: 'Notebook Cell',
    text: 'Extend Selection Below',
    shortcut: 'Shift K',
    handler: () => { nbManager.extendSelectionBelow() ; }
  },
  {
    category: 'Notebook Cell',
    text: 'Merge Selected',
    shortcut: 'Shift M',
    handler: () => { nbManager.merge() ; }
  },
  {
    category: 'Notebook Cell',
    text: 'To Code Type',
    shortcut: 'Y',
    handler: () => { nbManager.changeCellType('code') ; }
  },
  {
    category: 'Notebook Cell',
    text: 'To Markdown Type',
    shortcut: 'M',
    handler: () => { nbManager.changeCellType('markdown') ; }
  },
  {
    category: 'Notebook Cell',
    text: 'To Raw Type',
    shortcut: 'R',
    handler: () => { nbManager.changeCellType('raw') ; }
  },
  {
    category: 'Notebook Cell',
    text: 'Select Above',
    shortcut: 'ArrowUp',
    handler: () => { nbManager.selectAbove(); }
  },
  {
    category: 'Notebook Cell',
    text: 'Select Below',
    shortcut: 'ArrowDown',
    handler: () => { nbManager.selectBelow(); }
  },
  ];
  pModel.addItems(items);

  let bindings = [
  {
    selector: '.jp-Notebook',
    sequence: ['Shift Enter'],
    handler: () => { nbManager.runAndAdvance(); }
  },
  {
    selector: '.jp-Notebook',
    sequence: ['Accel S'],
    handler: () => { nbManager.save(); }
  },
  {
    selector: '.jp-Notebook.jp-mod-commandMode',
    sequence: ['I', 'I'],
    handler: () => { nbManager.interrupt(); }
  },
  {
    selector: '.jp-Notebook.jp-mod-commandMode',
    sequence: ['0', '0'],
    handler: () => { nbManager.restart(); }
  },
  {
    selector: '.jp-Notebook.jp-mod-commandMode',
    sequence: ['Enter'],
    handler: () => { nbModel.mode = 'edit'; }
  },
  {
    selector: '.jp-Notebook.jp-mod-editMode',
    sequence: ['Escape'],
    handler: () => { nbModel.mode = 'command'; }
  },
  {
    selector: '.jp-Notebook.jp-mod-commandMode',
    sequence: ['Y'],
    handler: () => { nbManager.changeCellType('code'); }
  },
  {
    selector: '.jp-Notebook.jp-mod-commandMode',
    sequence: ['M'],
    handler: () => { nbManager.changeCellType('markdown'); }
  },
  {
    selector: '.jp-Notebook.jp-mod-commandMode',
    sequence: ['R'],
    handler: () => { nbManager.changeCellType('raw'); }
  },
  {
    selector: '.jp-Notebook.jp-mod-commandMode',
    sequence: ['X'],
    handler: () => { nbManager.cut(); }
  },
  {
    selector: '.jp-Notebook.jp-mod-commandMode',
    sequence: ['C'],
    handler: () => { nbManager.copy(); }
  },
  {
    selector: '.jp-Notebook.jp-mod-commandMode',
    sequence: ['V'],
    handler: () => { nbManager.paste(); }
  },
  {
    selector: '.jp-Notebook.jp-mod-commandMode',
    sequence: ['D', 'D'],
    handler: () => { nbManager.delete(); }
  },
  {
    selector: '.jp-Notebook.jp-mod-commandMode',
    sequence: ['Z'],
    handler: () => { nbManager.undelete(); }
  },
  {
    selector: '.jp-Notebook.jp-mod-commandMode',
    sequence: ['Shift M'],
    handler: () => { nbManager.merge(); }
  },
  {
    selector: '.jp-Notebook.jp-mod-commandMode',
    sequence: ['A'],
    handler: () => { nbManager.insertAbove(); }
  },
  {
    selector: '.jp-Notebook.jp-mod-commandMode',
    sequence: ['B'],
    handler: () => { nbManager.insertBelow(); }
  },
  {
    selector: '.jp-Notebook.jp-mod-commandMode',
    sequence: ['J'],
    handler: () => { nbManager.selectBelow(); }
  },
  {
    selector: '.jp-Notebook.jp-mod-commandMode',
    sequence: ['ArrowDown'],
    handler: () => { nbManager.selectBelow(); }
  },
  {
    selector: '.jp-Notebook.jp-mod-commandMode',
    sequence: ['K'],
    handler: () => { nbManager.selectAbove(); }
  },
  {
    selector: '.jp-Notebook.jp-mod-commandMode',
    sequence: ['ArrowUp'],
    handler: () => { nbManager.selectAbove(); }
  },
  {
    selector: '.jp-Notebook.jp-mod-commandMode',
    sequence: ['Shift K'],
    handler: () => { nbManager.extendSelectionAbove(); }
  },
  {
    selector: '.jp-Notebook.jp-mod-commandMode',
    sequence: ['Shift J'],
    handler: () => { nbManager.extendSelectionBelow(); }
  }
  ];
  keymap.add(bindings);
}

window.onload = main;
