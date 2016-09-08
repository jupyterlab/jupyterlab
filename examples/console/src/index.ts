// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ConsolePanel
} from 'jupyterlab/lib/console';

import {
  CodeMirrorConsoleRenderer
} from 'jupyterlab/lib/console/codemirror/widget';

import {
  startNewSession, findSessionByPath, connectToSession, ISession
} from 'jupyter-js-services';

import {
  RenderMime
} from 'jupyterlab/lib/rendermime';

import {
  HTMLRenderer, LatexRenderer, ImageRenderer, TextRenderer,
  JavascriptRenderer, SVGRenderer, MarkdownRenderer
} from 'jupyterlab/lib/renderers';

import {
  defaultSanitizer
} from 'jupyterlab/lib/sanitizer';

import {
  CommandRegistry
} from 'phosphor/lib/ui/commandregistry';

import {
  CommandPalette
} from 'phosphor/lib/ui/commandpalette';

import {
  Keymap
} from 'phosphor/lib/ui/keymap';

import {
  SplitPanel
} from 'phosphor/lib/ui/splitpanel';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import 'jupyterlab/lib/default-theme/index.css';
import '../index.css';

let TITLE = 'Console';


function main(): void {
  let path = 'dummy_path';
  let query: { [key: string]: string } = Object.create(null);

  window.location.search.substr(1).split('&').forEach(item => {
    let pair = item.split('=');
    if (pair[0]) {
      query[pair[0]] = pair[1];
    }
  });

  if (!query['path']) {
    startNewSession({ path }).then(session => { startApp(session); });
    return;
  }

  findSessionByPath(query['path'])
    .then(model => { return connectToSession(model.id); })
    .then(session => { startApp(session); })
    .catch(error => {
      console.warn(`path="${query['path']}"`, error);
      startNewSession({ path }).then(session => { startApp(session); });
    });
}


function startApp(session: ISession) {
  // Initialize the keymap manager with the bindings.
  let commands = new CommandRegistry();
  let keymap = new Keymap({ commands });

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
  let renderers: RenderMime.MimeMap<RenderMime.IRenderer> = {};
  let order: string[] = [];
  for (let t of transformers) {
    for (let m of t.mimetypes) {
      renderers[m] = t;
      order.push(m);
    }
  }
  let sanitizer = defaultSanitizer;
  let rendermime = new RenderMime({ renderers, order, sanitizer });
  let renderer = CodeMirrorConsoleRenderer.defaultRenderer;

  let consolePanel = new ConsolePanel({ session, renderer, rendermime });
  consolePanel.title.label = TITLE;

  let palette = new CommandPalette({ commands, keymap });

  let panel = new SplitPanel();
  panel.id = 'main';
  panel.orientation = 'horizontal';
  panel.spacing = 0;
  SplitPanel.setStretch(palette, 0);
  SplitPanel.setStretch(consolePanel, 1);
  Widget.attach(panel, document.body);
  panel.addWidget(palette);
  panel.addWidget(consolePanel);
  window.onresize = () => { panel.update(); };

  let selector = '.jp-ConsolePanel';
  let category = 'Console';
  let command: string;


  command = 'console:clear';
  commands.addCommand(command, {
    label: 'Clear',
    execute: () => { consolePanel.content.clear(); }
  });
  palette.addItem({ command, category });

  command = 'console:execute';
  commands.addCommand(command, {
    label: 'Execute Prompt',
    execute: () => { consolePanel.content.execute(); }
  });
  palette.addItem({ command, category });
  keymap.addBinding({ command,  selector,  keys: ['Enter'] });

  command = 'console:execute-forced';
  commands.addCommand(command, {
    label: 'Execute Cell (forced)',
    execute: () => { consolePanel.content.execute(true); }
  });
  palette.addItem({ command, category });
  keymap.addBinding({ command,  selector,  keys: ['Shift Enter'] });

  command = 'console:linebreak';
  commands.addCommand(command, {
    label: 'Insert Line Break',
    execute: () => { consolePanel.content.insertLinebreak(); }
  });
  palette.addItem({ command, category });
  keymap.addBinding({ command,  selector,  keys: ['Ctrl Enter'] });
}

window.onload = main;
