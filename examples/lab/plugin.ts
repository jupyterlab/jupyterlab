// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  CodeMirrorWidget
} from 'jupyter-js-editor';

import {
  FileBrowser
} from 'jupyter-js-filebrowser';

import {
  IAppShell, ICommandPalette, ICommandRegistry
} from 'phosphide';

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
  ITerminalProvider, IFileBrowserProvider
} from '../lib';


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
  static requires: Token<any>[] = [IAppShell, ITerminalProvider, ICommandPalette, ICommandRegistry, IFileBrowserProvider];

  /**
   * Create a default plugin instance..
   */
  static create(shell: IAppShell, term: ITerminalProvider, palette: ICommandPalette, registry: ICommandRegistry, browser: IFileBrowserProvider): DefaultHandler {
    return new DefaultHandler(shell, term, palette, registry, browser);
  }

  /**
   * Construct a new default plugin.
   */
  constructor(shell: IAppShell, term: ITerminalProvider, palette: ICommandPalette, registry: ICommandRegistry, browser: IFileBrowserProvider) {
    this._shell = shell;
    this._term = term;
    this._palette = palette;
    this._registry = registry;
    this._browser = browser.fileBrowser;
  }

  /**
   * Create a terminal and add it to the main shell area.
   */
  run() {
    let termCommandItem = {
      id: 'jupyter-plugins:new-terminal',
      command: new DelegateCommand(() => {
        let term = this._term.createTerminal();
        this._shell.addToMainArea(term);
      })
    }
    let newFileCommandItem = {
      id: 'jupyter-plugins:new-text-file',
      command: new DelegateCommand(() => {
        // TODO
        let editor = new CodeMirrorWidget();
        editor.title.text = 'untitled.txt'
        this._shell.addToMainArea(editor);
      })
    }
    let newNotebookCommandItem = {
      id: 'jupyter-plugins:new-notebook',
      command: new DelegateCommand(() => {
        let widget = new Widget();
        widget.title.text = 'Untitled'
        widget.node.innerHTML = '<h1>New Notebook</h1>';
        this._shell.addToMainArea(widget);
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
    this._shell.addToLeftArea(this._browser, { rank: 10 });
    this._shell.addToMainArea(this._term.createTerminal());

  }

  private _term: ITerminalProvider = null;
  private _shell: IAppShell = null;
  private _palette: ICommandPalette = null;
  private _registry: ICommandRegistry = null;
  private _browser: FileBrowser;
}
