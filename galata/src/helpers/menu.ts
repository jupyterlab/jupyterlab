// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ElementHandle, Locator, Page } from '@playwright/test';
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
    const existingMenus = page.locator('.lm-Menu');
    const numOpenMenus = await existingMenus.count();
    // close menus
    for (let i = 0; i < numOpenMenus; ++i) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(100);
      await Utils.waitForCondition(
        async () => (await existingMenus.count()) === numOpenMenus - (i + 1)
      );
    }
  }

  /**
   * Get the handle on a menu from its label.
   *
   * @param label Menu label
   * @returns Handle to the menu or null
   *
   * @deprecated You should use locator instead {@link getMenuBarItemLocator}
   */
  getMenuBarItem(label: string): Promise<ElementHandle<Element> | null> {
    return this.getMenuBarItemLocator(label).elementHandle();
  }

  /**
   * Get the locator on a menu from its label.
   *
   * @param label Menu label
   * @returns Locator to the menu
   */
  getMenuBarItemLocator(label: string): Locator {
    return this.page.locator(
      `li:has(div.lm-MenuBar-itemLabel:text-is("${label}"))`
    );
  }

  /**
   * Open a context menu and get its handle.
   *
   * @param selector Element over which the menu should be opened
   * @returns Handle to the menu or null
   *
   * @deprecated You should use locator instead {@link openContextMenuLocator}
   */
  async openContextMenu(
    selector: string
  ): Promise<ElementHandle<Element> | null> {
    return (await this.openContextMenuLocator(selector)).elementHandle();
  }

  /**
   * Open a context menu and get its locator.
   *
   * @param selector Element over which the menu should be opened
   * @returns Locator to the menu
   */
  async openContextMenuLocator(selector: string): Promise<Locator> {
    await this.page.click(selector, {
      button: 'right'
    });
    return this.page.locator('.lm-Menu');
  }

  /**
   * Get the handle on a menu item from its path.
   *
   * The separator used is '>'; e.g. to look for the new Notebook item 'File>New>Notebook'.
   *
   * @param path Menu item path
   * @returns Handle to the menu item or null
   *
   * @deprecated You should use locator instead {@link getMenuItemLocator}
   */
  async getMenuItem(path: string): Promise<ElementHandle<Element> | null> {
    return (await this.getMenuItemLocator(path))?.elementHandle() ?? null;
  }

  /**
   * Get the locator on a menu item from its path.
   *
   * The separator used is '>'; e.g. to look for the new Notebook item 'File>New>Notebook'.
   *
   * @param path Menu item path
   * @returns Locator to the menu item or null
   */
  async getMenuItemLocator(path: string): Promise<Locator | null> {
    const page = this.page;
    const parts = path.split('>');
    const numParts = parts.length;
    let subMenu: Locator | null = null;

    for (let i = 0; i < numParts; ++i) {
      const part = parts[i];
      const menuItem =
        i === 0
          ? this.getMenuBarItemLocator(part)
          : await this.getMenuItemLocatorInMenu(subMenu!, part);
      if (menuItem) {
        if (i === numParts - 1) {
          return menuItem;
        } else {
          if (i === 0) {
            subMenu = page.locator('.lm-Menu.lm-MenuBar-menu');
          } else {
            const newMenus = page.locator('.lm-Menu');
            subMenu = (await newMenus.count()) > 0 ? newMenus.last() : null;
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
   * @returns Handle to the menu item or null
   *
   * @deprecated You should use locator instead {@link getMenuItemLocatorInMenu}
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
   * Get a menu item locator from its label.
   *
   * @param parentMenu Menu locator
   * @param label Item label
   * @returns Locator to the menu item or null
   */
  async getMenuItemLocatorInMenu(
    parentMenu: Locator,
    label: string
  ): Promise<Locator | null> {
    const items = parentMenu.locator(
      `ul li:has(div.lm-Menu-itemLabel:text-is("${label}"))`
    );
    if ((await items.count()) > 1) {
      throw new Error(`More than one menu item matches label '${label}'`);
    }
    return (await items.count()) > 0 ? items.first() : null;
  }

  /**
   * Whether any menus are opened or not
   *
   * @returns Opened menus status
   */
  async isAnyOpen(): Promise<boolean> {
    return (await this.page.locator('.lm-Menu').count()) > 0;
  }

  /**
   * Whether a menu is opened or not
   *
   * @param path Menu path
   * @returns Opened menu status
   */
  async isOpen(path: string): Promise<boolean> {
    return (await (await this.getMenuItemLocator(path))?.isVisible()) ?? false;
  }

  /**
   * Open a menu from its path
   *
   * @param path Menu path
   * @returns Handle to the opened menu
   *
   * @deprecated You should use locator instead {@link openLocator}
   */
  async open(path: string): Promise<ElementHandle<Element> | null> {
    return (await this.openLocator(path))?.elementHandle() ?? null;
  }

  /**
   * Open a menu from its path
   *
   * @param path Menu path
   * @returns Locator to the opened menu
   */
  async openLocator(path: string): Promise<Locator | null> {
    await this.closeAll();

    const page = this.page;
    const parts = path.split('>');
    const numParts = parts.length;
    let subMenu: Locator | null = null;

    for (let i = 0; i < numParts; ++i) {
      const part = parts[i];
      const menuItem =
        i === 0
          ? this.getMenuBarItemLocator(part)
          : await this.getMenuItemLocatorInMenu(subMenu!, part);
      if (menuItem) {
        if (i === 0) {
          await menuItem.click();
          subMenu = page.locator('.lm-Menu.lm-MenuBar-menu');
          await subMenu.waitFor({ state: 'visible' });
        } else {
          const expectedMenusCount =
            (await page.locator('.lm-Menu').count()) + 1;
          await menuItem.hover();
          await Utils.waitForCondition(async () => {
            return (
              (await page.locator('.lm-Menu').count()) === expectedMenusCount &&
              (await Utils.getLocatorClassList(menuItem)).includes(
                'lm-mod-active'
              )
            );
          });
          await page.waitForTimeout(200);

          // Fetch a new list of menus, and fetch the last one.
          // We are assuming the last menu is the most recently opened.
          const newMenus = page.locator('.lm-Menu');
          subMenu = newMenus.last();
        }
      }
    }

    return subMenu;
  }

  /**
   * Get the handle to the last opened menu
   *
   * @returns Handle to the opened menu
   *
   * @deprecated You should use locator instead {@link getOpenMenuLocator}
   */
  async getOpenMenu(): Promise<ElementHandle<Element> | null> {
    return (await this.getOpenMenuLocator())?.elementHandle() ?? null;
  }

  /**
   * Get the locator to the last opened menu
   *
   * @returns Handle to the opened menu
   */
  async getOpenMenuLocator(): Promise<Locator | null> {
    const openMenus = this.page.locator('.lm-Widget.lm-Menu .lm-Menu-content');
    if ((await openMenus.count()) > 0) {
      return openMenus.last();
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
    const parentMenu = await this.openLocator(path);
    const menuItem =
      parentMenu && (await this.getMenuItemLocatorInMenu(parentMenu, label));

    if (menuItem) {
      await menuItem.click();
    }
  }
}
