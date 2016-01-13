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
  ITerminalProvider, IFileBrowserProvider, IServicesProvider, IFileOpener
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
  static requires: Token<any>[] = [IAppShell, ITerminalProvider, ICommandPalette, ICommandRegistry, IFileBrowserProvider, IServicesProvider, IFileOpener];

  /**
   * Create a default plugin instance..
   */
  static create(shell: IAppShell, term: ITerminalProvider, palette: ICommandPalette, registry: ICommandRegistry, browser: IFileBrowserProvider,
    services: IServicesProvider, opener: IFileOpener): DefaultHandler {
    return new DefaultHandler(shell, term, palette, registry, browser,
      services, opener);
  }

  /**
   * Construct a new default plugin.
   */
  constructor(shell: IAppShell, term: ITerminalProvider, palette: ICommandPalette, registry: ICommandRegistry, browser: IFileBrowserProvider,
    services: IServicesProvider, opener: IFileOpener) {
    this._shell = shell;
    this._term = term;
    this._palette = palette;
    this._registry = registry;
    this._browser = browser.fileBrowser;
    this._services = services;
    this._opener = opener;
  }

  /**
   * Create a terminal and add it to the main shell area.
   */
  run() {
    let termCommandItem = {
      id: 'jupyter-plugins:new-terminal',
      command: new DelegateCommand(() => {
        let term = this._term.createTerminal();
        term.color = 'black';
        term.background = 'white';
        this._shell.addToMainArea(term);
      })
    }
    let newFileCommandItem = {
      id: 'jupyter-plugins:new-text-file',
      command: new DelegateCommand(() => {
        this._browser.newUntitled('file', '.txt').then(
          contents => this._opener.open(contents.path)
        );
      })
    }
    let newNotebookCommandItem = {
      id: 'jupyter-plugins:new-notebook',
      command: new DelegateCommand(() => {
        this._browser.newUntitled('notebook').then(
          contents => this._opener.open(contents.path)
        );
      })
    }
    this._registry.add([termCommandItem, newFileCommandItem,
                        newNotebookCommandItem]);
    let openPaletteItems = [{
      id: 'jupyter-plugins:new-terminal',
      title: 'Terminal',
      caption: ''
    }, {
      id: 'jupyter-plugins:new-text-file',
      title: 'Text File',
      caption: ''
    }, {
      id: 'jupyter-plugins:new-notebook',
      title: 'Notebook',
      caption: ''
    }]
    let section = {
      text: 'New...',
      items: openPaletteItems
    }
    this._palette.add([section]);

    /*
    let term = this._term.createTerminal();
    term.color = 'black';
    term.background = 'white';
    this._shell.addToMainArea(term);
    */

    // Start a default session.
    let contents = this._services.contentsManager;
    contents.newUntitled('', { type: 'notebook' }).then(content => {
      let sessions = this._services.notebookSessionManager;
      sessions.startNew({ notebookPath: content.path }).then(() => {
        this._shell.addToLeftArea(this._browser, { rank: 10 });
      });
    });
  }

  private _term: ITerminalProvider = null;
  private _shell: IAppShell = null;
  private _palette: ICommandPalette = null;
  private _registry: ICommandRegistry = null;
  private _browser: FileBrowserWidget = null;
  private _services: IServicesProvider = null;
  private _opener: IFileOpener = null;
}
