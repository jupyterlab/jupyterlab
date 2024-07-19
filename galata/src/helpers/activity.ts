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
      const tab = this.getTabLocator(name);
      if (!(await tab.count())) {
        return false;
      }
      const classes = await Utils.getLocatorClassList(tab);
      return classes.includes('jp-mod-current');
    }
  }

  /**
   * Continually press navigation key until specified element is focused
   *
   * @param selector name of attribute selector
   * @param key navigation key to press
   */
  async keyToElement(
    selector: string,
    key: 'Tab' | 'ArrowDown' | 'ArrowUp'
  ): Promise<void> {
    while (
      !(await this.page.evaluate(
        selector => document.activeElement?.matches(selector),
        selector
      ))
    ) {
      await this.page.keyboard.press(key);
    }
  }

  /**
   * Get a handle on a tab
   *
   * @param name Activity name
   * @returns Handle on the tab or null if the tab is not found
   *
   * @deprecated You should use locator instead {@link getTabLocator}
   */
  async getTab(name?: string): Promise<ElementHandle<Element> | null> {
    const locator = this.getTabLocator(name);
    const start = Date.now();
    while ((await locator.count()) == 0 && Date.now() - start < 500) {
      await this.page.waitForTimeout(50);
    }
    if ((await locator.count()) > 0) {
      return locator.elementHandle();
    }
    return null;
  }

  /**
   * Get a tab locator
   * @param name Activity name
   * @returns Tab locator
   */
  getTabLocator(name?: string | RegExp): Locator {
    return name
      ? this.page.getByRole('main').getByRole('tab', { name })
      : this.page.getByRole('main').locator('.jp-mod-current[role="tab"]');
  }

  /**
   * Get a handle on a panel
   *
   * @param name Activity name
   * @returns Handle on the tab or null if the tab is not found
   *
   * @deprecated You should use locator instead {@link getPanelLocator}
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

    const start = Date.now();
    while ((await locator.count()) == 0 && Date.now() - start < 500) {
      await this.page.waitForTimeout(50);
    }
    if ((await locator.count()) > 0) {
      return locator.elementHandle();
    }
    return null;
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
  async closePanel(name: string | RegExp): Promise<void> {
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
  async activateTab(name: string | RegExp): Promise<boolean> {
    const tab = this.getTabLocator(name);
    if ((await tab.count()) === 1) {
      await tab.click();
      await Utils.waitForCondition(
        async () => (await tab.getAttribute('aria-selected')) === 'true'
      );
      return true;
    }

    return false;
  }
}
