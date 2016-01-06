// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  TerminalWidget, ITerminalOptions
} from 'jupyter-js-terminal';

import {
  Token
} from 'phosphor-di';



/**
 * A factory for creating a Jupyter editor.
 */
export
interface ITerminalFactory {

  /**
   * Create a new Terminal instance.
   */
  createTerminal(options?: ITerminalOptions): TerminalWidget;
}


/**
 * The dependency token for the `ITerminalFactory` interface.
 */
export
const ITerminalFactory = new Token<ITerminalFactory>('jupyter-js-plugins.ITerminalFactory');
