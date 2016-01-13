// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  FileBrowserWidget, FileHandler
} from 'jupyter-js-filebrowser';

import {
  Container, Token
} from 'phosphor-di';

import {
  Widget
} from 'phosphor-widget';

import {
  IServicesProvider, IFileBrowserProvider, IFileOpener, IFileHandler
} from '../index';


/**
 * Register the plugin contributions.
 *
 * @param container - The di container for type registration.
 *
 * #### Notes
 * This is called automatically when the plugin is loaded.
 */
export
function resolve(container: Container): Promise<void> {
  return container.resolve(DefaultFileHandler).then(handler => handler.run());
}


/**
 * An implementation of an IFileHandler.
 */
class DefaultFileHandler {

  /**
   * The dependencies required by the file handler.
   */
  static requires: Token<any>[] = [IServicesProvider, IFileOpener];

  /**
   * Create a new file handler instance.
   */
  static create(services: IServicesProvider, opener: IFileOpener): DefaultFileHandler {
    return new DefaultFileHandler(services, opener);
  }

  /**
   * Construct a new DefaultFileHandler.
   */
  constructor(services: IServicesProvider, opener: IFileOpener) {
    this._services = services;
    this._opener = opener;
  }

  run(): void {
    this._handler = new FileHandler(this._services.contentsManager);
    this._opener.register(this._handler, true);
  }

  private _handler: IFileHandler = null;
  private _services: IServicesProvider = null;
  private _opener: IFileOpener = null;
}
