// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Page } from '@playwright/test';
import { MenuHelper } from './menu';

/**
 * Status Bar helpers
 */
export class StatusBarHelper {
  constructor(readonly page: Page, readonly menu: MenuHelper) {}

  /**
   * Whether the status bar is visible or not
   *
   * @returns Visibility status
   */
  async isVisible(): Promise<boolean> {
    return await this.page.evaluate(() => {
      const statusBar = document.querySelector(
        '#jp-main-statusbar'
      ) as HTMLElement;
      return window.galata.isElementVisible(statusBar);
    });
  }

  /**
   * Show the status bar
   */
  async show(): Promise<void> {
    const visible = await this.isVisible();
    if (visible) {
      return;
    }

    await this.menu.clickMenuItem('View>Show Status Bar');
    await this.page.waitForSelector('#jp-main-statusbar', {
      state: 'visible'
    });
  }

  /**
   * Hide the status bar
   */
  async hide(): Promise<void> {
    const visible = await this.isVisible();
    if (!visible) {
      return;
    }

    await this.menu.clickMenuItem('View>Show Status Bar');
    await this.page.waitForSelector('#jp-main-statusbar', {
      state: 'hidden'
    });
  }
}
