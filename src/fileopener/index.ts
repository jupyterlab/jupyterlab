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
   * he list of file extensions supported by the handler.
   */
  fileExtensions: string[];

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
   * Open the file and add the widget to the application shell.
   */
  open(path: string): Promise<void>;

  /**
   * Register a file opener.
   * 
   * @param handler - The file handler to register.
   * @param isDefault (default to false) - whether the handler is the default handler
   */
  register(handler: IFileHandler, isDefault?: boolean): void;
}


/**
 * The dependency token for the `IFileOpener` interface.
 */
export
const IFileOpener = new Token<IFileOpener>('jupyter-js-plugins.IFileOpener');
