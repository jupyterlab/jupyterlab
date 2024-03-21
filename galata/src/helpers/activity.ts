// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ElementHandle, Locator, Page } from '@playwright/test';
import * as Utils from '../utils';

/**
 * Activity helper
 */
export class ActivityHelper {
  constructor(readonly page: Page) {}

  /**
   * JupyterLab launcher selector
   *
   * @deprecated You should use locator selector {@link launcher}
   */
  get launcherSelector(): string {
    return Utils.xpBuildActivityTabSelector('Launcher');
  }

  /**
   * JupyterLab launcher tab
   */
  get launcher(): Locator {
    return this.page.getByRole('main').getByRole('tab', { name: 'Launcher' });
  }

  /**
   * Close all widgets in the main area
   */
  async closeAll(): Promise<void> {
    await this.page.evaluate(async () => {
      await window.jupyterapp.commands.execute('application:close-all');
    });
    await this.launcher.waitFor();
  }

  /**
   * Whether a tab is active or not
   *
   * @param name Activity name
   * @returns Active status
   */
  async isTabActive(name: string): Promise<boolean> {
    if (await Utils.isInSimpleMode(this.page)) {
      const activeTab = await this.page
        .locator('#jp-title-panel-title')
        .getByRole('textbox')
        .inputValue();
      return activeTab === name;
    } else {
      const tab = await this.getTab(name);
      if (!tab) {
        return false;
      }
      const classes = ((await tab.getAttribute('class')) ?? '').split(' ');
      return classes.includes('jp-mod-current');
    }
  }

  /**
   * Get a handle on a tab
   *
   * @param name Activity name
   * @returns Handle on the tab or null if the tab is not found
   */
  async getTab(name?: string): Promise<ElementHandle<Element> | null> {
    let handle: ElementHandle<Element> | null = null;
    try {
      handle = await this.getTabLocator(name).elementHandle({ timeout: 500 });
    } catch {
      handle = null;
    }
    return handle;
  }

  /**
   * Get a tab locator
   * @param name Activity name
   * @returns Tab locator
   */
  getTabLocator(name?: string): Locator {
    return name
      ? this.page.getByRole('main').getByRole('tab', { name })
      : this.page.getByRole('main').locator('.jp-mod-current[role="tab"]');
  }

  /**
   * Get a handle on a panel
   *
   * @param name Activity name
   * @returns Handle on the tab or null if the tab is not found
   */
  async getPanel(name?: string): Promise<ElementHandle<Element> | null> {
    const page = this.page;
    let locator: Locator;
    if (name) {
      locator = page.getByRole('main').getByRole('tabpanel', { name });
    } else {
      const activeTab = await this.getTab();
      const id = await activeTab?.evaluate((tab: Element) =>
        tab.getAttribute('data-id')
      );
      if (!id) {
        return null;
      }
      locator = page.getByRole('main').locator(`[role="tabpanel"][id="${id}"]`);
    }

    let handle: ElementHandle<Element> | null = null;
    try {
      handle = await locator.elementHandle({ timeout: 500 });
    } catch {
      handle = null;
    }

    return handle;
  }

  /**
   * Get a panel locator
   *
   * @param name Activity name
   * @returns Panel locator or null
   */
  async getPanelLocator(name?: string): Promise<Locator | null> {
    let locator: Locator;
    if (name) {
      locator = this.page.getByRole('main').getByRole('tabpanel', { name });
    } else {
      const id = await this.getTabLocator().getAttribute('data-id');
      if (!id) {
        return null;
      }
      locator = this.page
        .getByRole('main')
        .locator(`[role="tabpanel"][id="${id}"]`);
    }

    return locator;
  }

  /**
   * Close a panel from its tab name
   *
   * @param name Activity name
   */
  async closePanel(name: string): Promise<void> {
    await this.activateTab(name);
    await this.page.evaluate(async () => {
      await window.jupyterapp.commands.execute('application:close');
    });
    await this.launcher.waitFor();
  }

  /**
   * Activate a tab is active
   *
   * @param name Activity name
   * @returns Whether the action is successful
   */
  async activateTab(name: string): Promise<boolean> {
    const tab = await this.getTab(name);
    if (tab) {
      await tab.click();
      await this.page.waitForFunction(
        ({ tab }) => {
          return tab.ariaSelected === 'true';
        },
        { tab }
      );

      return true;
    }

    return false;
  }
}
