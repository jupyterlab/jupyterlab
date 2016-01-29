// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  IContentsModel
} from 'jupyter-js-services';

import {
  Token
} from 'phosphor-di';

import {
  ISignal
} from 'phosphor-signaling';

import {
  Widget
} from 'phosphor-widget';


/**
 * An interface for a file handler
 */
export
interface IFileHandler {
  /**
   * A signal emitted when the widget is finished populating.
   */
  finished: ISignal<IFileHandler, IContentsModel>;

  /**
   * he list of file extensions supported by the handler.
   */
  fileExtensions: string[];

  /**
   * Open the file and return a populated widget.
   */
  open(model: IContentsModel): Widget;

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
  open(model: IContentsModel): Widget;

  /**
   * Register a file opener.
   *
   * @param handler - The file handler to register.
   */
  register(handler: IFileHandler): void;

  /**
   * Register a default file opener.
   */
  registerDefault(handler: IFileHandler): void;
}


/**
 * The dependency token for the `IFileOpener` interface.
 */
export
const IFileOpener = new Token<IFileOpener>('jupyter-js-plugins.IFileOpener');
