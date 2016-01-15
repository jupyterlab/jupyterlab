// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  FileBrowserWidget, FileHandler
} from 'jupyter-js-filebrowser';

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
  IFileBrowserProvider
} from '../index';

import {
  IFileOpener, IFileHandler
} from './index';


/**
 * Register the plugin contributions.
 */
export
function resolve(container: Container): Promise<void> {
  return container.resolve(FileOpenerProvider).then(provider => provider.run());
}

export
function register(container: Container): void {
  container.register(IFileOpener, FileOpener);
}


class FileOpenerProvider {
  /**
   * The dependencies required by the file opener.
   */
  static requires: Token<any>[] = [IAppShell, IFileOpener, IFileBrowserProvider, ICommandPalette, ICommandRegistry];

  static create(appShell: IAppShell, opener: IFileOpener, browserProvider: IFileBrowserProvider, palette: ICommandPalette, registry: ICommandRegistry): FileOpenerProvider {
    return new FileOpenerProvider(appShell, opener, browserProvider, palette, registry);
  }

  /**
   * Construct a new file opener.
   */
  constructor(appShell: IAppShell, opener: IFileOpener, browserProvider: IFileBrowserProvider, palette: ICommandPalette, registry: ICommandRegistry) {
    this._browser = browserProvider.fileBrowser;
    this._registry = registry;
    this._palette = palette;
    this._appShell = appShell;
    this._opener = opener;
  }


  run() {
    let newFileCommandItem = {
      id: 'jupyter-plugins:new-text-file',
      command: new DelegateCommand(() => {
        this._browser.newUntitled('file', '.txt').then(
          contents => this._opener.open(contents.path)
        );
      })
    }
    let newNotebookCommandItem = {
      id: 'jupyter-plugins:new-notebook',
      command: new DelegateCommand(() => {
        this._browser.newUntitled('notebook').then(
          contents => this._opener.open(contents.path)
        );
      })
    }
    this._registry.add([newFileCommandItem, newNotebookCommandItem]);
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
    this._palette.add([section]);

    FileBrowserWidget.widgetFactory = () => {
      let model = this._browser.model;
      let item = model.items[model.selected[0]];
      return this._opener.open(item.path);
    }
  }

  private _appShell: IAppShell = null;
  private _defaultHandler: IFileHandler = null;
  private _browser: FileBrowserWidget = null;
  private _registry: ICommandRegistry = null;
  private _palette: ICommandPalette = null;
  private _opener: IFileOpener = null;
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
    this._appShell = appShell;
    browserProvider.fileBrowser.openRequested.connect(this._openRequested,
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
    var widget = handler.open(path);
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
