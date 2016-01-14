// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  FileBrowserWidget, FileHandler
} from 'jupyter-js-filebrowser';

import {
  IAppShell
} from 'phosphide';

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
  static requires: Token<any>[] = [IAppShell, IFileBrowserProvider];

  /**
   * Create a new file opener instance.
   */
  static create(appShell: IAppShell, browserProvider: IFileBrowserProvider): IFileOpener {
    return new FileOpener(appShell, browserProvider);
  }

  /**
   * Construct a new file opener.
   */
  constructor(appShell: IAppShell, browserProvider: IFileBrowserProvider) {
    browserProvider.fileBrowser.openRequested.connect(this._openRequested,
      this);
    this._appShell = appShell;
  }

  /**
   * Register a file handler.
   */
  register(handler: IFileHandler, isDefault: boolean) {
    this._handlers.push(handler);
    isDefaultProperty.set(handler, isDefault);
  }

  /**
   * Open a file and add it to the application shell.
   */
  open(path: string): Promise<void> {
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
      return this._open(handlers[0], path);

    // If there were no matches, look for default handler(s).
    } else if (handlers.length === 0) {
      for (let h of this._handlers) {
        if (isDefaultProperty.get(h)) handlers.push(h);
      }
    }

    // If there we no matches, do nothing.
    if (handlers.length == 0) {
      return Promise.reject(new Error(`Could not open file '${path}'`));

    // If there was one handler, use it.
    } else if (handlers.length === 1) {
      return this._open(handlers[0], path);
    } else {
      // There are more than one possible handlers.
      // TODO: Ask the user to choose one.
      return this._open(handlers[0], path);
    }
  }

  /**
   * Handle an `openRequested` signal by invoking the appropriate handler.
   */
  private _openRequested(browser: FileBrowserWidget, path: string): void {
    this.open(path);
  }

  /**
   * Open a file and add it to the application shell.
   */
  private _open(handler: IFileHandler, path: string): Promise<void> {
    return handler.open(path).then(widget => {
      this._appShell.addToMainArea(widget);
    });
  }

  private _handlers: IFileHandler[] = [];
  private _appShell: IAppShell = null;
}


/**
 * An attached property for whether a file handler is a default.
 */
const
isDefaultProperty = new Property<IFileHandler, boolean>({
  name: 'isDefault',
  value: false,
});
