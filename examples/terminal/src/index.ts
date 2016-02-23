/*-----------------------------------------------------------------------------
| Copyright (c) 2014-2015, Jupyter Development Team.
|
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
'use strict';

import {
  DockPanel
} from 'phosphor-dockpanel';


import {
  TerminalWidget
} from 'jupyter-js-ui/lib/terminal';

import 'jupyter-js-ui/lib/index.css';
import 'jupyter-js-ui/lib/theme.css';


function main(): void {
  let term1 = new TerminalWidget({ background: 'black',
                                  color: 'white'});
  let term2 = new TerminalWidget({ background: 'white',
                                  color: 'black'});

  let dock = new DockPanel();
  dock.insertTabBefore(term1);
  dock.insertTabBefore(term2);

  dock.attach(document.body);
  dock.id = 'main';

  window.onresize = () => dock.fit();
}


window.onload = main;
