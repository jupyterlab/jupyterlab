// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { ISettingRegistry } from '@jupyterlab/settingregistry';
import { ElementHandle, Locator, Page } from '@playwright/test';
import type { IPluginNameToInterfaceMap } from '../extension';
import { galata } from '../galata';
import * as Utils from '../utils';
import { MenuHelper } from './menu';

/**
 * Sidebar helpers
 */
export class SidebarHelper {
  constructor(
    readonly page: Page,
    readonly menu: MenuHelper
  ) {}

  /**
   * Whether a sidebar is opened or not
   *
   * @param side Sidebar side
   * @returns Opened status
   */
  isOpen = async (side: galata.SidebarPosition = 'left'): Promise<boolean> => {
    return (await this.getContentPanelLocator(side).count()) > 0;
  };

  /**
   * Whether a given tab is opened or not
   *
   * @param id Tab id
   * @returns Tab opened status
   */
  async isTabOpen(id: galata.SidebarTabId): Promise<boolean> {
    const tabButton = this.page.locator(
      `${this.buildTabSelector(id)}.lm-mod-current`
    );
    return (await tabButton.count()) > 0;
  }

  /**
   * Get the position of a given tab
   *
   * @param id Tab id
   * @returns Tab position
   */
  getTabPosition = async (
    id: galata.SidebarTabId
  ): Promise<galata.SidebarPosition | null> => {
    return await this.page.evaluate(
      async ({ tabSelector }) => {
        const tabButton = document.querySelector(tabSelector);
        if (!tabButton) {
          return null;
        }

        const sideBar = tabButton.closest('.jp-SideBar');
        if (!sideBar) {
          return null;
        }

        return sideBar.classList.contains('jp-mod-right') ? 'right' : 'left';
      },
      { tabSelector: this.buildTabSelector(id) }
    );
  };

  /**
   * Move a given tab to left side
   *
   * @param id Tab id
   */
  async moveTabToLeft(id: galata.SidebarTabId): Promise<void> {
    await this.setTabPosition(id, 'left');
  }

  /**
   * Move a given tab to the right side
   *
   * @param id Tab id
   */
  async moveTabToRight(id: galata.SidebarTabId): Promise<void> {
    await this.setTabPosition(id, 'right');
  }

  /**
   * Set the position of a given tab
   *
   * @param id Tab id
   * @param side Sidebar side
   */
  async setTabPosition(
    id: galata.SidebarTabId,
    side: galata.SidebarPosition
  ): Promise<void> {
    const position = await this.getTabPosition(id);

    if (position === side) {
      return;
    }

    await this.toggleTabPosition(id);

    await Utils.waitForCondition(async () => {
      return (await this.getTabPosition(id)) === side;
    });
  }

  /**
   * Toggle a given tab position
   *
   * @param id Tab id
   */
  async toggleTabPosition(id: galata.SidebarTabId): Promise<void> {
    const tab = this.getTabLocator(id);

    if (!(await tab.count())) {
      return;
    }

    await tab.click({ button: 'right' });

    const switchMenuItem = this.page.locator(
      '.lm-Menu-content .lm-Menu-item[data-command="sidebar:switch"]'
    );
    await switchMenuItem.waitFor({ state: 'visible' });
    if (await switchMenuItem.count()) {
      await switchMenuItem.click();
    }
  }

  /**
   * Move all tabs to the left side
   */
  async moveAllTabsToLeft(): Promise<void> {
    await this.page.evaluate(
      async ({ pluginId }) => {
        const settingRegistry = (await window.galata.getPlugin(
          pluginId
        )) as ISettingRegistry;
        const SHELL_ID = '@jupyterlab/application-extension:shell';
        const sidebars = {
          Debugger: 'left',
          'Property Inspector': 'left',
          'Extension Manager': 'left',
          'File Browser': 'left',
          'Sessions and Tabs': 'left',
          'Table of Contents': 'left'
        };
        const currentLayout = (await settingRegistry.get(
          SHELL_ID,
          'layout'
        )) as any;
        await settingRegistry.set(SHELL_ID, 'layout', {
          single: { ...currentLayout.single, ...sidebars },
          multiple: { ...currentLayout.multiple, ...sidebars }
        });
      },
      {
        pluginId:
          '@jupyterlab/apputils-extension:settings' as keyof IPluginNameToInterfaceMap
      }
    );

    await this.page.waitForFunction(() => {
      const rightStack = document.getElementById('jp-right-stack');
      return rightStack?.childElementCount === 0;
    });
  }

  /**
   * Get the handle on a given tab
   *
   * @param id Tab id
   * @returns Tab handle
   *
   * @deprecated You should use locator instead {@link getTabLocator}
   */
  async getTab(
    id: galata.SidebarTabId
  ): Promise<ElementHandle<Element> | null> {
    return await this.getTabLocator(id).elementHandle();
  }

  /**
   * Get the locator on a given tab
   *
   * @param id Tab id
   * @returns Tab locator
   */
  getTabLocator(id: galata.SidebarTabId): Locator {
    return this.page.locator(this.buildTabSelector(id));
  }

  /**
   * Open a given tab
   *
   * @param id Tab id
   */
  async openTab(id: galata.SidebarTabId): Promise<void> {
    const isOpen = await this.isTabOpen(id);
    if (isOpen) {
      return;
    }

    const tabButton = this.getTabLocator(id);
    if (!((await tabButton.count()) === 1)) {
      throw new Error(`Unable to find the tab ${id} button`);
    }
    await tabButton.click();
    await this._waitForTabActivate(tabButton);
  }

  /**
   * Get the handle on a sidebar content panel
   *
   * @param side Position
   * @returns Panel handle
   *
   * @deprecated You should use locator instead {@link getContentPanelLocator}
   */
  async getContentPanel(
    side: galata.SidebarPosition = 'left'
  ): Promise<ElementHandle<Element> | null> {
    return await this.getContentPanelLocator(side).elementHandle();
  }

  /**
   * Get the locator on a sidebar content panel
   *
   * @param side Position
   * @returns Panel handle
   */
  getContentPanelLocator(side: galata.SidebarPosition = 'left'): Locator {
    return this.page.locator(
      `#jp-${side}-stack .lm-StackedPanel-child:not(.lm-mod-hidden)`
    );
  }

  /**
   * Get the tab bar of the sidebar
   *
   * @param side Position
   * @returns Tab bar handle
   *
   * @deprecated You should use locator instead {@link getTabBarLocator}
   */
  async getTabBar(
    side: galata.SidebarPosition = 'left'
  ): Promise<ElementHandle<Element> | null> {
    return await this.getTabBarLocator(side).elementHandle();
  }

  /**
   * Get the locator of the tab bar of the sidebar
   *
   * @param side Position
   * @returns Tab bar locator
   */
  getTabBarLocator(side: galata.SidebarPosition = 'left'): Locator {
    return this.page.locator(`.jp-SideBar.jp-mod-${side}`);
  }

  /**
   * Open a given sidebar
   *
   * @param side Position
   */
  async open(side: galata.SidebarPosition = 'left'): Promise<void> {
    const isOpen = await this.isOpen(side);
    if (isOpen) {
      return;
    }

    await this.menu.clickMenuItem(
      `View>Appearance>Show ${side === 'left' ? 'Left' : 'Right'} Sidebar`
    );

    await Utils.waitForCondition(async () => {
      return await this.isOpen(side);
    });
  }

  /**
   * Close a given sidebar
   *
   * @param side Position
   */
  async close(side: galata.SidebarPosition = 'left'): Promise<void> {
    const isOpen = await this.isOpen(side);
    if (!isOpen) {
      return;
    }

    await this.menu.clickMenuItem(
      `View>Appearance>Show ${side === 'left' ? 'Left' : 'Right'} Sidebar`
    );

    await Utils.waitForCondition(async () => {
      return !(await this.isOpen(side));
    });
  }

  /**
   * Set the sidebar width
   *
   * @param width Sidebar width in pixels
   * @param side Which sidebar to set: 'left' or 'right'
   */
  async setWidth(
    width = 251,
    side: galata.SidebarPosition = 'left'
  ): Promise<boolean> {
    if (!(await this.isOpen(side))) {
      return false;
    }

    const handles = this.page.locator(
      '#jp-main-split-panel > .lm-SplitPanel-handle:not(.lm-mod-hidden)'
    );
    const splitHandle =
      side === 'left'
        ? await handles.first().elementHandle()
        : await handles.last().elementHandle();
    const handleBBox = await splitHandle!.boundingBox();

    await this.page.mouse.move(
      handleBBox!.x + 0.5 * handleBBox!.width,
      handleBBox!.y + 0.5 * handleBBox!.height
    );
    await this.page.mouse.down();
    await this.page.mouse.move(
      side === 'left'
        ? 33 + width
        : this.page.viewportSize()!.width - 33 - width,
      handleBBox!.y + 0.5 * handleBBox!.height
    );
    await this.page.mouse.up();

    return true;
  }

  /**
   * Get the selector for a given tab
   *
   * @param id Tab id
   * @returns Selector
   */
  buildTabSelector(id: galata.SidebarTabId): string {
    return `.lm-TabBar.jp-SideBar .lm-TabBar-content li.lm-TabBar-tab[data-id="${id}"]`;
  }

  protected async _waitForTabActivate(
    tab: Locator,
    activate = true
  ): Promise<void> {
    await Utils.waitForCondition(async () => {
      const current = (await Utils.getLocatorClassList(tab)).includes(
        'lm-mod-current'
      );
      return activate ? current : !current;
    });
  }
}
