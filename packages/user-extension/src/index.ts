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
  id: '@jupyterlab/user-extension:userMenu',
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
  id: '@jupyterlab/user-extension:userMenuBar',
  autoStart: true,
  requires: [ICurrentUser, IUserMenu],
  activate: (
    app: JupyterFrontEnd,
    user: ICurrentUser,
    menu: IUserMenu
  ): void => {
    const { shell } = app;

    if (PageConfig.getOption('collaborative') !== 'true') {
      return;
    }

    const menuBar = new MenuBar({
      forceItemsPosition: {
        forceX: false,
        forceY: false
      },
      renderer: new RendererUserMenu(user)
    });
    menuBar.id = 'jp-UserMenu';
    user.changed.connect(() => menuBar.update());
    menuBar.addMenu(menu as Menu);
    shell.add(menuBar, 'top', { rank: 1000 });
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
