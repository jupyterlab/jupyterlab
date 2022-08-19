/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { Text } from '@jupyterlab/coreutils';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { LabIcon } from '@jupyterlab/ui-components';
import { JSONExt } from '@lumino/coreutils';
import { ContextMenu, Menu } from '@lumino/widgets';

/**
 * Helper functions to build a menu from the settings
 */
export namespace MenuFactory {
  /**
   * Menu constructor options
   */
  export interface IMenuOptions {
    /**
     * The unique menu identifier.
     */
    id: string;

    /**
     * The menu label.
     */
    label?: string;

    /**
     * The menu rank.
     */
    rank?: number;
  }

  /**
   * Create menus from their description
   *
   * @param data Menubar description
   * @param menuFactory Factory for empty menu
   */
  export function createMenus(
    data: ISettingRegistry.IMenu[],
    menuFactory: (options: IMenuOptions) => Menu
  ): Menu[] {
    return data
      .filter(item => !item.disabled)
      .sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity))
      .map(menuItem => {
        return dataToMenu(menuItem, menuFactory);
      });
  }

  /**
   * Convert a menu description in a JupyterLabMenu object
   *
   * @param item Menu description
   * @param menuFactory Empty menu factory
   * @returns The menu widget
   */
  function dataToMenu(
    item: ISettingRegistry.IMenu,
    menuFactory: (options: IMenuOptions) => Menu
  ): Menu {
    const menu = menuFactory(item);
    menu.id = item.id;

    // Set the label in case the menu factory did not.
    if (!menu.title.label) {
      menu.title.label = item.label ?? Text.titleCase(menu.id.trim());
    }

    if (item.icon) {
      menu.title.icon = LabIcon.resolve({ icon: item.icon });
    }
    if (item.mnemonic !== undefined) {
      menu.title.mnemonic = item.mnemonic;
    }

    item.items
      ?.filter(item => !item.disabled)
      .sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity))
      .map(item => {
        addItem(item, menu, menuFactory);
      });
    return menu;
  }

  /**
   * Convert an item description in a context menu item object
   *
   * @param item Context menu item
   * @param menu Context menu to populate
   * @param menuFactory Empty menu factory
   */
  export function addContextItem(
    item: ISettingRegistry.IContextMenuItem,
    menu: ContextMenu,
    menuFactory: (options: IMenuOptions) => Menu
  ): void {
    const { submenu, ...newItem } = item;
    // Commands may not have been registered yet; so we don't force it to exist
    menu.addItem({
      ...newItem,
      submenu: submenu ? dataToMenu(submenu, menuFactory) : null
    } as any);
  }

  /**
   * Convert an item description in a menu item object
   *
   * @param item Menu item
   * @param menu Menu to populate
   * @param menuFactory Empty menu factory
   */
  function addItem(
    item: ISettingRegistry.IMenuItem,
    menu: Menu,
    menuFactory: (options: IMenuOptions) => Menu
  ): void {
    const { submenu, ...newItem } = item;
    // Commands may not have been registered yet; so we don't force it to exist
    menu.addItem({
      ...newItem,
      submenu: submenu ? dataToMenu(submenu, menuFactory) : null
    } as any);
  }

  /**
   * Update an existing list of menu and returns
   * the new elements.
   *
   * #### Note
   * New elements are added to the current menu list.
   *
   * @param menus Current menus
   * @param data New description to take into account
   * @param menuFactory Empty menu factory
   * @returns Newly created menus
   */
  export function updateMenus(
    menus: Menu[],
    data: ISettingRegistry.IMenu[],
    menuFactory: (options: IMenuOptions) => Menu
  ): Menu[] {
    const newMenus: Menu[] = [];
    data.forEach(item => {
      const menu = menus.find(menu => menu.id === item.id);
      if (menu) {
        mergeMenus(item, menu, menuFactory);
      } else {
        if (!item.disabled) {
          newMenus.push(dataToMenu(item, menuFactory));
        }
      }
    });
    menus.push(...newMenus);
    return newMenus;
  }

  function mergeMenus(
    item: ISettingRegistry.IMenu,
    menu: Menu,
    menuFactory: (options: IMenuOptions) => Menu
  ) {
    if (item.disabled) {
      menu.dispose();
    } else {
      item.items?.forEach(entry => {
        const existingItem = menu?.items.find(
          (i, idx) =>
            i.type === entry.type &&
            i.command === (entry.command ?? '') &&
            i.submenu?.id === entry.submenu?.id
        );

        if (existingItem && entry.type !== 'separator') {
          if (entry.disabled) {
            menu.removeItem(existingItem);
          } else {
            switch (entry.type ?? 'command') {
              case 'command':
                if (entry.command) {
                  if (!JSONExt.deepEqual(existingItem.args, entry.args ?? {})) {
                    addItem(entry, menu, menuFactory);
                  }
                }
                break;
              case 'submenu':
                if (entry.submenu) {
                  mergeMenus(entry.submenu, existingItem.submenu!, menuFactory);
                }
            }
          }
        } else {
          addItem(entry, menu, menuFactory);
        }
      });
    }
  }
}
