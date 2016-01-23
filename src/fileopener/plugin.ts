// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  FileBrowserWidget, FileHandler
} from 'jupyter-js-filebrowser';

import {
  IAppShell, ICommandPalette, ICommandRegistry, IShortcutManager
} from 'phosphide';

import {
  SimpleCommand
} from 'phosphor-command';

import {
  Container, Token
} from 'phosphor-di';

import {
  Property
} from 'phosphor-properties';

import {
  TabPanel
} from 'phosphor-tabs';

import {
  Widget
} from 'phosphor-widget';

import {
  IFileBrowserWidget
} from '../index';

import {
  IFileOpener, IFileHandler
} from './index';


/**
 * Register the plugin contributions.
 */
export
function resolve(container: Container): Promise<void> {
  return container.resolve({
    requires: [IAppShell, IFileOpener, IFileBrowserWidget, ICommandPalette, ICommandRegistry, IShortcutManager],
    create: (appShell: IAppShell, opener: IFileOpener, browser: IFileBrowserWidget, palette: ICommandPalette, registry: ICommandRegistry, shortcuts: IShortcutManager): void => {

      // Create a command to add a new empty text file.
      // This requires an id and an instance of a command object.
      let newTextFileId = 'file-operations:new-text-file';
      let newTextFileCommand = new SimpleCommand({
        handler: () => {
          browser.newUntitled('file', '.txt').then(
            contents => opener.open(contents.path)
          );
        }
      });

      // Add the command to the command registry, shortcut manager
      // and command palette plugins.
      registry.add([
        {
          id: newTextFileId,
          command: newTextFileCommand
        }
      ]);
      shortcuts.add([
        {
          sequence: ['Ctrl O'],
          selector: '*',
          command: newTextFileId
        }
      ]);
      palette.add([
        {
          id: newTextFileId,
          args: void 0
        }
      ]);

      // Add the command for a new notebook.
      let newNotebookId = 'file-operations:new-notebook';
      let newNotebookCommand = new SimpleCommand({
        handler: () => {
          browser.newUntitled('notebook').then(
            contents => opener.open(contents.path)
          );
        }
      });

      registry.add([
        {
          id: newNotebookId,
          command: newNotebookCommand
        }
      ]);
      shortcuts.add([
        {
          sequence: ['Ctrl Shift N'],
          selector: '*',
          command: newNotebookId
        }
      ]);
      palette.add([
        {
          id: newNotebookId,
          args: void 0
        }
      ]);

      browser.widgetFactory = path => {
        return opener.open(path);
      }
    }
  });
}


export
function register(container: Container): void {
  container.register(IFileOpener, {
    requires: [IAppShell, IFileBrowserWidget],
    create: (appShell, browserProvider): IFileOpener => {
      return new FileOpener(appShell, browserProvider);
    }
  });
}


/**
 * An implementation on an IFileOpener.
 */
class FileOpener implements IFileOpener {

  /**
   * Construct a new file opener.
   */
  constructor(appShell: IAppShell, browser: IFileBrowserWidget) {
    this._appShell = appShell;
    browser.openRequested.connect(this._openRequested,
      this);
  }

  /**
   * Register a file handler.
   */
  register(handler: IFileHandler): void {
    this._handlers.push(handler);
  }

  /**
   * Register a default file handler.
   */
  registerDefault(handler: IFileHandler): void {
    if (this._defaultHandler !== null) {
      throw Error('Default handler already registered');
    }
    this._handlers.push(handler);
    this._defaultHandler = handler;
  }

  /**
   * Open a file and add it to the application shell.
   */
  open(path: string): Widget {
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

    // If there were no matches, use default handler.
    } else if (handlers.length === 0) {
      if (this._defaultHandler !== null) {
        return this._open(this._defaultHandler, path);
      } else {
        throw new Error(`Could not open file '${path}'`);
      }

    // There are more than one possible handlers.
    } else {
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
   * Open a file and add it to the application shell and give it focus.
   */
  private _open(handler: IFileHandler, path: string): Widget {
    let widget = handler.open(path);
    if (!widget.isAttached) {
      this._appShell.addToMainArea(widget);
    }
    let stack = widget.parent;
    if (!stack) {
      return;
    }
    let tabs = stack.parent;
    if (tabs instanceof TabPanel) {
      tabs.currentWidget = widget;
    }
    return widget;
  }

  private _handlers: IFileHandler[] = [];
  private _appShell: IAppShell = null;
  private _defaultHandler: IFileHandler = null;
}
