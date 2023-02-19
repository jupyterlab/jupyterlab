// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ElementHandle, Page } from '@playwright/test';
import * as Utils from '../utils';

/**
 * Activity helper
 */
export class ActivityHelper {
  constructor(readonly page: Page) {}

  /**
   * JupyterLab launcher selector
   */
  get launcherSelector(): string {
    return Utils.xpBuildActivityTabSelector('Launcher');
  }

  /**
   * Close all widgets in the main area
   */
  async closeAll(): Promise<void> {
    await this.page.evaluate(async (launcherSelector: string) => {
      await window.jupyterapp.commands.execute('application:close-all');
      await window.galata.waitForXPath(launcherSelector);
    }, this.launcherSelector);
  }

  /**
   * Whether a tab is active or not
   *
   * @param name Activity name
   * @returns Active status
   */
  async isTabActive(name: string): Promise<boolean> {
    const tab = await this.getTab(name);
    return (
      (tab &&
        (await tab.evaluate((tab: Element) =>
          tab.classList.contains('lm-mod-current')
        ))) ??
      false
    );
  }

  /**
   * Get a handle on a tab
   *
   * @param name Activity name
   * @returns Handle on the tab or null if the tab is not found
   */
  getTab(name?: string): Promise<ElementHandle<Element> | null> {
    const page = this.page;
    const tabSelector = name
      ? Utils.xpBuildActivityTabSelector(name)
      : Utils.xpBuildActiveActivityTabSelector();
    return page.$(`xpath=${tabSelector}`);
  }

  /**
   * Get a handle on a panel
   *
   * @param name Activity name
   * @returns Handle on the tab or null if the tab is not found
   */
  async getPanel(name?: string): Promise<ElementHandle<Element> | null> {
    const page = this.page;
    const tab = await this.getTab(name);
    if (tab) {
      const id = await tab.evaluate((tab: Element) =>
        tab.getAttribute('data-id')
      );
      return await page.$(`xpath=${Utils.xpBuildActivityPanelSelector(id!)}`);
    }

    return null;
  }

  /**
   * Close a panel from its tab name
   *
   * @param name Activity name
   */
  async closePanel(name: string): Promise<void> {
    await this.activateTab(name);
    await this.page.evaluate(async (launcherSelector: string) => {
      await window.jupyterapp.commands.execute('application:close');
      await window.galata.waitForXPath(launcherSelector);
    }, this.launcherSelector);
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
          return tab.classList.contains('jp-mod-current');
        },
        { tab }
      );

      return true;
    }

    return false;
  }
}
