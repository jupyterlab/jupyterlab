// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, galata, test } from '@jupyterlab/galata';
import { setSidebarWidth } from './utils';

test.use({
  autoGoto: false,
  mockState: galata.DEFAULT_DOCUMENTATION_STATE,
  viewport: { height: 720, width: 1280 }
});

test.describe('Internationalization', () => {
  test('Menu', async ({ page }) => {
    await page.goto();

    await setSidebarWidth(page);

    await page.click('text=Settings');
    await page.click('.lm-Menu ul[role="menu"] >> text=Language');

    expect(
      await page.screenshot({ clip: { y: 5, x: 250, width: 800, height: 600 } })
    ).toMatchSnapshot('language_settings.png');
  });

  test('Confirm language', async ({ page }) => {
    await page.goto();

    await setSidebarWidth(page);

    await page.click('text=Settings');
    await page.click('.lm-Menu ul[role="menu"] >> text=Language');
    await page.click('#jp-mainmenu-settings-language >> text=Chinese');

    expect(
      await page.screenshot({
        clip: { y: 200, x: 350, width: 600, height: 300 }
      })
    ).toMatchSnapshot('language_change.png');
  });

  test('UI in Chinese', async ({ page }) => {
    await galata.Mock.freezeContentLastModified(page);
    await page.goto();

    await page.click('text=Settings');
    await page.click('.lm-Menu ul[role="menu"] >> text=Language');
    await page.click('#jp-mainmenu-settings-language >> text=Chinese');

    await Promise.all([
      page.waitForNavigation(),
      page.waitForSelector('#jupyterlab-splash'),
      page.click('button:has-text("Change and reload")')
    ]);

    await page.waitForSelector('#jupyterlab-splash', {
      state: 'detached'
    });

    await page.addStyleTag({
      content: `.jp-LabShell.jp-mod-devMode {
        border-top: none;
      }`
    });

    // Wait for the launcher to be loaded
    await page.waitForSelector('text=README.md');

    await setSidebarWidth(page);

    expect(await page.screenshot()).toMatchSnapshot('language_chinese.png');
  });
});
