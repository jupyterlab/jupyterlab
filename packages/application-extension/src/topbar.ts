/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import type {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import {
  createToolbarFactory,
  IToolbarWidgetRegistry,
  IUserMenu,
  RendererUserMenu,
  setToolbar,
  UserMenu
} from '@jupyterlab/apputils';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { Toolbar } from '@jupyterlab/ui-components';
import { MenuBar } from '@lumino/widgets';

const TOPBAR_FACTORY = 'TopBar';

/**
 * A plugin adding a toolbar to the top area.
 */
export const topbar: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/application-extension:top-bar',
  description: 'Adds a toolbar to the top area (next to the main menu bar).',
  autoStart: true,
  requires: [ISettingRegistry, IToolbarWidgetRegistry],
  optional: [ITranslator],
  activate: (
    app: JupyterFrontEnd,
    settingRegistry: ISettingRegistry,
    toolbarRegistry: IToolbarWidgetRegistry,
    translator: ITranslator | null
  ) => {
    const trans = (translator ?? nullTranslator).load('jupyterlab');
    const toolbar = new Toolbar();
    toolbar.id = 'jp-top-bar';
    toolbar.node.setAttribute('aria-label', trans.__('Topbar toolbar'));

    // Set toolbar
    setToolbar(
      toolbar,
      createToolbarFactory(
        toolbarRegistry,
        settingRegistry,
        TOPBAR_FACTORY,
        topbar.id,
        translator ?? nullTranslator
      ),
      toolbar
    );

    app.shell.add(toolbar, 'top', { rank: 900 });
  }
};

/**
 * A plugin providing the user menu.
 *
 * The menu is empty by default, so the avatar is not clickable until
 * an extension adds items to it.
 */
export const userMenu: JupyterFrontEndPlugin<IUserMenu> = {
  id: '@jupyterlab/application-extension:user-menu',
  description: 'Provides the user menu.',
  provides: IUserMenu,
  activate: (app: JupyterFrontEnd): IUserMenu => {
    const { commands } = app;
    const { user } = app.serviceManager;
    // TODO: add default items (e.g. user details, log out) once agreed on.
    // See https://github.com/jupyterlab/jupyterlab/issues/20534
    return new UserMenu({ commands, user });
  }
};

/**
 * A plugin adding the user menu with the current user's avatar to the top bar.
 */
export const userMenuBar: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/application-extension:user-menu-bar',
  description:
    "Adds the user menu with the current user's avatar to the top bar.",
  autoStart: true,
  requires: [IUserMenu, IToolbarWidgetRegistry],
  activate: (
    app: JupyterFrontEnd,
    menu: IUserMenu,
    toolbarRegistry: IToolbarWidgetRegistry
  ): void => {
    const { user } = app.serviceManager;

    const menuBar = new MenuBar({
      forceItemsPosition: {
        forceX: false,
        forceY: false
      },
      renderer: new RendererUserMenu(user)
    });
    menuBar.id = 'jp-UserMenu';
    user.userChanged.connect(() => menuBar.update());
    menuBar.addMenu(menu as UserMenu);

    toolbarRegistry.addFactory(TOPBAR_FACTORY, 'user-menu', () => menuBar);
  }
};
