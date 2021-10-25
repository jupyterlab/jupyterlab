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
import { DOMUtils } from '@jupyterlab/apputils';
import { userIcon } from '@jupyterlab/ui-components';
import {
  ICurrentUser,
  IUserMenu,
  IUserPanel,
  RendererUserMenu,
  User,
  UserMenu,
  UserSidePanel,
  UserInfoPanel
} from '@jupyterlab/user';
import { Menu, MenuBar, Widget, AccordionPanel } from '@lumino/widgets';


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

const userMenuPlugin: JupyterFrontEndPlugin<Menu> = {
  id: '@jupyterlab/user-extension:userMenu',
  autoStart: true,
  requires: [ICurrentUser],
  provides: IUserMenu,
  activate: (app: JupyterFrontEnd, user: User): Menu => {
    const { shell, commands } = app;

    const spacer = new Widget();
    spacer.id = 'jp-topbar-spacer';
    spacer.addClass('topbar-spacer');
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

    menu.addItem({ type: 'separator' });

    return menu;
  }
};

const userPanelPlugin: JupyterFrontEndPlugin<AccordionPanel> = {
  id: '@jupyterlab/user-extension:userSidePanel',
  autoStart: true,
  requires: [],
  provides: IUserPanel,
  activate: (
    app: JupyterFrontEnd
  ): AccordionPanel => {
    const userPanel = new AccordionPanel({
      renderer: new UserSidePanel.Renderer()
    });
    userPanel.id = DOMUtils.createDomID();
    userPanel.title.icon = userIcon;
    userPanel.addClass('jp-UserSidePanel');
    app.shell.add(userPanel, 'left', { rank: 300 });
    return userPanel;
  }
};

const userSettingsPlugin: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/user-extension:userInfo',
  autoStart: true,
  requires: [ICurrentUser, IUserPanel],
  activate: (
    app: JupyterFrontEnd,
    user: User,
    userPanel: AccordionPanel
  ): void => {
    const sharePanel = new UserInfoPanel(user);
    userPanel.addWidget(sharePanel);
  }
};

/**
 * Export the plugins as default.
 */
const plugins: JupyterFrontEndPlugin<any>[] = [
  userPlugin,
  userMenuPlugin,
  userSettingsPlugin,
  userPanelPlugin
];

export default plugins;
