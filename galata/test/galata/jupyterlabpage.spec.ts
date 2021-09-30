// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { test } from '@jupyterlab/galata';
import { expect, test as playwrightTest } from '@playwright/test';

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
  // eslint-disable-next-line jest/no-standalone-expect
  expect(page['notebook']).toBeUndefined(); // no helper
  // eslint-disable-next-line jest/no-standalone-expect
  expect(page.url()).toEqual('about:blank');
});
