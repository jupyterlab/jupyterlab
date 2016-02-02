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
   * The list of file extensions supported by the handler.
   */
  fileExtensions: string[];

  /**
   * The list of mime types explicitly supported by the handler.
   */
  mimeTypes: string[];

  /**
   * The current set of widgets managed by the handler.
   */
  widgets: Widget[];

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
 * An interface for a document manager.
 */
export
interface IDocumentManager {
  /**
   * Open the file and add the widget to the application shell.
   */
  open(model: IContentsModel): Widget;

  /**
   * Register a file handler.
   *
   * @param handler - The file handler to register.
   */
  register(handler: IFileHandler): void;

  /**
   * Register a default file handler.
   */
  registerDefault(handler: IFileHandler): void;
}


/**
 * The dependency token for the `IDocumentManager` interface.
 */
export
const IDocumentManager = new Token<IDocumentManager>('jupyter-js-plugins.IDocumentManager');
