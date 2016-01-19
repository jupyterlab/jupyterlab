// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  TerminalWidget, ITerminalOptions
} from 'jupyter-js-terminal';

import {
  Container, Token
} from 'phosphor-di';

import {
  IAppShell, ICommandPalette, ICommandRegistry
} from 'phosphide';

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
