// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  TerminalSession
} from 'jupyter-js-services';

import {
  TerminalWidget
} from 'jupyterlab/lib/terminal';

import {
  DockPanel
} from 'phosphor/lib/ui/dockpanel';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import 'jupyterlab/lib/default-theme/index.css';
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

  TerminalSession.open().then(session => term1.session = session);
  TerminalSession.open().then(session => term2.session = session);

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
