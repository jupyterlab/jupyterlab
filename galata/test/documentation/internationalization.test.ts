// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { galata, test } from '@jupyterlab/galata';
import { expect } from '@playwright/test';

test.use({ autoGoto: false, viewport: { height: 720, width: 1280 } });

test.describe('Internationalization', () => {
  test('Menu', async ({ page }) => {
    await page.goto();

    await page.click('text=Settings');
    await page.click('ul[role="menu"] >> text=Language');

    // Inject capture zone
    await page.evaluate(() => {
      document.body.insertAdjacentHTML(
        'beforeend',
        '<div id="capture-screenshot" style="position: absolute; top: 5px; left: 250px; width: 800px; height: 600px;"></div>'
      );
    });

    expect(
      await (await page.$('#capture-screenshot')).screenshot()
    ).toMatchSnapshot('language_settings.png');
  });

  test('Confirm language', async ({ page }) => {
    await page.goto();

    await page.click('text=Settings');
    await page.click('ul[role="menu"] >> text=Language');
    await page.click('#jp-mainmenu-settings-language >> text=Chinese');

    // Inject capture zone
    await page.evaluate(() => {
      document.body.insertAdjacentHTML(
        'beforeend',
        '<div id="capture-screenshot" style="position: absolute; top: 200px; left: 350px; width: 600px; height: 300px;"></div>'
      );
    });

    expect(
      await (await page.$('#capture-screenshot')).screenshot()
    ).toMatchSnapshot('language_change.png');
  });

  test('UI in Chinese', async ({ page }) => {
    await galata.Mock.freezeContentLastModified(page);
    await page.goto();

    await page.click('text=Settings');
    await page.click('ul[role="menu"] >> text=Language');
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

    expect(await page.screenshot()).toMatchSnapshot('language_chinese.png');
  });
});
