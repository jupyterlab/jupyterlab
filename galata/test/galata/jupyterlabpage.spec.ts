// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, test } from '@jupyterlab/galata';
import { test as playwrightTest } from '@playwright/test';

test.describe('appPath', () => {
  const APP_PATH = '/retro';
  test.use({ appPath: APP_PATH, autoGoto: false });

  test('should have non-default appPath', async ({ page }) => {
    expect(page.appPath).toEqual(APP_PATH);
  });
});

test('should goto the application page and load hook', async ({ page }) => {
  expect(
    await page.evaluate(() => typeof window.galataip === 'object')
  ).toEqual(true);
});

test('should test if the application is in simple mode', async ({ page }) => {
  expect(await page.isInSimpleMode()).toEqual(false);
});

test('should reload the application page and load hook', async ({ page }) => {
  await page.reload();

  expect(
    await page.evaluate(() => typeof window.galataip === 'object')
  ).toEqual(true);
});

test('should reset the UI', async ({ page }) => {
  await page.resetUI();
  expect(await page.menu.isAnyOpen()).toEqual(false);
  expect(await page.waitForSelector(page.launcherSelector)).toBeTruthy();
  expect(await page.kernel.isAnyRunning()).toEqual(false);
  expect(await page.statusbar.isVisible()).toEqual(true);
  expect(await page.sidebar.isTabOpen('filebrowser')).toEqual(true);
});

test('should toggle simple mode', async ({ page }) => {
  expect(await page.setSimpleMode(true)).toEqual(true);
  expect(await page.isInSimpleMode()).toEqual(true);
});

// test that stock playwright test is accessible with page not being JupyterLabPage
playwrightTest('should not be loading galata helper', async ({ page }) => {
  expect(page['notebook']).toBeUndefined(); // no helper
  expect(page.url()).toEqual('about:blank');
});

test.describe('listeners', () => {
  const DEFAULT_NAME = 'untitled.txt';

  test('should listen to JupyterLab dialog', async ({ page }) => {
    await page.evaluate(() => {
      window.galataip.on('dialog', d => {
        d.reject();
      });
    });

    await page.menu.clickMenuItem('File>New>Text File');
    await page.waitForSelector(`[role="main"] >> text=${DEFAULT_NAME}`);
    await page.menu.clickMenuItem('File>Save Text As…');

    await expect(page.locator('.jp-Dialog')).toHaveCount(0);
  });

  test('should stop listening to JupyterLab dialog', async ({ page }) => {
    await page.evaluate(() => {
      const callback = d => {
        // We need to slightly wait before rejecting otherwise
        // the `locator('.jp-Dialog').waitFor()` is not resolved.
        setTimeout(() => d.reject(), 100);
        window.galataip.off('dialog', callback);
      };
      window.galataip.on('dialog', callback);
    });

    await page.menu.clickMenuItem('File>New>Text File');
    await page.waitForSelector(`[role="main"] >> text=${DEFAULT_NAME}`);

    await Promise.all([
      page.locator('.jp-Dialog').waitFor(),
      page.menu.clickMenuItem('File>Save Text As…')
    ]);

    await expect(page.locator('.jp-Dialog')).toHaveCount(0);

    await Promise.all([
      page.locator('.jp-Dialog').waitFor(),
      page.menu.clickMenuItem('File>Save Text As…')
    ]);

    await expect(page.locator('.jp-Dialog')).toHaveCount(1);
  });

  test('should listen only once to JupyterLab dialog', async ({ page }) => {
    await page.evaluate(() => {
      const callback = d => {
        // We need to slightly wait before rejecting otherwise
        // the `locator('.jp-Dialog').waitFor()` is not resolved.
        setTimeout(() => d.reject(), 100);
      };
      window.galataip.once('dialog', callback);
    });

    await page.menu.clickMenuItem('File>New>Text File');
    await page.waitForSelector(`[role="main"] >> text=${DEFAULT_NAME}`);

    await Promise.all([
      page.locator('.jp-Dialog').waitFor(),
      page.menu.clickMenuItem('File>Save Text As…')
    ]);

    await expect(page.locator('.jp-Dialog')).toHaveCount(0);

    await Promise.all([
      page.locator('.jp-Dialog').waitFor(),
      page.menu.clickMenuItem('File>Save Text As…')
    ]);

    await expect(page.locator('.jp-Dialog')).toHaveCount(1);
  });

  // test('should listen to JupyterLab notification', async ({ page }) => {});

  // test('should stop listening to JupyterLab notification', async ({
  //   page
  // }) => {});

  // test('should listen only once to JupyterLab notification', async ({
  //   page
  // }) => {});
});
