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
  Application
} from 'phosphide/lib/core/application';

import * as arrays
 from 'phosphor-arrays';

import {
  Property
} from 'phosphor-properties';

import {
  TabPanel
} from 'phosphor-tabs';

import {
  Widget
} from 'phosphor-widget';


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
 * The default document manager provider.
 */
export
const documentManagerProvider = {
  id: 'jupyter.services.documentManager',
  provides: DocumentManager,
  resolve: () => {
    return new DocumentManager();
  },
};


/**
 * The default document manager extension. 
 */
export
const documentManagerExtension = {
  id: 'jupyter.extensions.documentManager',
  requires: [DocumentManager, FileBrowserWidget],
  activate: activateDocumentManager
};


/**
 * Activate the document manager.
 */
function activateDocumentManager(app: Application, manager: DocumentManager, browser: FileBrowserWidget): Promise<void> {

  // Create a command to add a new empty text file.
  // This requires an id and an instance of a command object.
  let newTextFileId = 'file-operations:new-text-file';

  // Add the command to the command registry and command palette plugins.
  app.commands.add([
    {
      id: newTextFileId,
      handler: () => {
        browser.newUntitled('file', '.txt').then(
          contents => manager.open(contents)
        );
      }
    }
  ]);
  app.palette.add([
    {
      command: newTextFileId,
      category: 'File Operations',
      text: 'New Text File',
      caption: 'Create a new text file'
    }
  ]);

  // Add the command for a new notebook.
  let newNotebookId = 'file-operations:new-notebook';

  app.commands.add([
    {
      id: newNotebookId,
      handler: () => {
        browser.newUntitled('notebook').then(
          contents => manager.open(contents)
        );
      }
    }
  ]);
  app.palette.add([
    {
      command: newNotebookId,
      category: 'File Operations',
      text: 'New Notebook',
      caption: 'Create a new Jupyter Notebook'
    }
  ]);

  // Add the command for saving a document.
  let saveDocumentId = 'file-operations:save';

  app.commands.add([
    {
      id: saveDocumentId,
      handler: () => {
        manager.save();
        return true;
      }
    }
  ]);
  app.palette.add([
    {
      command: saveDocumentId,
      category: 'File Operations',
      text: 'Save Document',
      caption: 'Save the current document'
    }
  ]);

  // Add the command for reverting a document.
  let revertDocumentId = 'file-operations:revert';

  app.commands.add([
    {
      id: revertDocumentId,
      handler: () => {
        manager.revert();
        return true;
      }
    }
  ]);
  app.palette.add([
    {
      command: revertDocumentId,
      category: 'File Operations',
      text: 'Revert Document',
      caption: 'Revert the current document'
    }
  ]);

  // Add the command for closing a document.
  let closeDocumentId = 'file-operations:close';

  app.commands.add([
    {
      id: closeDocumentId,
      handler: () => {
        manager.close();
        return true;
      }
    }
  ]);
  app.palette.add([
    {
      command: closeDocumentId,
      category: 'File Operations',
      text: 'Close Document',
      caption: 'Close the current document'
    }
  ]);

  // Add the command for closing all documents.
  let closeAllId = 'file-operations:close-all';

  app.commands.add([
    {
      id: closeAllId,
      handler: () => {
        manager.closeAll();
        return true;
      }
    }
  ]);
  app.palette.add([
    {
      command: closeAllId,
      category: 'File Operations',
      text: 'Close All',
      caption: 'Close all open documents'
    }
  ]);

  browser.widgetFactory = model => {
    return manager.open(model);
  }

  let id = 0;
  browser.openRequested.connect((browser, model) => {
    let widget = manager.open(model);
    if (!widget.id) widget.id = `document-manager-${++id}`;
    if (!widget.isAttached) app.shell.addToMainArea(widget);
    let stack = widget.parent;
    if (!stack) {
      return;
    }
    let tabs = stack.parent;
    if (tabs instanceof TabPanel) {
      tabs.currentWidget = widget;
    }
  });

  return Promise.resolve(void 0);
}
