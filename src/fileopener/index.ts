// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  Widget
} from 'phosphor-widget';

import {
  Token
} from 'phosphor-di';


/**
 * An interface for a file handler
 */
export
interface IFileHandler {
  /**
   * A list of regexes for matching file names.
   */
  fileRegexes: string[];

  /**
   * Open the file and return a populated widget.
   */
  open(path: string): Promise<Widget>;

  /**
   * Close the file widget.
   */
  close(widget: Widget): boolean;
}


/**
 * An interface for a file opener.
 */
export
interface IFileOpener {
  /**
   * Register a file opener.
   */
  register(handler: IFileHandler): void;
}


/**
 * The dependency token for the `IFileHandler` interface.
 */
export
const IFileHandler = new Token<IFileHandler>('jupyter-js-plugins.IFileHandler');


/**
 * The dependency token for the `IFileOpener` interface.
 */
export
const IFileOpener = new Token<IFileOpener>('jupyter-js-plugins.IFileOpener');
