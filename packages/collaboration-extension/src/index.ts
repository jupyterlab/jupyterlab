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
import { DOMUtils } from '@jupyterlab/apputils';
import {
  AwarenessMock,
  CollaboratorsPanel,
  IAwareness,
  IGlobalAwareness,
  IUserMenu,
  RendererUserMenu,
  UserInfoPanel,
  UserMenu
} from '@jupyterlab/collaboration';
import { SidePanel, usersIcon } from '@jupyterlab/ui-components';
import { Menu, MenuBar } from '@lumino/widgets';
import { URLExt } from '@jupyterlab/coreutils';
import { ServerConnection } from '@jupyterlab/services';
import { IStateDB, StateDB } from '@jupyterlab/statedb';
import { ITranslator } from '@jupyterlab/translation';

/**
 * Jupyter plugin providing the IUserMenu.
 */
const userMenuPlugin: JupyterFrontEndPlugin<IUserMenu> = {
  id: '@jupyterlab/collaboration-extension:userMenu',
  autoStart: true,
  requires: [],
  provides: IUserMenu,
  activate: (app: JupyterFrontEnd): IUserMenu => {
    const { commands } = app;
    const { user } = app.serviceManager;
    return new UserMenu({ commands, user });
  }
};

/**
 * Jupyter plugin adding the IUserMenu to the menu bar if collaborative flag enabled.
 */
const menuBarPlugin: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/collaboration-extension:userMenuBar',
  autoStart: true,
  requires: [IUserMenu],
  activate: async (app: JupyterFrontEnd, menu: IUserMenu): Promise<void> => {
    const { shell } = app;
    const { user } = app.serviceManager;

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
    user.userChanged.connect(() => menuBar.update());
    menuBar.addMenu(menu as Menu);
    shell.add(menuBar, 'top', { rank: 1000 });
  }
};

/**
 * Jupyter plugin creating a global awareness for RTC.
 */
const rtcGlobalAwarenessPlugin: JupyterFrontEndPlugin<IAwareness> = {
  id: '@jupyterlab/collaboration-extension:rtcGlobalAwareness',
  autoStart: true,
  requires: [IStateDB],
  provides: IGlobalAwareness,
  activate: (app: JupyterFrontEnd, state: StateDB): IAwareness => {
    const { user } = app.serviceManager;
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
      awareness.setLocalStateField('user', user.identity);
    };
    if (user.isReady) {
      userChanged();
    }
    user.ready.then(userChanged).catch(e => console.error(e));
    user.userChanged.connect(userChanged);

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
  requires: [IGlobalAwareness, ITranslator],
  activate: (
    app: JupyterFrontEnd,
    awareness: Awareness,
    translator: ITranslator
  ): void => {
    if (PageConfig.getOption('collaborative') !== 'true') {
      return;
    }
    const { user } = app.serviceManager;

    const trans = translator.load('jupyterlab');

    const userPanel = new SidePanel();
    userPanel.id = DOMUtils.createDomID();
    userPanel.title.icon = usersIcon;
    userPanel.title.caption = trans.__('Collaboration');
    userPanel.addClass('jp-RTCPanel');
    app.shell.add(userPanel, 'left', { rank: 300 });

    const currentUserPanel = new UserInfoPanel(user);
    currentUserPanel.title.label = trans.__('User info');
    currentUserPanel.title.caption = trans.__('User information');
    userPanel.addWidget(currentUserPanel);

    const fileopener = (path: string) => {
      void app.commands.execute('docmanager:open', { path });
    };

    const collaboratorsPanel = new CollaboratorsPanel(
      user,
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
  userMenuPlugin,
  menuBarPlugin,
  rtcGlobalAwarenessPlugin,
  rtcPanelPlugin
];

export default plugins;
