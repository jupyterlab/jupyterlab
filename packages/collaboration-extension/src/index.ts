// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/**
 * @packageDocumentation
 * @module collaboration-extension
 */

import * as Y from 'yjs';
import { Awareness } from 'y-protocols/awareness';
import { WebsocketProvider } from 'y-websocket';

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { PageConfig } from '@jupyterlab/coreutils';
import { DOMUtils, Toolbar } from '@jupyterlab/apputils';
import {
  AwarenessMock,
  CollaboratorsPanel,
  IAwareness,
  ICurrentUser,
  IGlobalAwareness,
  IUserMenu,
  RendererUserMenu,
  RTCPanel,
  User,
  UserInfoPanel,
  UserMenu
} from '@jupyterlab/collaboration';
import { usersIcon } from '@jupyterlab/ui-components';
import { AccordionPanel, Menu, MenuBar } from '@lumino/widgets';
import { URLExt } from '@jupyterlab/coreutils';
import { ServerConnection } from '@jupyterlab/services';
import { IStateDB, StateDB } from '@jupyterlab/statedb';
import { ITranslator } from '@jupyterlab/translation';

/**
 * Jupyter plugin providing the ICurrentUser.
 */
const userPlugin: JupyterFrontEndPlugin<ICurrentUser> = {
  id: '@jupyterlab/collaboration-extension:user',
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
  id: '@jupyterlab/collaboration-extension:userMenu',
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
  id: '@jupyterlab/collaboration-extension:userMenuBar',
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

    const spacer = Toolbar.createSpacerItem();
    spacer.id = DOMUtils.createDomID();
    spacer.addClass('jp-UserMenu-Spacer');

    shell.add(spacer, 'top', { rank: 900 });
    shell.add(menuBar, 'top', { rank: 1000 });
  }
};

/**
 * Jupyter plugin creating a global awareness for RTC.
 */
const rtcGlobalAwarenessPlugin: JupyterFrontEndPlugin<IAwareness> = {
  id: '@jupyterlab/collaboration-extension:rtcGlobalAwareness',
  autoStart: true,
  requires: [ICurrentUser, IStateDB],
  provides: IGlobalAwareness,
  activate: (
    app: JupyterFrontEnd,
    currentUser: User,
    state: StateDB
  ): IAwareness => {
    const ydoc = new Y.Doc();

    if (PageConfig.getOption('collaborative') !== 'true') {
      return new AwarenessMock(ydoc);
    }

    const awareness = new Awareness(ydoc);

    const server = ServerConnection.makeSettings();
    const url = URLExt.join(server.wsUrl, 'api/yjs');

    new WebsocketProvider(url, 'JupyterLab:globalAwareness', ydoc, {
      awareness: awareness
    });

    const userChanged = () => {
      const name =
        currentUser.displayName !== ''
          ? currentUser.displayName
          : currentUser.name;
      awareness.setLocalStateField('user', { ...currentUser.toJSON(), name });
    };
    if (currentUser.isReady) {
      userChanged();
    }
    currentUser.ready.connect(userChanged);
    currentUser.changed.connect(userChanged);

    state.changed.connect(async () => {
      const data: any = await state.toJSON();
      const current = data['layout-restorer:data']?.main?.current || '';

      if (current.startsWith('editor') || current.startsWith('notebook')) {
        awareness.setLocalStateField('current', current);
      } else {
        awareness.setLocalStateField('current', null);
      }
    });

    return awareness;
  }
};

/**
 * Jupyter plugin adding the RTC information to the application left panel if collaborative flag enabled.
 */
const rtcPanelPlugin: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/collaboration-extension:rtcPanel',
  autoStart: true,
  requires: [ICurrentUser, IGlobalAwareness, ITranslator],
  activate: (
    app: JupyterFrontEnd,
    currentUser: User,
    awareness: Awareness,
    translator: ITranslator
  ): void => {
    if (PageConfig.getOption('collaborative') !== 'true') {
      return;
    }

    const trans = translator.load('jupyterlab');

    const userPanel = new AccordionPanel({
      renderer: new RTCPanel.Renderer()
    });
    userPanel.id = DOMUtils.createDomID();
    userPanel.title.icon = usersIcon;
    userPanel.addClass('jp-RTCPanel');
    app.shell.add(userPanel, 'left', { rank: 300 });

    const currentUserPanel = new UserInfoPanel(currentUser);
    currentUserPanel.title.label = trans.__('User info');
    currentUserPanel.title.caption = trans.__('User information');
    userPanel.addWidget(currentUserPanel);

    const fileopener = (path: string) => {
      void app.commands.execute('docmanager:open', { path });
    };

    const collaboratorsPanel = new CollaboratorsPanel(
      currentUser,
      awareness,
      fileopener
    );
    collaboratorsPanel.title.label = trans.__('Online Collaborators');
    userPanel.addWidget(collaboratorsPanel);
  }
};

/**
 * Export the plugins as default.
 */
const plugins: JupyterFrontEndPlugin<any>[] = [
  userPlugin,
  userMenuPlugin,
  menuBarPlugin,
  rtcGlobalAwarenessPlugin,
  rtcPanelPlugin
];

export default plugins;
