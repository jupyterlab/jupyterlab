// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  FileBrowserWidget
} from 'jupyter-js-filebrowser';

import {
  IAppShell, ICommandPalette, ICommandRegistry
} from 'phosphide';

import {
  CodeMirrorWidget
} from 'phosphor-codemirror';

import {
  ICommand, DelegateCommand
} from 'phosphor-command';

import {
  Container, Token
} from 'phosphor-di';

import {
  Widget
} from 'phosphor-widget';

import {
  IFileBrowserWidget
} from '../../lib';


/**
 * Register the plugin contributions.
 *
 * @param container - The di container for type registration.
 *
 * #### Notes
 * This is called automatically when the plugin is loaded.
 */
export
function resolve(container: Container): void {
  container.resolve({
    requires: [IAppShell, ICommandPalette, IFileBrowserWidget],
    create: (shell, palette, browser) => {
      browser.title.text = 'Files';
      shell.addToLeftArea(browser, { rank: 40 });
    }
  });
}
