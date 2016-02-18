// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  FileBrowserWidget, FileBrowserModel
} from 'jupyter-js-filebrowser';

import {
  Application
} from 'phosphide/lib/core/application';

import {
  Menu, MenuBar, MenuItem
} from 'phosphor-menus';

import {
  ServicesProvider
} from '../services/plugin';


/**
 * The default file browser provider.
 */
export
const fileBrowserProvider = {
  id: 'jupyter.services.fileBrowser',
  provides: FileBrowserWidget,
  requires: [ServicesProvider],
  resolve: (provider: ServicesProvider) => {
    let contents = provider.contentsManager;
    let sessions = provider.notebookSessionManager;
    let model = new FileBrowserModel(contents, sessions);
    return new FileBrowserWidget(model);
  },
};


/**
 * The default file browser extension. 
 */
export
const fileBrowserExtension = {
  id: 'jupyter.extensions.fileBrowser',
  requires: [FileBrowserWidget],
  activate: activateFileBrowser
};


/**
 * Activate the file browser.
 */
function activateFileBrowser(app: Application, widget: FileBrowserWidget): Promise<void> {
  let menu = createMenu(widget);

  // Add a context menu to the dir listing.
  let node = widget.node.getElementsByClassName('jp-DirListing-content')[0];
  node.addEventListener('contextmenu', (event: MouseEvent) => {
    event.preventDefault();
    let x = event.clientX;
    let y = event.clientY;
    menu.popup(x, y);
  });
  return Promise.resolve(void 0);
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
