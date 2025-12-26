/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { expect, test } from '@jupyterlab/galata';

test.describe('Tab Switching Shortcuts', () => {
  // Three dummy files before each test
  test.beforeEach(async ({ page }) => {
    // Open three separate text files to create three tabs
    for (let i = 1; i <= 3; i++) {
      await page.menu.clickMenuItem('File>New>Text File');
      // Wait for the new tab to appear and be named
      await page.waitForSelector(
        `.lm-TabBar-tab[title*="untitled${i === 1 ? '' : i}.txt"]`
      );
    }
  });

  test('should switch to Tab 1 and Tab 2 using Accel+Alt+Number', async ({
    page
  }) => {
    // Determine the modifier based on the OS (Mac uses Meta/Cmd, others use Control)
    const modifier = process.platform === 'darwin' ? 'Meta+Alt' : 'Control+Alt';

    // 1. Switch to the first tab (untitled.txt)
    await page.keyboard.press(`${modifier}+1`);
    const firstTab = page.locator('.lm-DockPanel-tabBar .lm-TabBar-tab').nth(0);
    await expect(firstTab).toHaveClass(/lm-mod-current/);

    // 2. Switch to the second tab (untitled2.txt)
    await page.keyboard.press(`${modifier}+2`);
    const secondTab = page
      .locator('.lm-DockPanel-tabBar .lm-TabBar-tab')
      .nth(1);
    await expect(secondTab).toHaveClass(/lm-mod-current/);
  });

  test('should switch to the Last Tab using Accel+Alt+0', async ({ page }) => {
    const modifier = process.platform === 'darwin' ? 'Meta+Alt' : 'Control+Alt';

    await page.keyboard.press(`${modifier}+1`);

    // trigger the "Last Tab" shortcut (0)
    await page.keyboard.press(`${modifier}+0`);

    // The last tab is at index 2 as per our setup
    const lastTab = page.locator('.lm-DockPanel-tabBar .lm-TabBar-tab').nth(2);
    await expect(lastTab).toHaveClass(/lm-mod-current/);
  });

  test('should do nothing when an out-of-range index is pressed', async ({
    page
  }) => {
    const modifier = process.platform === 'darwin' ? 'Meta+Alt' : 'Control+Alt';

    // Start on tab 2
    await page.keyboard.press(`${modifier}+2`);

    // Press index 9 (which doesn't exist in our 3-tab setup)
    await page.keyboard.press(`${modifier}+9`);

    // Verify we are STILL on tab 2
    const secondTab = page
      .locator('.lm-DockPanel-tabBar .lm-TabBar-tab')
      .nth(1);
    await expect(secondTab).toHaveClass(/lm-mod-current/);
  });
});
