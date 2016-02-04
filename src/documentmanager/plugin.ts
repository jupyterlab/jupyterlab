// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  FileBrowserWidget, AbstractFileHandler
} from 'jupyter-js-filebrowser';

import {
  IContentsModel
} from 'jupyter-js-services';

import {
  IAppShell, ICommandPalette, ICommandRegistry, IShortcutManager
} from 'phosphide';

import * as arrays
 from 'phosphor-arrays';

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
  IDocumentManager
} from './index';


/**
 * The class name added to document widgets.
 */
export
const DOCUMENT_CLASS = 'jp-Document';

/**
 * The class name added to focused widgets.
 */
export
const FOCUS_CLASS = 'jp-mod-focus';


/**
 * Register the plugin contributions.
 */
export
function resolve(container: Container): Promise<void> {
  return container.resolve({
    requires: [IAppShell, IDocumentManager, IFileBrowserWidget, ICommandPalette, ICommandRegistry, IShortcutManager],
    create: (appShell: IAppShell, manager: IDocumentManager, browser: IFileBrowserWidget, palette: ICommandPalette, registry: ICommandRegistry, shortcuts: IShortcutManager): void => {

      // Create a command to add a new empty text file.
      // This requires an id and an instance of a command object.
      let newTextFileId = 'file-operations:new-text-file';
      let newTextFileCommand = new SimpleCommand({
        category: 'File Operations',
        text: 'New Text File',
        caption: 'Create a new text file',
        handler: () => {
          browser.newUntitled('file', '.txt').then(
            contents => manager.open(contents)
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
        category: 'File Operations',
        text: 'New Notebook',
        caption: 'Create a new Jupyter Notebook',
        handler: () => {
          browser.newUntitled('notebook').then(
            contents => manager.open(contents)
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

      // Add the command for saving a document.
      let saveDocumentId = 'file-operations:save';
      let saveDocumentCommand = new SimpleCommand({
        category: 'File Operations',
        text: 'Save Document',
        caption: 'Save the current document',
        handler: () => {
          manager.save();
          return true;
        }
      });

      registry.add([
        {
          id: saveDocumentId,
          command: saveDocumentCommand
        }
      ]);
      shortcuts.add([
        {
          sequence: ['Accel S'],
          selector: `.${DOCUMENT_CLASS}.${FOCUS_CLASS}`,
          command: saveDocumentId
        }
      ]);
      palette.add([
        {
          id: saveDocumentId,
          args: void 0
        }
      ]);

      // Add the command for reverting a document.
      let revertDocumentId = 'file-operations:revert';
      let revertDocumentCommand = new SimpleCommand({
        category: 'File Operations',
        text: 'Revert Document',
        caption: 'Revert the current document',
        handler: () => {
          manager.revert();
          return true;
        }
      });

      registry.add([
        {
          id: revertDocumentId,
          command: revertDocumentCommand
        }
      ]);
      shortcuts.add([
        {
          sequence: ['Accel R'],
          selector: `.${DOCUMENT_CLASS}.${FOCUS_CLASS}`,
          command: revertDocumentId
        }
      ]);
      palette.add([
        {
          id: revertDocumentId,
          args: void 0
        }
      ]);

      // Add the command for closing a document.
      let closeDocumentId = 'file-operations:close';
      let closeDocumentCommand = new SimpleCommand({
        category: 'File Operations',
        text: 'Close Document',
        caption: 'Close the current document',
        handler: () => {
          manager.close();
          return true;
        }
      });

      registry.add([
        {
          id: closeDocumentId,
          command: closeDocumentCommand
        }
      ]);
      shortcuts.add([
        {
          sequence: ['Ctrl Q'],
          selector: `.${DOCUMENT_CLASS}.${FOCUS_CLASS}`,
          command: closeDocumentId
        }
      ]);
      palette.add([
        {
          id: closeDocumentId,
          args: void 0
        }
      ]);

      // Add the command for closing all documents.
      let closeAllId = 'file-operations:close-all';
      let closeAllCommand = new SimpleCommand({
        category: 'File Operations',
        text: 'Close All',
        caption: 'Close all open documents',
        handler: () => {
          manager.closeAll();
          return true;
        }
      });

      registry.add([
        {
          id: closeAllId,
          command: closeAllCommand
        }
      ]);
      shortcuts.add([
        {
          sequence: ['Ctrl Shift Q'],
          selector: `.${DOCUMENT_CLASS}`,
          command: closeAllId
        }
      ]);
      palette.add([
        {
          id: closeAllId,
          args: void 0
        }
      ]);

      browser.widgetFactory = model => {
        return manager.open(model);
      }
    }
  });
}


export
function register(container: Container): void {
  container.register(IDocumentManager, {
    requires: [IAppShell, IFileBrowserWidget],
    create: (appShell, browserProvider): IDocumentManager => {
      return new DocumentManager(appShell, browserProvider);
    }
  });
}


/**
 * An implementation on an IDocumentManager.
 */
class DocumentManager implements IDocumentManager {

  /**
   * Construct a new document manager.
   */
  constructor(appShell: IAppShell, browser: IFileBrowserWidget) {
    this._appShell = appShell;
    browser.openRequested.connect(this._openRequested,
      this);
    document.addEventListener('focus', this._onFocus.bind(this), true);
  }

  /**
   * Get the most recently focused widget.
   *
   * #### Notes
   * This is a read-only property.
   */
  get currentWidget(): Widget {
    return this._currentWidget;
  }

  /**
   * Register a file handler.
   */
  register(handler: AbstractFileHandler): void {
    this._handlers.push(handler);
  }

  /**
   * Register a default file handler.
   */
  registerDefault(handler: AbstractFileHandler): void {
    if (this._defaultHandler !== null) {
      throw Error('Default handler already registered');
    }
    this._handlers.push(handler);
    this._defaultHandler = handler;
  }

  /**
   * Open a file and add it to the application shell.
   */
  open(model: IContentsModel): Widget {
    if (this._handlers.length === 0) {
      return;
    }
    let path = model.path;
    let ext = '.' + path.split('.').pop();
    let handlers: AbstractFileHandler[] = [];
    // Look for matching file extensions.
    for (let h of this._handlers) {
      if (h.fileExtensions.indexOf(ext) !== -1) handlers.push(h);
    }
    let widget: Widget;
    // If there was only one match, use it.
    if (handlers.length === 1) {
      widget = this._open(handlers[0], model);

    // If there were no matches, use default handler.
    } else if (handlers.length === 0) {
      if (this._defaultHandler !== null) {
        widget = this._open(this._defaultHandler, model);
      } else {
        throw new Error(`Could not open file '${path}'`);
      }

    // There are more than one possible handlers.
    } else {
      // TODO: Ask the user to choose one.
      widget = this._open(handlers[0], model);
    }
    widget.addClass(DOCUMENT_CLASS);
    return widget;
  }

  /**
   * Save the current document.
   */
  save(): void {
    if (this._currentHandler) this._currentHandler.save(this._currentWidget);
  }

  /**
   * Revert the current document.
   */
  revert(): void {
    if (this._currentHandler) this._currentHandler.revert(this._currentWidget);
  }

  /**
   * Close the current document.
   */
  close(): void {
    if (this._currentHandler) this._currentHandler.close(this._currentWidget);
    this._currentWidget = null;
    this._currentHandler = null;
  }

  /**
   * Close all documents.
   */
  closeAll(): void {
    for (let h of this._handlers) {
      for (let w of h.widgets) {
        w.close();
      }
    }
    this._currentWidget = null;
    this._currentHandler = null;
  }

  /**
   * Handle an `openRequested` signal by invoking the appropriate handler.
   */
  private _openRequested(browser: FileBrowserWidget, model: IContentsModel): void {
    this.open(model);
  }

  /**
   * Open a file and add it to the application shell and give it focus.
   */
  private _open(handler: AbstractFileHandler, model: IContentsModel): Widget {
    let widget = handler.open(model);
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

  /**
   * Handle a focus event on the document.
   */
  private _onFocus(event: Event) {
    for (let h of this._handlers) {
      // If the widget belongs to the handler, update the focused widget.
      let widget = arrays.find(h.widgets,
        w => { return w.isVisible && w.node.contains(event.target as HTMLElement); });
      if (widget === this._currentWidget) {
        return;
      } else if (widget) {
        if (this._currentWidget) this._currentWidget.removeClass(FOCUS_CLASS);
        this._currentWidget = widget;
        this._currentHandler = h;
        widget.addClass(FOCUS_CLASS);
        return;
      }
    }
  }

  private _handlers: AbstractFileHandler[] = [];
  private _appShell: IAppShell = null;
  private _defaultHandler: AbstractFileHandler = null;
  private _currentWidget: Widget = null;
  private _currentHandler: AbstractFileHandler = null;
}
