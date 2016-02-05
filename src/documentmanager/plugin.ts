// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  AbstractFileHandler, DocumentManager
} from 'jupyter-js-docmanager';

import {
  FileBrowserWidget
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
    create: (appShell: IAppShell, browser: IFileBrowserWidget): IDocumentManager => {
      let manager = new DocumentManager();
      browser.openRequested.connect((browser, model) => {
        manager.open(model);
      });
      manager.openRequested.connect((manager, widget) => {
        if (!widget.isAttached) {
          appShell.addToMainArea(widget);
        }
        let stack = widget.parent;
        if (!stack) {
          return;
        }
        let tabs = stack.parent;
        if (tabs instanceof TabPanel) {
          tabs.currentWidget = widget;
        }
      });
      return manager;
    }
  });
}
