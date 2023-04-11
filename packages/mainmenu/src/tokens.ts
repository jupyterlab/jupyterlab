// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { MenuFactory } from '@jupyterlab/apputils';
import { Token } from '@lumino/coreutils';
import { Menu } from '@lumino/widgets';
import { IEditMenu } from './edit';
import { IFileMenu } from './file';
import { IHelpMenu } from './help';
import { IKernelMenu } from './kernel';
import { IRunMenu } from './run';
import { ISettingsMenu } from './settings';
import { ITabsMenu } from './tabs';
import { IViewMenu } from './view';

/**
 * The main menu token.
 */
export const IMainMenu = new Token<IMainMenu>(
  '@jupyterlab/mainmenu:IMainMenu',
  `A service for the main menu bar for the application.
  Use this if you want to add your own menu items or provide implementations for standardized menu items for specific activities.`
);

/**
 * The main menu interface.
 */
export interface IMainMenu {
  /**
   * Add a new menu to the main menu bar.
   *
   * @param menu The menu to add
   * @param update Whether to update the menu bar or not
   * @param options Options for adding the menu
   */
  addMenu(menu: Menu, update?: boolean, options?: IMainMenu.IAddOptions): void;

  /**
   * The application "File" menu.
   */
  readonly fileMenu: IFileMenu;

  /**
   * The application "Edit" menu.
   */
  readonly editMenu: IEditMenu;

  /**
   * The application "View" menu.
   */
  readonly viewMenu: IViewMenu;

  /**
   * The application "Help" menu.
   */
  readonly helpMenu: IHelpMenu;

  /**
   * The application "Kernel" menu.
   */
  readonly kernelMenu: IKernelMenu;

  /**
   * The application "Run" menu.
   */
  readonly runMenu: IRunMenu;

  /**
   * The application "Settings" menu.
   */
  readonly settingsMenu: ISettingsMenu;

  /**
   * The application "Tabs" menu.
   */
  readonly tabsMenu: ITabsMenu;
}

/**
 * The namespace for IMainMenu attached interfaces.
 */
export namespace IMainMenu {
  /**
   * The options used to add a menu to the main menu.
   */
  export interface IAddOptions {
    /**
     * The rank order of the menu among its siblings.
     */
    rank?: number;
  }

  /**
   * The instantiation options for an IMainMenu.
   */
  export interface IMenuOptions extends MenuFactory.IMenuOptions {}
}
