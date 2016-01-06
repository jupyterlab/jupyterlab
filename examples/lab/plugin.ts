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
 * An implemenation of an IEditorFactory.
 */
class DefaultHandler {

  /**
   * The dependencies required by the editor factory.
   */
  static requires: Token<any>[] = [IAppShell, ITerminalFactory];

  /**
   * Create a new editor factory instance.
   */
  static create(shell: IAppShell, term: ITerminalFactory): DefaultHandler {
    return new DefaultHandler(shell, term);
  }

  constructor(shell: IAppShell, term: ITerminalFactory) {
    this._shell = shell;
    this._term = term;
  }

  run() {
    let term = this._term.createTerminal();
    this._shell.addToMainArea(term);
  }

  private _term: ITerminalFactory = null;
  private _shell: IAppShell = null;
}
