/*-----------------------------------------------------------------------------
| Copyright (c) 2014-2015, Jupyter Development Team.
|
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
'use strict';

import {
  deserialize, selectKernel, trustNotebook, findKernel,
  ConsolePanel, ConsoleWidget
} from 'jupyter-js-notebook';

import {
  ContentsManager, IKernelSpecIds, startNewSession,
  getKernelSpecs
} from 'jupyter-js-services';

import {
  RenderMime
} from 'jupyter-js-ui/lib/rendermime';

import {
  HTMLRenderer, LatexRenderer, ImageRenderer, TextRenderer,
  ConsoleTextRenderer, JavascriptRenderer, SVGRenderer
} from 'jupyter-js-ui/lib/renderers';

import {
  getBaseUrl
} from 'jupyter-js-utils';

import {
  CommandPalette, StandardPaletteModel, IStandardPaletteItemOptions
} from 'phosphor-commandpalette';

import {
  KeymapManager, IKeyBinding
} from 'phosphor-keymap';

import {
  SplitPanel
} from 'phosphor-splitpanel';

import {
  Widget
} from 'phosphor-widget';

// ES6 Promise polyfill
require('es6-promise').polyfill();

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

  let contents = new ContentsManager(SERVER_URL);
  let rendermime = new RenderMime<Widget>();
  const transformers = [
    new JavascriptRenderer(),
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

  let consoleWidget = new ConsolePanel();
  consoleWidget.title.text = NOTEBOOK;

  let pModel = new StandardPaletteModel();
  let palette = new CommandPalette();
  palette.model = pModel;

  let panel = new SplitPanel();
  panel.id = 'main';
  panel.orientation = SplitPanel.Horizontal;
  panel.spacing = 0;
  SplitPanel.setStretch(palette, 0);
  SplitPanel.setStretch(consoleWidget, 1);
  panel.attach(document.body);
  panel.addChild(palette);
  panel.addChild(consoleWidget);
  window.onresize = () => { panel.update(); };

  let kernelspecs: IKernelSpecIds;

  let items: IStandardPaletteItemOptions[] = [];
  pModel.addItems(items);

  let bindings: IKeyBinding[] = [];
  keymap.add(bindings);

  contents.get(NOTEBOOK, {}).then(data => {
    // deserialize(data.content, nbModel);
    getKernelSpecs({}).then(specs => {
      kernelspecs = specs;
      // start session
      // startNewSession({
      //   notebookPath: NOTEBOOK,
      //   kernelName: findKernel(nbModel, specs),
      //   baseUrl: SERVER_URL
      // }).then(session => {
      //   nbModel.session = session;
      // });
    });
  });
}

window.onload = main;
