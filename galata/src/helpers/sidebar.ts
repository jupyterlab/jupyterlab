// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { ISettingRegistry } from '@jupyterlab/settingregistry';
import { ElementHandle, Page } from '@playwright/test';
import type { IPluginNameToInterfaceMap } from '../extension';
import { galata } from '../galata';
import * as Utils from '../utils';
import { MenuHelper } from './menu';

/**
 * Sidebar helpers
 */
export class SidebarHelper {
  constructor(readonly page: Page, readonly menu: MenuHelper) {}

  /**
   * Whether a sidebar is opened or not
   *
   * @param side Sidebar side
   * @returns Opened status
   */
  isOpen = async (side: galata.SidebarPosition = 'left'): Promise<boolean> => {
    return (await this.getContentPanel(side)) !== null;
  };

  /**
   * Whether a given tab is opened or not
   *
   * @param id Tab id
   * @returns Tab opened status
   */
  async isTabOpen(id: galata.SidebarTabId): Promise<boolean> {
    const tabButton = await this.page.$(
      `${this.buildTabSelector(id)}.lm-mod-current`
    );
    return tabButton !== null;
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
    const tab = await this.getTab(id);

    if (!tab) {
      return;
    }

    await tab.click({ button: 'right' });

    const switchMenuItem = await this.page.waitForSelector(
      '.lm-Menu-content .lm-Menu-item[data-command="sidebar:switch"]',
      { state: 'visible' }
    );
    if (switchMenuItem) {
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
   */
  async getTab(
    id: galata.SidebarTabId
  ): Promise<ElementHandle<Element> | null> {
    return await this.page.$(this.buildTabSelector(id));
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

    const tabButton = await this.page.$(this.buildTabSelector(id));
    if (tabButton === null) {
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
   */
  async getContentPanel(
    side: galata.SidebarPosition = 'left'
  ): Promise<ElementHandle<Element> | null> {
    return await this.page.$(
      `#jp-${side}-stack .lm-StackedPanel-child:not(.lm-mod-hidden)`
    );
  }

  /**
   * Get the tab bar of the sidebar
   *
   * @param side Position
   * @returns Tab bar handle
   */
  async getTabBar(
    side: galata.SidebarPosition = 'left'
  ): Promise<ElementHandle<Element> | null> {
    return await this.page.$(`.jp-SideBar.jp-mod-${side}`);
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
   * Get the selector for a given tab
   *
   * @param id Tab id
   * @returns Selector
   */
  buildTabSelector(id: galata.SidebarTabId): string {
    return `.lm-TabBar.jp-SideBar .lm-TabBar-content li.lm-TabBar-tab[data-id="${id}"]`;
  }

  protected async _waitForTabActivate(
    tab: ElementHandle<Element>,
    activate = true
  ): Promise<void> {
    await this.page.waitForFunction(
      ({ tab, activate }) => {
        const current = tab.classList.contains('lm-mod-current');
        return activate ? current : !current;
      },
      { tab, activate }
    );
  }
}
