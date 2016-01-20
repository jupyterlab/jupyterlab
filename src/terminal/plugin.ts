// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  TerminalWidget, ITerminalOptions
} from 'jupyter-js-terminal';

import {
  IAppShell, ICommandPalette, ICommandRegistry
} from 'phosphide';

import {
  Container, Token
} from 'phosphor-di';

import {
  TabPanel
} from 'phosphor-tabs';

import './plugin.css';


export
function resolve(container: Container): Promise<void> {
  return container.resolve({
    requires: [IAppShell, ICommandPalette, ICommandRegistry],
    create: (shell: IAppShell, palette: ICommandPalette, registry: ICommandRegistry) => {
      registry.add('jupyter-plugins:new:terminal', () => {
        let term = new TerminalWidget();
        term.color = 'black';
        term.background = 'white';
        term.title.closable = true;
        shell.addToMainArea(term);
        let stack = term.parent;
        if (!stack) {
          return;
        }
        let tabs = stack.parent;
        if (tabs instanceof TabPanel) {
          tabs.currentWidget = term;
        }
      });
      let paletteItem = {
        id: 'jupyter-plugins:new:terminal',
        title: 'Terminal',
        caption: ''
      };
      let section = {
        text: 'New...',
        items: [paletteItem]
      }
      palette.add([section]);
    }
  });
}
