// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Page } from '@playwright/test';

/**
 * LogConsole helpers
 */
export class LogConsoleHelper {
  constructor(readonly page: Page) {}

  /**
   * Get the number of log messages in the log console panel.
   *
   * @returns Number of log messages
   */
  async logCount(): Promise<number> {
    return await this.page.evaluate(() => {
      let count = 0;
      const logPanels = document.querySelectorAll(
        '.jp-LogConsolePanel .lm-StackedPanel-child'
      );
      logPanels.forEach(logPanel => {
        if (!logPanel.classList.contains('lm-mod-hidden')) {
          count += logPanel.querySelectorAll('.jp-OutputArea-child').length;
        }
      });

      return count;
    });
  }
}
