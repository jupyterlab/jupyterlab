// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ElementHandle, Page } from '@playwright/test';
import * as Utils from '../utils';

/**
 * Main menu helpers
 */
export class MenuHelper {
  constructor(readonly page: Page) {}

  /**
   * Close all menus
   */
  async closeAll(): Promise<void> {
    const page = this.page;
    const existingMenus = await page.$$('.lm-Menu');
    const numOpenMenus = existingMenus.length;
    // close menus
    for (let i = 0; i < numOpenMenus; ++i) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(100);
      await page.waitForFunction((menuCount: number) => {
        return document.querySelectorAll('.lm-Menu').length === menuCount;
      }, numOpenMenus - (i + 1));
    }
  }

  /**
   * Get the handle on a menu from its label.
   *
   * @param label Menu label
   * @returns Handle to the menu or null
   */
  getMenuBarItem(label: string): Promise<ElementHandle<Element> | null> {
    return this.page.$(
      `xpath=//li[./div[text()="${label}" and ${Utils.xpContainsClass(
        'lm-MenuBar-itemLabel'
      )}]]`
    );
  }

  /**
   * Open a context menu and get its handle.
   *
   * @param selector Element over which the menu should be opened
   * @returns Handle to the menu or null
   */
  async openContextMenu(
    selector: string
  ): Promise<ElementHandle<Element> | null> {
    await this.page.click(selector, {
      button: 'right'
    });
    return await this.page.$('.lm-Menu');
  }

  /**
   * Get the handle on a menu item from its path.
   *
   * The separator used is '>'; e.g. to look for the new Notebook item 'File>New>Notebook'.
   *
   * @param path Menu item path
   * @returns Handle to the menu item
   */
  async getMenuItem(path: string): Promise<ElementHandle<Element> | null> {
    const page = this.page;
    const parts = path.split('>');
    const numParts = parts.length;
    let subMenu: ElementHandle<Element> | null = null;

    for (let i = 0; i < numParts; ++i) {
      const part = parts[i];
      const menuItem =
        i === 0
          ? await this.getMenuBarItem(part)
          : await this.getMenuItemInMenu(subMenu!, part);
      if (menuItem) {
        if (i === numParts - 1) {
          return menuItem;
        } else {
          if (i === 0) {
            subMenu = await page.$('.lm-Menu.lm-MenuBar-menu');
          } else {
            const newMenus = await page.$$('.lm-Menu');
            subMenu =
              newMenus?.length > 0 ? newMenus[newMenus.length - 1] : null;
          }
          if (!subMenu) {
            return null;
          }
        }
      } else {
        return null;
      }
    }

    return null;
  }

  /**
   * Get a menu item handle from its label.
   *
   * @param parentMenu Menu handle
   * @param label Item label
   * @returns Handle to the menu item
   */
  async getMenuItemInMenu(
    parentMenu: ElementHandle<Element>,
    label: string
  ): Promise<ElementHandle<Element> | null> {
    const items = await parentMenu.$$(
      `xpath=./ul/li[./div[text()="${label}" and ${Utils.xpContainsClass(
        'lm-Menu-itemLabel'
      )}]]`
    );
    if (items.length > 1) {
      throw new Error(`More than one menu item matches label '${label}'`);
    }
    return items.length > 0 ? items[0] : null;
  }

  /**
   * Whether any menus are opened or not
   *
   * @returns Opened menus status
   */
  async isAnyOpen(): Promise<boolean> {
    return (await this.page.$('.lm-Menu')) !== null;
  }

  /**
   * Whether a menu is opened or not
   *
   * @param path Menu path
   * @returns Opened menu status
   */
  async isOpen(path: string): Promise<boolean> {
    return (await this.getMenuItem(path)) !== null;
  }

  /**
   * Open a menu from its path
   *
   * @param path Menu path
   * @returns Handle to the opened menu
   */
  async open(path: string): Promise<ElementHandle<Element> | null> {
    await this.closeAll();

    const page = this.page;
    const parts = path.split('>');
    const numParts = parts.length;
    let subMenu: ElementHandle<Element> | null = null;

    for (let i = 0; i < numParts; ++i) {
      const part = parts[i];
      const menuItem =
        i === 0
          ? await this.getMenuBarItem(part)
          : await this.getMenuItemInMenu(subMenu!, part);
      if (menuItem) {
        if (i === 0) {
          await menuItem.click();
          subMenu = await page.waitForSelector('.lm-Menu.lm-MenuBar-menu', {
            state: 'visible'
          });
        } else {
          const existingMenus = await page.$$('.lm-Menu');
          await menuItem.hover();
          await page.waitForFunction(
            ({ n, item }) => {
              return (
                document.querySelectorAll('.lm-Menu').length === n &&
                item.classList.contains('lm-mod-active')
              );
            },
            { n: existingMenus.length + 1, item: menuItem }
          );
          await page.waitForTimeout(200);

          // Fetch a new list of menus, and fetch the last one.
          // We are assuming the last menu is the most recently opened.
          const newMenus = await page.$$('.lm-Menu');
          subMenu = newMenus[newMenus.length - 1];
        }
      }
    }

    return subMenu;
  }

  /**
   * Get the handle to the last opened menu
   *
   * @returns Handle to the opened menu
   */
  async getOpenMenu(): Promise<ElementHandle<Element> | null> {
    const openMenus = await this.page.$$('.lm-Widget.lm-Menu .lm-Menu-content');
    if (openMenus.length > 0) {
      return openMenus[openMenus.length - 1];
    }

    return null;
  }

  /**
   * Click on a menu item from its path
   *
   * @param path Menu item path
   */
  async clickMenuItem(path: string): Promise<void> {
    const parts = path.split('>');
    const numParts = parts.length;
    const label = parts[numParts - 1];
    path = parts.slice(0, numParts - 1).join('>');

    // open parent menu
    const parentMenu = await this.open(path);
    const menuItem =
      parentMenu && (await this.getMenuItemInMenu(parentMenu, label));

    if (menuItem) {
      await menuItem.click();
    }
  }
}
