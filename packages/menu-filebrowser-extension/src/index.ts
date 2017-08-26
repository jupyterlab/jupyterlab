// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  createMenu
} form '@jupyterlab/filebrowser-extension';

import {
 IMainMenu
} from '@jupyterlab/apputils';


/**
 * The default file browser extension.
 */
const fileBrowserMenuPlugin: JupyterLabPlugin<void> = {
  activate: activateFileBrowserMenu,
  id: 'jupyter.extensions.filebrowsermenu',
  requires: [
    IMainMenu,
  ],
  autoStart: true
};


/**
 * Activate the default file browser menu in the main menu.
 */
function activateFileBrowserMenu(app: JupyterLab, mainMenu: IMainMenu): void {
  let menu = createMenu(app);

  mainMenu.addMenu(menu, { rank: 1 });
}


