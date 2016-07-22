// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ConsolePanel
} from 'jupyterlab/lib/console';

import {
  startNewSession, ISession
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

import 'jupyterlab/lib/console/base.css';
import 'jupyterlab/lib/default-theme/completion.css';
import 'jupyterlab/lib/default-theme/console.css';
import 'jupyterlab/lib/dialog/index.css';
import 'jupyterlab/lib/dialog/theme.css';
import 'jupyterlab/lib/iframe/index.css';
import 'jupyterlab/lib/notebook/index.css';
import 'jupyterlab/lib/notebook/theme.css';
import 'jupyterlab/lib/notebook/completion/index.css';

let TITLE = 'Console';


function main(): void {
  startNewSession({
    path: 'fake_path',
  }).then(session => {
    startApp(session);
  });
}


function startApp(session: ISession) {
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

  let consolePanel = new ConsolePanel({ session, rendermime });
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
    },
    {
      category: 'Console',
      text: 'Toggle Inspector',
      shortcut: 'Accel I',
      handler: () => { consolePanel.toggleInspectors(); }
    },
    {
      category: 'Console',
      text: 'Position Inspector Vertically',
      handler: () => { consolePanel.reorient('vertical'); }
    },
    {
      category: 'Console',
      text: 'Position Inspector Horizontally',
      handler: () => { consolePanel.reorient('horizontal'); }
    }
  ];
  pModel.addItems(items);

  let bindings = [
    {
      selector: '.jp-ConsolePanel',
      sequence: ['Accel R'],
      handler: () => { consolePanel.content.clear(); }
    },
    {
      selector: '.jp-ConsolePanel',
      sequence: ['Shift Enter'],
      handler: () => { consolePanel.content.execute(); }
    },
    {
      selector: '.jp-ConsolePanel',
      sequence: ['Accel I'],
      handler: () => { consolePanel.toggleInspectors(); }
    },
    {
      selector: 'body',
      sequence: ['Escape'],
      handler: () => { consolePanel.content.dismissCompletion(); }
    }
  ];
  keymap.add(bindings);
}

window.onload = main;
