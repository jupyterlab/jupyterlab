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
  IServicesProvider, IFileOpener, IFileHandler
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
  return container.resolve(FileHandlerPlugin).then(plugin => plugin.run());
}


/**
 * A plugin that provides the default file handler to the IFileOpener.
 */
class FileHandlerPlugin {

  /**
   * The dependencies required by the file handler.
   */
  static requires: Token<any>[] = [IServicesProvider, IFileOpener];

  /**
   * Create a new file handler plugin instance.
   */
  static create(services: IServicesProvider, opener: IFileOpener): FileHandlerPlugin {
    return new FileHandlerPlugin(services, opener);
  }

  /**
   * Construct a new FileHandlerPlugin.
   */
  constructor(services: IServicesProvider, opener: IFileOpener) {
    this._services = services;
    this._opener = opener;
  }

  /**
   * Initialize the plugin.
   */
  run(): void {
    this._handler = new FileHandler(this._services.contentsManager);
    this._opener.registerDefault(this._handler);
  }

  private _handler: IFileHandler = null;
  private _services: IServicesProvider = null;
  private _opener: IFileOpener = null;
}
