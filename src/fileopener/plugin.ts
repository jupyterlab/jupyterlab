// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  FileBrowserWidget, FileHandler
} from 'jupyter-js-filebrowser';

import {
  IContentsModel
} from 'jupyter-js-services';

import {
  IAppShell, ICommandPalette, ICommandRegistry
} from 'phosphide';

import {
  DelegateCommand
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
    requires: [IAppShell, IFileOpener, IFileBrowserWidget, ICommandPalette, ICommandRegistry],
    create: (appShell, opener, browser, palette, registry) => {
      let newFileCommandItem = {
        id: 'jupyter-plugins:new-text-file',
        command: new DelegateCommand(() => {
           browser.newUntitled('file', '.txt').then((contents: IContentsModel) => {
              opener.open(contents.path);
              browser.refresh();
            });
          })
      }
      let newNotebookCommandItem = {
        id: 'jupyter-plugins:new-notebook',
        command: new DelegateCommand(() => {
          browser.newUntitled('notebook').then((contents: IContentsModel) => {
            opener.open(contents.path);
            browser.refresh();
          });
        })
      }
      registry.add([newFileCommandItem, newNotebookCommandItem]);
      let paletteItems = [{
        id: 'jupyter-plugins:new-text-file',
        title: 'Text File',
        caption: ''
      }, {
        id: 'jupyter-plugins:new-notebook',
        title: 'Notebook',
        caption: ''
      }];
      let section = {
        text: 'New...',
        items: paletteItems
      }
      palette.add([section]);

      FileBrowserWidget.widgetFactory = () => {
        let model = browser.model;
        let item = model.items[model.selected[0]];
        return opener.open(item.path);
      }
    }
  });
}


export
function register(container: Container): void {
  container.register(IFileOpener, {
    requires: [IAppShell, IFileBrowserWidget],
    create: (shell, browser) => {
      return new FileOpener(shell, browser);
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
    let parent = widget.parent;
    while (parent) {
      if (parent instanceof TabPanel) {
        if ((parent as TabPanel).childIndex(widget) !== -1) {
          (parent as TabPanel).currentWidget = widget;
          return widget;
        }
      }
      parent = parent.parent;
    }
    return widget;
  }

  private _handlers: IFileHandler[] = [];
  private _appShell: IAppShell = null;
  private _defaultHandler: IFileHandler = null;
}
