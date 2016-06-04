// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  DockPanel
} from 'phosphor-dockpanel';

import {
  TerminalWidget
} from 'jupyterlab/lib/terminal';

import 'jupyterlab/lib/index.css';
import 'jupyterlab/lib/theme.css';


function main(): void {
  let term1 = new TerminalWidget({ background: 'black',
                                  color: 'white'});
  let term2 = new TerminalWidget({ background: 'white',
                                  color: 'black'});

  term1.title.closable = true;
  term2.title.closable = true;
  let dock = new DockPanel();
  dock.insertTabBefore(term1);
  dock.insertTabBefore(term2);

  dock.attach(document.body);
  dock.id = 'main';

  window.onresize = () => dock.fit();
}


window.onload = main;
