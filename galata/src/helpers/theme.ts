// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Page } from '@playwright/test';

/**
 * Theme helpers
 */
export class ThemeHelper {
  constructor(readonly page: Page) {}

  /**
   * Set JupyterLab theme to Dark
   */
  async setDarkTheme(): Promise<void> {
    await this.setTheme('JupyterLab Dark');
  }

  /**
   * Set JupyterLab theme to Light
   */
  async setLightTheme(): Promise<void> {
    await this.setTheme('JupyterLab Light');
  }

  /**
   * Get JupyterLab theme name
   *
   * @returns Theme name
   */
  async getTheme(): Promise<string> {
    return await this.page.evaluate(() => {
      return document.body.dataset.jpThemeName as string;
    });
  }

  /**
   * Set JupyterLab theme
   *
   * @param themeName Theme name
   */
  async setTheme(themeName: string): Promise<void> {
    const page = this.page;
    await page.evaluate(async (themeName: string) => {
      await window.galata.setTheme(themeName);
    }, themeName);

    await page.waitForSelector('#jupyterlab-splash', { state: 'detached' });
  }
}
