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
import { IStateDB } from '@jupyterlab/statedb';
import {
  ICurrentUser,
  IMenu,
  IUser,
  IUserMenu,
  RendererUserMenu,
  User,
  UserMenu
} from '@jupyterlab/user';
import { MenuBar, Widget } from '@lumino/widgets';

/**
 * Jupyter plugin providing the ICurrentUser.
 */
const userPlugin: JupyterFrontEndPlugin<IUser> = {
  id: '@jupyterlab/user-extension:user',
  autoStart: true,
  requires: [IStateDB],
  provides: ICurrentUser,
  activate: (app: JupyterFrontEnd, state: IStateDB): IUser => {
    return new User(state);
  }
};

/**
 * Jupyter plugin providing the IUserMenu.
 */
const userMenuPlugin: JupyterFrontEndPlugin<IMenu | undefined> = {
  id: '@jupyterlab/user-extension:userMenu',
  autoStart: true,
  requires: [ICurrentUser],
  provides: IUserMenu,
  activate: (app: JupyterFrontEnd, user: IUser): IMenu | undefined => {
    const { shell, commands } = app;

    if (PageConfig.getOption('collaborative') !== 'true') {
      return undefined;
    }

    const spacer = new Widget();
    spacer.id = 'jp-topbar-spacer';
    shell.add(spacer, 'top', { rank: 900 });

    const menuBar = new MenuBar({
      forceItemsPosition: {
        forceX: false,
        forceY: false
      },
      renderer: new RendererUserMenu(user)
    });
    menuBar.id = 'jp-UserMenu';
    user.changed.connect(() => menuBar.update());
    const menu = new UserMenu({ commands, user });
    menuBar.addMenu(menu);
    shell.add(menuBar, 'top', { rank: 1000 });

    return menu;
  }
};

/**
 * Export the plugins as default.
 */
const plugins: JupyterFrontEndPlugin<any>[] = [userPlugin, userMenuPlugin];

export default plugins;
