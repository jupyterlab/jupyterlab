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
import { IStateDB } from '@jupyterlab/statedb';
import {
  ICurrentUser,
  IUserMenu,
  RendererUserMenu,
  User,
  UserMenu
} from '@jupyterlab/user';
import { Menu, MenuBar, Widget } from '@lumino/widgets';

/**
 * A namespace for command IDs.
 */
export namespace CommandIDs {
  export const settings = '@jupyterlab/user-extension:settings:open';
}

/**
 *
 */
const userPlugin: JupyterFrontEndPlugin<User> = {
  id: '@jupyterlab/user-extension:user',
  autoStart: true,
  requires: [IStateDB],
  provides: ICurrentUser,
  activate: (app: JupyterFrontEnd, state: IStateDB): User => {
    return new User(state);
  }
};

/**
 *
 */
const userMenuPlugin: JupyterFrontEndPlugin<Menu> = {
  id: '@jupyterlab/user-extension:userMenu',
  autoStart: true,
  requires: [ICurrentUser],
  provides: IUserMenu,
  activate: (app: JupyterFrontEnd, user: User): Menu => {
    const { shell, commands } = app;

    const spacer = new Widget();
    spacer.id = 'jp-topbar-spacer';
    shell.add(spacer, 'top', { rank: 1000 });

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
    shell.add(menuBar, 'top', { rank: 1002 });

    return menu;
  }
};

/**
 * Export the plugins as default.
 */
const plugins: JupyterFrontEndPlugin<any>[] = [userPlugin, userMenuPlugin];

export default plugins;
