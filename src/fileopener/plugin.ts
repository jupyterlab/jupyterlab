// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  FileBrowser, FileHandler
} from 'jupyter-js-filebrowser';

import {
  Container, Token
} from 'phosphor-di';

import {
  Widget
} from 'phosphor-widget';

import {
  IServicesProvider, IFileBrowserProvider
} from '../index';

import {
  IFileHandler, IFileOpener
} from './index';


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
  container.register(IFileHandler, DefaultFileHandler);
  container.register(IFileOpener, FileOpener);
}


/**
 * An implementation of an IFileHandler.
 */
class DefaultFileHandler implements IFileHandler {

  /**
   * The dependencies required by the file handler.
   */
  static requires: Token<any>[] = [IServicesProvider];

  /**
   * Create a new file handler instance.
   */
  static create(services: IServicesProvider): IFileHandler {
    return new DefaultFileHandler(services);
  }

  /**
   * Construct a new DefaultFileHandler.
   */
  constructor(services: IServicesProvider) {
    this._handler = new FileHandler(services.contentsManager);
  }

  get fileRegexes(): string[] {
    return this._handler.fileRegexes;
  }

  open(path: string): Promise<Widget> {
    return this._handler.open(path);
  }

  close(widget: Widget): boolean {
    return this._handler.close(widget);
  }

  private _handler: FileHandler = null;
}


/**
 * An implementation on an IFileOpener.
 */
class FileOpener implements IFileOpener {

  /**
   * The dependencies required by the file opener.
   */
  static requires: Token<any>[] = [IFileBrowserProvider];

  /**
   * Create a new file opener instance.
   */
  static create(browserProvider: IFileBrowserProvider): IFileOpener {
    return new FileOpener(browserProvider);
  }

  constructor(browserProvider: IFileBrowserProvider) {
    browserProvider.fileBrowser.openRequested.connect(this._openRequested,
      this);
  }

  register(handler: IFileHandler) {
    this._handlers.push(handler);
  }

  private _openRequested(browser: FileBrowser, path: string) {

  }

  private _handlers: IFileHandler[] = [];
}
