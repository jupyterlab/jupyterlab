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
  ITerminalFactory
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
  container.register(ITerminalFactory, TerminalFactory);
}


/**
 * An implementation of an ITerminalFactory.
 */
class TerminalFactory implements ITerminalFactory {

  /**
   * The dependencies required by the editor factory.
   */
  static requires: Token<any>[] = [];

  /**
   * Create a new editor factory instance.
   */
  static create(): ITerminalFactory {
    return new TerminalFactory();
  }

  /**
   * Create a new Terminal instance.
   */
  createTerminal(options?: ITerminalOptions): TerminalWidget {
    return new TerminalWidget(options);
  }
}
