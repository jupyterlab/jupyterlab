// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  NotebookPanel, trustNotebook, NotebookWidgetFactory,
  NotebookModelFactory, NotebookActions
} from 'jupyterlab/lib/notebook';

import {
  ContentsManager, IKernelSpecIds, NotebookSessionManager
} from 'jupyter-js-services';

import {
  DocumentWrapper, DocumentManager
} from 'jupyterlab/lib/docmanager';

import {
  DocumentRegistry, selectKernelForContext
} from 'jupyterlab/lib/docregistry';

import {
  RenderMime, IRenderer, MimeMap
} from 'jupyterlab/lib/rendermime';

import {
  HTMLRenderer, LatexRenderer, ImageRenderer, TextRenderer,
  JavascriptRenderer, SVGRenderer, MarkdownRenderer
} from 'jupyterlab/lib/renderers';

import {
  CommandPalette, StandardPaletteModel, IStandardPaletteItemOptions
} from 'phosphor-commandpalette';

import {
  MimeData
} from 'phosphor-dragdrop';

import {
  KeymapManager
} from 'phosphor-keymap';

import {
  SplitPanel
} from 'phosphor-splitpanel';

import {
  Widget
} from 'phosphor-widget';

import 'jupyterlab/lib/notebook/index.css';
import 'jupyterlab/lib/notebook/theme.css';
import 'jupyterlab/lib/dialog/index.css';
import 'jupyterlab/lib/dialog/theme.css';


let NOTEBOOK = 'test.ipynb';


function main(): void {
  let sessionsManager = new NotebookSessionManager();
  sessionsManager.getSpecs().then(specs => {
    createApp(sessionsManager, specs);
  });
}


function createApp(sessionsManager: NotebookSessionManager, specs: IKernelSpecIds): void {
  // Initialize the keymap manager with the bindings.
  let keymap = new KeymapManager();
  let useCapture = true;

  // Setup the keydown listener for the document.
  document.addEventListener('keydown', event => {
    keymap.processKeydownEvent(event);
  }, useCapture);

  const transformers = [
    new JavascriptRenderer(),
    new MarkdownRenderer(),
    new HTMLRenderer(),
    new ImageRenderer(),
    new SVGRenderer(),
    new LatexRenderer(),
    new TextRenderer()
  ];
  let renderers: MimeMap<IRenderer<Widget>> = {};
  let order: string[] = [];
  for (let t of transformers) {
    for (let m of t.mimetypes) {
      renderers[m] = t;
      order.push(m);
    }
  }
  let rendermime = new RenderMime<Widget>(renderers, order);

  let opener = {
    open: (widget: DocumentWrapper) => {
      // Do nothing for sibling widgets for now.
    }
  };

  let contentsManager = new ContentsManager();
  let docRegistry = new DocumentRegistry();
  let docManager = new DocumentManager(
    docRegistry, contentsManager, sessionsManager, specs, opener
  );
  let mFactory = new NotebookModelFactory();
  let clipboard = new MimeData();
  let wFactory = new NotebookWidgetFactory(rendermime, clipboard);
  docRegistry.addModelFactory(mFactory);
  docRegistry.addWidgetFactory(wFactory, {
    displayName: 'Notebook',
    modelName: 'notebook',
    fileExtensions: ['.ipynb'],
    defaultFor: ['.ipynb'],
    preferKernel: true,
    canStartKernel: true
  });

  let doc = docManager.open(NOTEBOOK);
  let nbWidget: NotebookPanel;
  doc.populated.connect((d, widget) => {
    nbWidget = widget as NotebookPanel;
  });

  let pModel = new StandardPaletteModel();
  let palette = new CommandPalette();
  palette.model = pModel;

  let panel = new SplitPanel();
  panel.id = 'main';
  panel.orientation = SplitPanel.Horizontal;
  panel.spacing = 0;
  SplitPanel.setStretch(palette, 0);
  panel.attach(document.body);
  panel.addChild(palette);
  panel.addChild(doc);
  SplitPanel.setStretch(doc, 1);
  window.onresize = () => panel.update();

  let saveHandler = () => nbWidget.context.save();
  let interruptHandler = () => {
    if (nbWidget.context.kernel) {
      nbWidget.context.kernel.interrupt();
    }
  };
  let restartHandler = () => {
    NotebookActions.restart(nbWidget.kernel, nbWidget.node);
  }
  let switchHandler = () => {
    selectKernelForContext(nbWidget.context, nbWidget.node);
  };
  let runAdvanceHandler = () => {
    NotebookActions.runAndAdvance(nbWidget.content, nbWidget.context.kernel);
  };
  let editHandler = () => { nbWidget.content.mode = 'edit'; };
  let commandHandler = () => { nbWidget.content.mode = 'command'; };
  let codeHandler = () => {
    NotebookActions.changeCellType(nbWidget.content, 'code');
  };
  let markdownHandler = () => {
    NotebookActions.changeCellType(nbWidget.content, 'markdown');
  };
  let rawHandler = () => {
    NotebookActions.changeCellType(nbWidget.content, 'raw');
  };
  let selectBelowHandler = () => {
    NotebookActions.selectBelow(nbWidget.content);
  };
  let selectAboveHandler = () => {
    NotebookActions.selectAbove(nbWidget.content);
  };
  let cutHandler = () => {
    NotebookActions.cut(nbWidget.content, nbWidget.clipboard);
  };
  let copyHandler = () => {
    NotebookActions.copy(nbWidget.content, nbWidget.clipboard);
  };
  let pasteHandler = () => {
    NotebookActions.paste(nbWidget.content, nbWidget.clipboard);
  };
  let deleteHandler = () => {
    NotebookActions.deleteCells(nbWidget.content);
  };
  let insertAboveHandler = () => {
    NotebookActions.insertAbove(nbWidget.content);
  };
  let insertBelowHandler = () => {
    NotebookActions.insertBelow(nbWidget.content);
  };
  let extendAboveHandler = () => {
    NotebookActions.extendSelectionAbove(nbWidget.content);
  };
  let extendBelowHandler = () => {
    NotebookActions.extendSelectionBelow(nbWidget.content);
  };
  let mergeHandler = () => {
    NotebookActions.mergeCells(nbWidget.content);
  };
  let splitHandler = () => {
    NotebookActions.splitCell(nbWidget.content);
  };
  let undoHandler = () => {
    nbWidget.content.mode = 'command';
    nbWidget.model.cells.undo();
  };
  let redoHandler = () => {
    nbWidget.content.mode = 'command';
    nbWidget.model.cells.redo();
  };

  let items: IStandardPaletteItemOptions[] = [
  {
    category: 'Notebook',
    text: 'Save',
    shortcut: 'Accel S',
    handler: saveHandler
  },
  {
    category: 'Notebook',
    text: 'Interrupt Kernel',
    shortcut: 'I I',
    handler: interruptHandler
  },
  {
    category: 'Notebook',
    text: 'Restart Kernel',
    shortcut: '0 0',
    handler: restartHandler
  },
  {
    category: 'Notebook',
    text: 'Switch Kernel',
    handler: switchHandler
  },
  {
    category: 'Notebook',
    text: 'Trust Notebook',
    handler: () => {
      trustNotebook(nbWidget.model, nbWidget.node);
    }
  },
  {
    category: 'Notebook Cell',
    text: 'Run and Advance',
    shortcut: 'Shift Enter',
    handler: runAdvanceHandler
  },
  {
    category: 'Notebook Cell',
    text: 'Run Selected',
    handler: () => {
      NotebookActions.run(nbWidget.content, nbWidget.context.kernel); }
  },
  {
    category: 'Notebook Cell',
    text: 'Run and Insert Below',
    handler: () => {
      NotebookActions.runAndInsert(nbWidget.content, nbWidget.context.kernel);
    }
  },
  {
    category: 'Notebook Cell',
    text: 'To Edit Mode',
    handler: editHandler
  },
  {
    category: 'Notebook Cell',
    text: 'To Command Mode',
    handler: commandHandler
  },
  {
    category: 'Notebook Cell',
    text: 'Cut Selected',
    shortcut: 'X',
    handler: cutHandler
  },
  {
    category: 'Notebook Cell',
    text: 'Copy Selected',
    shortcut: 'C',
    handler: copyHandler
  },
  {
    category: 'Notebook Cell',
    text: 'Paste',
    shortcut: 'V',
    handler: pasteHandler
  },
  {
    category: 'Notebook Cell',
    text: 'Delete Selected',
    shortcut: 'D D',
    handler: deleteHandler
  },
  {
    category: 'Notebook Cell',
    text: 'Insert Above',
    shortcut: 'A',
    handler: insertAboveHandler
  },
  {
    category: 'Notebook Cell',
    text: 'Insert Below',
    shortcut: 'B',
    handler: insertBelowHandler
  },
  {
    category: 'Notebook Cell',
    text: 'Extend Selection Above',
    shortcut: 'Shift J',
    handler: extendAboveHandler
  },
  {
    category: 'Notebook Cell',
    text: 'Extend Selection Below',
    shortcut: 'Shift K',
    handler: extendBelowHandler
  },
  {
    category: 'Notebook Cell',
    text: 'Merge Selected',
    shortcut: 'Shift M',
    handler: mergeHandler
  },
  {
    category: 'Notebook Cell',
    text: 'Split Cell',
    shortcut: 'Control Shift Minus',
    handler: splitHandler
  },
  {
    category: 'Notebook Cell',
    text: 'To Code Type',
    shortcut: 'E',
    handler: codeHandler
  },
  {
    category: 'Notebook Cell',
    text: 'To Markdown Type',
    shortcut: 'M',
    handler: markdownHandler
  },
  {
    category: 'Notebook Cell',
    text: 'To Raw Type',
    shortcut: 'R',
    handler: rawHandler
  },
  {
    category: 'Notebook Cell',
    text: 'Select Above',
    shortcut: 'ArrowUp',
    handler: selectAboveHandler
  },
  {
    category: 'Notebook Cell',
    text: 'Select Below',
    shortcut: 'ArrowDown',
    handler: selectBelowHandler
  },
  {
    category: 'Notebook Cell',
    text: 'Undo Cell Action',
    shortcut: 'Z',
    handler: undoHandler
  },
  {
    category: 'Notebook Cell',
    text: 'Redo Cell Action',
    shortcut: 'Y',
    handler: redoHandler
  },
  ];
  pModel.addItems(items);

  let bindings = [
  {
    selector: '.jp-Notebook',
    sequence: ['Shift Enter'],
    handler: runAdvanceHandler
  },
  {
    selector: '.jp-Notebook',
    sequence: ['Accel S'],
    handler: saveHandler
  },
  {
    selector: '.jp-Notebook.jp-mod-commandMode',
    sequence: ['I', 'I'],
    handler: interruptHandler
  },
  {
    selector: '.jp-Notebook.jp-mod-commandMode',
    sequence: ['0', '0'],
    handler: restartHandler
  },
  {
    selector: '.jp-Notebook.jp-mod-commandMode',
    sequence: ['Enter'],
    handler: editHandler
  },
  {
    selector: '.jp-Notebook.jp-mod-editMode',
    sequence: ['Escape'],
    handler: commandHandler
  },
  {
    selector: '.jp-Notebook.jp-mod-commandMode',
    sequence: ['E'],
    handler: codeHandler
  },
  {
    selector: '.jp-Notebook.jp-mod-commandMode',
    sequence: ['M'],
    handler: markdownHandler
  },
  {
    selector: '.jp-Notebook.jp-mod-commandMode',
    sequence: ['R'],
    handler: rawHandler
  },
  {
    selector: '.jp-Notebook.jp-mod-commandMode',
    sequence: ['X'],
    handler: cutHandler
  },
  {
    selector: '.jp-Notebook.jp-mod-commandMode',
    sequence: ['C'],
    handler: copyHandler
  },
  {
    selector: '.jp-Notebook.jp-mod-commandMode',
    sequence: ['V'],
    handler: pasteHandler
  },
  {
    selector: '.jp-Notebook.jp-mod-commandMode',
    sequence: ['D', 'D'],
    handler: deleteHandler
  },
  {
    selector: '.jp-Notebook.jp-mod-commandMode',
    sequence: ['Shift M'],
    handler: mergeHandler
  },
  {
    selector: '.jp-Notebook.jp-mod-editMode',
    sequence: ['Ctrl Shift -'],
    handler: splitHandler
  },
  {
    selector: '.jp-Notebook.jp-mod-commandMode',
    sequence: ['A'],
    handler: insertAboveHandler
  },
  {
    selector: '.jp-Notebook.jp-mod-commandMode',
    sequence: ['B'],
    handler: insertBelowHandler
  },
  {
    selector: '.jp-Notebook.jp-mod-commandMode',
    sequence: ['J'],
    handler: selectBelowHandler
  },
  {
    selector: '.jp-Notebook.jp-mod-commandMode',
    sequence: ['ArrowDown'],
    handler: selectBelowHandler
  },
  {
    selector: '.jp-Notebook.jp-mod-commandMode',
    sequence: ['K'],
    handler: selectAboveHandler
  },
  {
    selector: '.jp-Notebook.jp-mod-commandMode',
    sequence: ['ArrowUp'],
    handler: selectAboveHandler
  },
  {
    selector: '.jp-Notebook.jp-mod-commandMode',
    sequence: ['Shift K'],
    handler: extendAboveHandler
  },
  {
    selector: '.jp-Notebook.jp-mod-commandMode',
    sequence: ['Shift J'],
    handler: extendBelowHandler
  },
  {
    selector: '.jp-Notebook.jp-mod-commandMode',
    sequence: ['Z'],
    handler: undoHandler
  },
    {
    selector: '.jp-Notebook.jp-mod-commandMode',
    sequence: ['Y'],
    handler: redoHandler
  }
  ];
  keymap.add(bindings);
}

window.onload = main;
