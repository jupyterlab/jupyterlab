// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  IAppShell
} from 'phosphide';

import {
  Container, Token
} from 'phosphor-di';

import {
  ITerminalFactory
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
  static requires: Token<any>[] = [IAppShell, ITerminalFactory];

  /**
   * Create a default plugin instance..
   */
  static create(shell: IAppShell, term: ITerminalFactory): DefaultHandler {
    return new DefaultHandler(shell, term);
  }

  /**
   * Construct a new default plugin.
   */
  constructor(shell: IAppShell, term: ITerminalFactory) {
    this._shell = shell;
    this._term = term;
  }

  /**
   * Create a terminal and add it to the main shell area.
   */
  run() {
    let term = this._term.createTerminal();
    this._shell.addToMainArea(term);
  }

  private _term: ITerminalFactory = null;
  private _shell: IAppShell = null;
}
