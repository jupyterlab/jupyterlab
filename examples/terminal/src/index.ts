// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  DockPanel, Widget
} from '@phosphor/widgets';

import {
  TerminalSession
} from '@jupyterlab/services';

import {
  TerminalWidget
} from '@jupyterlab/terminal';

import '../index.css';


function main(): void {
  let term1 = new TerminalWidget({
    background: 'black',
    color: 'white'
  });
  let term2 = new TerminalWidget({
    background: 'white',
    color: 'black'
  });

  TerminalSession.startNew().then(session => { term1.session = session; });
  TerminalSession.startNew().then(session => { term2.session = session; });

  term1.title.closable = true;
  term2.title.closable = true;
  let dock = new DockPanel();
  dock.addWidget(term1);
  dock.addWidget(term2, { mode: 'tab-before' });

  Widget.attach(dock, document.body);
  dock.id = 'main';

  window.onresize = () => dock.fit();
}


window.onload = main;
