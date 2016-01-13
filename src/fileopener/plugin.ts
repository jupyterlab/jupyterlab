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
  Property
} from 'phosphor-properties';

import {
  Widget
} from 'phosphor-widget';

import {
  IFileBrowserProvider
} from '../index';

import {
  IFileOpener, IFileHandler
} from './index';


/**
 * Register the plugin contributions.
 */
export
function register(container: Container): void {
  container.register(IFileOpener, FileOpener);
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

  /**
   * Construct a new file opener.
   */
  constructor(browserProvider: IFileBrowserProvider) {
    browserProvider.fileBrowser.openRequested.connect(this._openRequested,
      this);
  }

  /**
   * Register a file handler.
   */
  register(handler: IFileHandler, isDefault: boolean) {
    this._handlers.push(handler);
    isDefaultProperty.set(handler, isDefault);
  }

  /**
   * Handle an `openRequested` signal by invoking the appropriate handler.
   */
  private _openRequested(browser: FileBrowserWidget, path: string): void {
    if (this._handlers.length === 0) {
      return;
    }
    let ext = '.' + path.split('.').pop();
    let handlers: IFileHandler[] = [];
    // Look for matching file extensions.
    for (let h of this._handlers) {
      if (h.fileExtensions.indexOf(ext) !== -1) handlers.push(h);
    }
    // If there was only one match, use it.
    if (handlers.length === 1) {
      handlers[0].open(path);
      return;

    // If there were no matches, look for default handler(s).
    } else if (handlers.length === 0) {
      for (let h of this._handlers) {
        if (isDefaultProperty.get(h)) handlers.push(h);
      }
    }

    // If there we no matches, do nothing.
    if (handlers.length == 0) {
      console.warn('Could not open file ')

    // If there was one handler, use it.
    } else if (handlers.length === 1) {
      handlers[0].open(path);
    } else {
      // There are more than one possible handlers.
      // TODO: Ask the user to choose one.
      handlers[0].open(path);
    }
  }

  private _handlers: IFileHandler[] = [];
}


/**
 * An attached property for whether a file handler is a default.
 */
const
isDefaultProperty = new Property<IFileHandler, boolean>({
  name: 'isDefault',
  value: false,
});
