// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  FileBrowserWidget
} from './browser';

import {
  FileBrowserModel
} from './model';

import {
  DocumentManager, DocumentRegistry, DocumentWidget
} from '../docmanager';

import {
  Application
} from 'phosphide/lib/core/application';

import {
  Menu, MenuItem
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
  requires: [JupyterServices, DocumentRegistry],
  activate: activateFileBrowser
};


/**
 * Activate the file browser.
 */
function activateFileBrowser(app: Application, provider: JupyterServices, registry: DocumentRegistry): Promise<void> {
  let contents = provider.contentsManager;
  let sessions = provider.notebookSessionManager;
  let widgets: DocumentWidget[] = [];
  let activeWidget: DocumentWidget;
  let id = 0;

  let opener = {
    open: (widget: DocumentWidget) => {
      if (!widget.id) {
        widget.id = `document-manager-${++id}`;
      }
      if (!widget.isAttached) {
        app.shell.addToMainArea(widget);
      }
      // TODO: Move this logic to the shell.
      let stack = widget.parent;
      if (!stack) {
        return;
      }
      let tabs = stack.parent;
      if (tabs instanceof TabPanel) {
        tabs.currentWidget = widget;
      }
      activeWidget = widget;
      widget.disposed.connect((w: DocumentWidget) => {
        let index = widgets.indexOf(w);
        widgets.splice(index, 1);
      });
    }
  };

  // TODO: Move focus tracking to the shell.
  document.addEventListener('focus', event => {
    for (let i = 0; i < widgets.length; i++) {
      let widget = widgets[i];
      if (widget.node.contains(event.target as HTMLElement)) {
        activeWidget = widget;
        break;
      }
    }
  });

  let docManager = new DocumentManager(
    registry, contents, sessions, provider.kernelspecs, opener
  );
  let model = new FileBrowserModel(contents, sessions, provider.kernelspecs);
  let widget = new FileBrowserWidget(model, docManager, opener);
  let menu = createMenu(widget);

  // Add a context menu to the dir listing.
  let node = widget.node.getElementsByClassName('jp-DirListing-content')[0];
  node.addEventListener('contextmenu', (event: MouseEvent) => {
    event.preventDefault();
    let x = event.clientX;
    let y = event.clientY;
    menu.popup(x, y);
  });

  // Add the command for a new items.
  let newTextFileId = 'file-operations:new-text-file';

  app.commands.add([
    {
      id: newTextFileId,
      handler: () => widget.createNew('file')
    }
  ]);

  let newNotebookId = 'file-operations:new-notebook';

  app.commands.add([
  {
    id: newNotebookId,
    handler: () => widget.createNew('notebook')
  }]);


  // Add the command for saving a document.
  let saveDocumentId = 'file-operations:save';

  app.commands.add([
    {
      id: saveDocumentId,
      handler: () => {
        if (!activeWidget) {
          return;
        }
        activeWidget.context.save();
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
        if (!activeWidget) {
          return;
        }
        activeWidget.context.revert();
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
        if (activeWidget) {
          activeWidget.close();
        }
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
        docManager.closeAll();
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

  app.palette.add([
    {
      command: newTextFileId,
      category: 'File Operations',
      text: 'New Text File',
      caption: 'Create a new text file'
    },
    {
      command: newNotebookId,
      category: 'File Operations',
      text: 'New Notebook',
      caption: 'Create a new notebook'
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
    },
    {
      id: 'file-browser:toggle',
      handler: toggleBrowser
    }
  ]);

  widget.title.text = 'Files';
  widget.id = 'file-browser';
  app.shell.addToLeftArea(widget, { rank: 40 });
  showBrowser();
  return Promise.resolve(void 0);

  function showBrowser(): void {
    app.shell.activateLeft(widget.id);
  }

  function hideBrowser(): void {
    if (!widget.isHidden) {
      app.shell.collapseLeft();
    }
  }

  function toggleBrowser(): void {
    if (widget.isHidden) {
      showBrowser();
    } else {
      hideBrowser();
    }
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
    })
  ]);
}
