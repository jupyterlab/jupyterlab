// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Page } from '@playwright/test';
import * as Utils from '../utils';

/**
 * Kernels and sessions helpers
 *
 * These helpers are using JupyterLab serviceManager in Javascript. There
 * are therefore not available if the page is not loaded.
 */
export class KernelHelper {
  constructor(readonly page: Page) {}

  /**
   * Whether a sessions is running or not.
   *
   * @returns Running status
   */
  async isAnyRunning(): Promise<boolean> {
    return await this.page.evaluate(() => {
      const app = window.jupyterlab ?? window.jupyterapp;
      return !app.serviceManager.sessions.running().next().done;
    });
  }

  /**
   * Shutdown all sessions.
   */
  async shutdownAll(): Promise<void> {
    await this.page.evaluate(async () => {
      const app = window.jupyterlab ?? window.jupyterapp;
      await app.serviceManager.sessions.shutdownAll();
    });

    await Utils.waitForCondition(async () => {
      return (await this.isAnyRunning()) === false;
    });
  }
}
