// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Widget
} from '@phosphor/widgetwidget';

import {
  JupyterLab, JupyterLabPlugin
} from '../application';

import {
  IMainMenu, MainMenu
} from './';


/**
 * The class name for all main area portrait tab icons.
 */
const PORTRAIT_ICON_CLASS = 'jp-MainAreaPortraitIcon';

/**
 * The class name for the jupyter icon from the default theme.
 */
const JUPYTER_ICON_CLASS = 'jp-JupyterIcon';


/**
 * A service providing an interface to the main menu.
 */
const plugin: JupyterLabPlugin<IMainMenu> = {
  id: 'jupyter.services.main-menu',
  provides: IMainMenu,
  activate: (app: JupyterLab): IMainMenu => {
    let menu = new MainMenu({ keymap: app.keymap });
    menu.id = 'jp-MainMenu';

    let logo = new Widget();
    logo.node.className = `${PORTRAIT_ICON_CLASS} ${JUPYTER_ICON_CLASS}`;
    logo.id = 'jp-MainLogo';

    app.shell.addToTopArea(logo);
    app.shell.addToTopArea(menu);

    return menu;
  }
};


/**
 * Export the plugin as default.
 */
export default plugin;
