/*-----------------------------------------------------------------------------
| Copyright (c) 2014-2015, Jupyter Development Team.
|
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
'use strict';

import {
  ConsolePanel
} from 'jupyterlab/lib/notebook';

import {
  startNewSession, INotebookSession
} from 'jupyter-js-services';

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

let TITLE = 'Console';


function main(): void {
  startNewSession({
    notebookPath: 'fake_path',
  }).then(session => {
    startApp(session);
  });
}


function startApp(session: INotebookSession) {
  // Initialize the keymap manager with the bindings.
  let keymap = new KeymapManager();

  // Setup the keydown listener for the document.
  document.addEventListener('keydown', event => {
    keymap.processKeydownEvent(event);
  });

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

  let consolePanel = new ConsolePanel(session, rendermime);
  consolePanel.title.text = TITLE;

  let pModel = new StandardPaletteModel();
  let palette = new CommandPalette();
  palette.model = pModel;

  let panel = new SplitPanel();
  panel.id = 'main';
  panel.orientation = SplitPanel.Horizontal;
  panel.spacing = 0;
  SplitPanel.setStretch(palette, 0);
  SplitPanel.setStretch(consolePanel, 1);
  panel.attach(document.body);
  panel.addChild(palette);
  panel.addChild(consolePanel);
  window.onresize = () => { panel.update(); };

  let items: IStandardPaletteItemOptions[] = [
    {
      category: 'Console',
      text: 'Clear',
      shortcut: 'Accel R',
      handler: () => { consolePanel.content.clear(); }
    },
    {
      category: 'Console',
      text: 'Execute Prompt',
      shortcut: 'Shift Enter',
      handler: () => { consolePanel.content.execute(); }
    }
  ];
  pModel.addItems(items);

  let bindings = [
    {
      selector: '.jp-Console',
      sequence: ['Accel R'],
      handler: () => { consolePanel.content.clear(); }
    },
    {
      selector: '.jp-Console',
      sequence: ['Shift Enter'],
      handler: () => { consolePanel.content.execute(); }
    }
  ];
  keymap.add(bindings);
}

window.onload = main;
