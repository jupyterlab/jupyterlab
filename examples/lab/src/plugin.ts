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
  IFileBrowserProvider
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
  container.resolve(DefaultHandler).then(handler => { handler.run(); });
}


/**
 * The default plugin for the example.
 */
class DefaultHandler {

  /**
   * The dependencies required by the default plugin.
   */
  static requires: Token<any>[] = [IAppShell, ICommandPalette, IFileBrowserProvider];

  /**
   * Create a default plugin instance..
   */
  static create(shell: IAppShell, palette: ICommandPalette, browserProvider: IFileBrowserProvider): DefaultHandler {
    return new DefaultHandler(shell, palette, browserProvider);
  }

  /**
   * Construct a new default plugin.
   */
  constructor(shell: IAppShell, palette: ICommandPalette, browserProvider: IFileBrowserProvider) {
    this._shell = shell;
    this._palette = palette;
    this._browser = browserProvider.fileBrowser;
  }

  run() {
    this._shell.addToLeftArea(this._browser, { rank: 40 });
  }

  private _shell: IAppShell = null;
  private _palette: ICommandPalette = null;
  private _browser: FileBrowserWidget = null;
}
