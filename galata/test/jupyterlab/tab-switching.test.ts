/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { expect, test } from '@jupyterlab/galata';

test.describe('Tab Switching Shortcuts', () => {
  // Three dummy files before each test
  test.beforeEach(async ({ page }) => {
    await page.menu.clickMenuItem('File>Close All Tabs');

    for (let i = 0; i < 3; i++) {
      await page.menu.clickMenuItem('File>New>Text File');

      await page.waitForFunction(count => {
        const tabs = document.querySelectorAll(
          '#jp-main-dock-panel .lm-TabBar-tab'
        );
        return tabs.length === count;
      }, i + 1);
    }

    // Close Launcher tab if present (it's closable when other widgets are open)
    const launcherTab = page
      .locator('#jp-main-dock-panel .lm-TabBar-tab')
      .filter({ hasText: 'Launcher' });
    if ((await launcherTab.count()) > 0) {
      const closeIcon = launcherTab.locator('.lm-TabBar-tabCloseIcon');
      if ((await closeIcon.count()) > 0) {
        await closeIcon.click();
        await page.waitForFunction(() => {
          const tabs = document.querySelectorAll(
            '#jp-main-dock-panel .lm-TabBar-tab'
          );
          return (
            Array.from(tabs).every(
              tab =>
                tab.querySelector('.lm-TabBar-tabLabel')?.textContent !==
                'Launcher'
            ) && tabs.length >= 3
          );
        });
      }
    }
  });

  test('should switch to Tab 1 and Tab 2 using Accel+Alt+Number', async ({
    page
  }) => {
    const modifier = process.platform === 'darwin' ? 'Meta+Alt' : 'Control+Alt';

    // Switch to Tab 2 first to make sure switching to 1 actually does something
    await page.keyboard.press(`${modifier}+2`);
    await page.keyboard.press(`${modifier}+1`);

    const firstTab = page.locator('#jp-main-dock-panel .lm-TabBar-tab').first();
    await expect(firstTab).toHaveClass(/lm-mod-current/);

    await page.keyboard.press(`${modifier}+2`);
    const secondTab = page.locator('#jp-main-dock-panel .lm-TabBar-tab').nth(1);
    await expect(secondTab).toHaveClass(/lm-mod-current/);
  });

  test('should switch to the Last Tab using Accel+Alt+0', async ({ page }) => {
    const modifier = process.platform === 'darwin' ? 'Meta+Alt' : 'Control+Alt';

    // Move to first tab first
    await page.keyboard.press(`${modifier}+1`);

    // Trigger the "Last Tab" shortcut (0)
    await page.keyboard.press(`${modifier}+0`);

    // Verify the last tab in the list is now the current one
    const lastTab = page.locator('#jp-main-dock-panel .lm-TabBar-tab').last();
    await expect(lastTab).toHaveClass(/lm-mod-current/);
  });

  test('should do nothing when an out-of-range index is pressed', async ({
    page
  }) => {
    const modifier = process.platform === 'darwin' ? 'Meta+Alt' : 'Control+Alt';

    // Start on second tab
    await page.keyboard.press(`${modifier}+2`);
    await page.waitForFunction(() => {
      const tabs = document.querySelectorAll(
        '#jp-main-dock-panel .lm-TabBar-tab'
      );
      return tabs.length >= 2 && tabs[1].classList.contains('lm-mod-current');
    });

    // Press index 9 (which doesn't exist in our 3-tab setup)
    await page.keyboard.press(`${modifier}+9`);

    // Verify we are STILL on the second tab
    const secondTab = page.locator('#jp-main-dock-panel .lm-TabBar-tab').nth(1);
    await expect(secondTab).toHaveClass(/lm-mod-current/);
  });
});
