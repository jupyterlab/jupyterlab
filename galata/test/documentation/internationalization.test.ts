// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { galata, test } from '@jupyterlab/galata';
import { expect } from '@playwright/test';
import { generateCaptureArea, setLeftSidebarWidth } from './utils';

test.use({
  autoGoto: false,
  mockState: galata.DEFAULT_DOCUMENTATION_STATE,
  viewport: { height: 720, width: 1280 }
});

test.describe('Internationalization', () => {
  test('Menu', async ({ page }) => {
    await page.goto();

    await setLeftSidebarWidth(page);

    await page.click('text=Settings');
    await page.click('ul[role="menu"] >> text=Language');

    // Inject capture zone
    await page.evaluate(
      ([zone]) => {
        document.body.insertAdjacentHTML('beforeend', zone);
      },
      [generateCaptureArea({ top: 5, left: 250, width: 800, height: 600 })]
    );

    expect(
      await (await page.$('#capture-screenshot')).screenshot()
    ).toMatchSnapshot('language_settings.png');
  });

  test('Confirm language', async ({ page }) => {
    await page.goto();

    await setLeftSidebarWidth(page);

    await page.click('text=Settings');
    await page.click('ul[role="menu"] >> text=Language');
    await page.click('#jp-mainmenu-settings-language >> text=Chinese');

    // Inject capture zone
    await page.evaluate(
      ([zone]) => {
        document.body.insertAdjacentHTML('beforeend', zone);
      },
      [generateCaptureArea({ top: 200, left: 350, width: 600, height: 300 })]
    );

    expect(
      await (await page.$('#capture-screenshot')).screenshot()
    ).toMatchSnapshot('language_change.png');
  });

  test('UI in Chinese', async ({ page }) => {
    await galata.Mock.freezeContentLastModified(page);
    await page.goto();

    await setLeftSidebarWidth(page);

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
