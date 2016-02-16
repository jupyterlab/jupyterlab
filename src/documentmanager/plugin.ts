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
  IAppShell, ICommandPalette, ICommandRegistry
} from 'phosphide';

import * as arrays
 from 'phosphor-arrays';

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
    requires: [IAppShell, IDocumentManager, IFileBrowserWidget, ICommandPalette, ICommandRegistry],
    create: (appShell: IAppShell, manager: IDocumentManager, browser: IFileBrowserWidget, palette: ICommandPalette, registry: ICommandRegistry): void => {

      // Create a command to add a new empty text file.
      // This requires an id and an instance of a command object.
      let newTextFileId = 'file-operations:new-text-file';

      // Add the command to the command registry and command palette plugins.
      registry.add([
        {
          id: newTextFileId,
          handler: () => {
            browser.newUntitled('file', '.txt').then(
              contents => manager.open(contents)
            );
          }
        }
      ]);
      palette.add([
        {
          id: newTextFileId,
          args: void 0,
          category: 'File Operations',
          text: 'New Text File',
          caption: 'Create a new text file'
        }
      ]);

      // Add the command for a new notebook.
      let newNotebookId = 'file-operations:new-notebook';

      registry.add([
        {
          id: newNotebookId,
          handler: () => {
            browser.newUntitled('notebook').then(
              contents => manager.open(contents)
            );
          }
        }
      ]);
      palette.add([
        {
          id: newNotebookId,
          args: void 0,
          category: 'File Operations',
          text: 'New Notebook',
          caption: 'Create a new Jupyter Notebook'
        }
      ]);

      // Add the command for saving a document.
      let saveDocumentId = 'file-operations:save';

      registry.add([
        {
          id: saveDocumentId,
          handler: () => {
            manager.save();
            return true;
          }
        }
      ]);
      palette.add([
        {
          id: saveDocumentId,
          args: void 0,
          category: 'File Operations',
          text: 'Save Document',
          caption: 'Save the current document'
        }
      ]);

      // Add the command for reverting a document.
      let revertDocumentId = 'file-operations:revert';

      registry.add([
        {
          id: revertDocumentId,
          handler: () => {
            manager.revert();
            return true;
          }
        }
      ]);
      palette.add([
        {
          id: revertDocumentId,
          args: void 0,
          category: 'File Operations',
          text: 'Revert Document',
          caption: 'Revert the current document'
        }
      ]);

      // Add the command for closing a document.
      let closeDocumentId = 'file-operations:close';

      registry.add([
        {
          id: closeDocumentId,
          handler: () => {
            manager.close();
            return true;
          }
        }
      ]);
      palette.add([
        {
          id: closeDocumentId,
          args: void 0,
          category: 'File Operations',
          text: 'Close Document',
          caption: 'Close the current document'
        }
      ]);

      // Add the command for closing all documents.
      let closeAllId = 'file-operations:close-all';

      registry.add([
        {
          id: closeAllId,
          handler: () => {
            manager.closeAll();
            return true;
          }
        }
      ]);
      palette.add([
        {
          id: closeAllId,
          args: void 0,
          category: 'File Operations',
          text: 'Close All',
          caption: 'Close all open documents'
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
      let id = 0;
      browser.openRequested.connect((browser, model) => {
        let widget = manager.open(model);
        if (!widget.id) widget.id = `document-manager-${++id}`;
        if (!widget.isAttached) appShell.addToMainArea(widget);
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
