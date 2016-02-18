// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  DocumentManager
} from 'jupyter-js-docmanager';

import {
  FileBrowserWidget, FileBrowserModel
} from 'jupyter-js-filebrowser';

import {
  IContentsModel
} from 'jupyter-js-services';

import {
  Application
} from 'phosphide/lib/core/application';

import {
  Menu, MenuBar, MenuItem
} from 'phosphor-menus';

import {
  TabPanel
} from 'phosphor-tabs';

import {
  JupyterServices
} from '../services/plugin';


/**
 * The default file browser extension.
 */
export
const fileBrowserExtension = {
  id: 'jupyter.extensions.fileBrowser',
  requires: [DocumentManager, JupyterServices],
  activate: activateFileBrowser
};


/**
 * Activate the file browser.
 */
function activateFileBrowser(app: Application, manager: DocumentManager, provider: JupyterServices): Promise<void> {
  let contents = provider.contentsManager;
  let sessions = provider.notebookSessionManager;
  let model = new FileBrowserModel(contents, sessions);
  let widget = new FileBrowserWidget(model);
  let menu = createMenu(widget);

  // Add a context menu to the dir listing.
  let node = widget.node.getElementsByClassName('jp-DirListing-content')[0];
  node.addEventListener('contextmenu', (event: MouseEvent) => {
    event.preventDefault();
    let x = event.clientX;
    let y = event.clientY;
    menu.popup(x, y);
  });

  let onOpenRequested = (model: IContentsModel) => {
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
  }

  // Create a command to add a new empty text file.
  // This requires an id and an instance of a command object.
  let newTextFileId = 'file-operations:new-text-file';

  // Add the command to the command registry and command palette plugins.
  app.commands.add([
    {
      id: newTextFileId,
      handler: () => {
        widget.newUntitled('file', '.txt').then(
          contents => onOpenRequested(contents)
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
        widget.newUntitled('notebook').then(
          contents => onOpenRequested(contents)
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

  app.commands.add([
    {
      id: 'file-browser:activate',
      handler: showBrowser
    },
    {
      id: 'file-browser:hide',
      handler: hideBrowser
    }
  ]);

  widget.widgetFactory = model => {
    return manager.open(model);
  }

  let id = 0;
  widget.openRequested.connect((browser, model) => onOpenRequested(model));

  widget.title.text = 'Files';
  widget.id = 'file-browser';
  app.shell.addToLeftArea(widget, { rank: 40 });
  return Promise.resolve(void 0);

  function showBrowser(): void {
    app.shell.activateLeft(widget.id);
  }

  function hideBrowser(): void {
    if (!widget.isHidden) app.shell.collapseLeft();
  }
}


/**
 * Create a context menu for the file browser listing.
 */
function createMenu(fbWidget: FileBrowserWidget):  Menu {
  return new Menu([
    new MenuItem({
      text: '&Open',
      icon: 'fa fa-folder-open-o',
      shortcut: 'Ctrl+O',
      handler: () => { fbWidget.open(); }
    }),
    new MenuItem({
      text: '&Rename',
      icon: 'fa fa-edit',
      shortcut: 'Ctrl+R',
      handler: () => { fbWidget.rename(); }
    }),
    new MenuItem({
      text: '&Delete',
      icon: 'fa fa-remove',
      shortcut: 'Ctrl+D',
      handler: () => { fbWidget.delete(); }
    }),
    new MenuItem({
      text: 'Duplicate',
      icon: 'fa fa-copy',
      handler: () => { fbWidget.duplicate(); }
    }),
    new MenuItem({
      text: 'Cut',
      icon: 'fa fa-cut',
      shortcut: 'Ctrl+X',
      handler: () => { fbWidget.cut(); }
    }),
    new MenuItem({
      text: '&Copy',
      icon: 'fa fa-copy',
      shortcut: 'Ctrl+C',
      handler: () => { fbWidget.copy(); }
    }),
    new MenuItem({
      text: '&Paste',
      icon: 'fa fa-paste',
      shortcut: 'Ctrl+V',
      handler: () => { fbWidget.paste(); }
    }),
    new MenuItem({
      text: 'Download',
      icon: 'fa fa-download',
      handler: () => { fbWidget.download(); }
    }),
    new MenuItem({
      text: 'Shutdown Kernel',
      icon: 'fa fa-stop-circle-o',
      handler: () => { fbWidget.shutdownKernels(); }
    }),
  ]);
}
