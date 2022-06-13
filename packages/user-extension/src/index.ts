// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/**
 * @packageDocumentation
 * @module user-extension
 */

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { IToolbarWidgetRegistry } from '@jupyterlab/apputils';
import { PageConfig } from '@jupyterlab/coreutils';
import {
  ICurrentUser,
  IUserMenu,
  RendererUserMenu,
  User,
  UserMenu
} from '@jupyterlab/user';
import { Menu, MenuBar } from '@lumino/widgets';

/**
 * Jupyter plugin providing the ICurrentUser.
 */
const userPlugin: JupyterFrontEndPlugin<ICurrentUser> = {
  id: '@jupyterlab/user-extension:user',
  autoStart: true,
  provides: ICurrentUser,
  activate: (app: JupyterFrontEnd): ICurrentUser => {
    return new User();
  }
};

/**
 * Jupyter plugin providing the IUserMenu.
 */
const userMenuPlugin: JupyterFrontEndPlugin<IUserMenu> = {
  id: '@jupyterlab/user-extension:user-menu',
  autoStart: true,
  requires: [ICurrentUser],
  provides: IUserMenu,
  activate: (app: JupyterFrontEnd, user: ICurrentUser): IUserMenu => {
    const { commands } = app;
    return new UserMenu({ commands, user });
  }
};

/**
 * Jupyter plugin adding the IUserMenu to the menu bar if collaborative flag enabled.
 */
const menuBarPlugin: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/user-extension:user-menu-bar',
  autoStart: true,
  requires: [ICurrentUser, IUserMenu, IToolbarWidgetRegistry],
  activate: (
    app: JupyterFrontEnd,
    user: ICurrentUser,
    menu: IUserMenu,
    toolbarRegistry: IToolbarWidgetRegistry
  ): void => {
    if (PageConfig.getOption('collaborative') !== 'true') {
      return;
    }

    toolbarRegistry.addFactory('TopBar', 'user-menu', () => {
      const menuBar = new MenuBar({
        forceItemsPosition: {
          forceX: false,
          forceY: false
        },
        renderer: new RendererUserMenu(user)
      });
      menuBar.id = 'jp-UserMenu';
      user.changed.connect(() => {
        menuBar.update();
      });
      menuBar.addMenu(menu as Menu);

      return menuBar;
    });
  }
};

/**
 * Export the plugins as default.
 */
const plugins: JupyterFrontEndPlugin<any>[] = [
  userPlugin,
  userMenuPlugin,
  menuBarPlugin
];

export default plugins;
