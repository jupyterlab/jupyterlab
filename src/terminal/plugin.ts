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
  ITerminalProvider
} from './index';

import './plugin.css';


/**
 * Register the plugin contributions.
 *
 * @param container - The di container for type registration.
 *
 * #### Notes
 * This is called automatically when the plugin is loaded.
 */
export
function register(container: Container): void {
  container.register(ITerminalProvider, TerminalProvider);
}


/**
 * An implementation of an ITerminalProvider.
 */
class TerminalProvider implements ITerminalProvider {

  /**
   * The dependencies required by the editor factory.
   */
  static requires: Token<any>[] = [];

  /**
   * Create a new editor factory instance.
   */
  static create(): ITerminalProvider {
    return new TerminalProvider();
  }

  /**
   * Create a new Terminal instance.
   */
  createTerminal(options?: ITerminalOptions): TerminalWidget {
    return new TerminalWidget(options);
  }
}
