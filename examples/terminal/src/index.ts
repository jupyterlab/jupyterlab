// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import 'es6-promise/auto';  // polyfill Promise on IE
import '@jupyterlab/theme-light-extension/static/embed.css';
import '../index.css';


import {
  DockPanel, Widget
} from '@phosphor/widgets';

import {
  TerminalSession
} from '@jupyterlab/services';

import {
  Terminal
} from '@jupyterlab/terminal';


function main(): void {
  let term1 = new Terminal({ theme: 'light' });
  let term2 = new Terminal({ theme: 'dark' });

  TerminalSession.startNew().then(session => { term1.session = session; });
  TerminalSession.startNew().then(session => { term2.session = session; });

  term1.title.closable = true;
  term2.title.closable = true;
  let dock = new DockPanel();
  dock.addWidget(term1);
  dock.addWidget(term2, { mode: 'tab-before' });
  dock.id = 'main';

  // Attach the widget to the dom.
  Widget.attach(dock, document.body);

  // Handle resize events.
  window.addEventListener('resize', () => { dock.fit(); });
}


window.addEventListener('load', main);
