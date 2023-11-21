// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, test } from '@jupyterlab/galata';

test.use({ viewport: { width: 320, height: 256 } });

test.describe('Low Vision / Zoom Support', () => {
  test.beforeEach(async ({ page }) => {
    await page.sidebar.close('left');
  });

  test('Full page, small viewport', async ({ page }) => {
    expect(await page.screenshot({ fullPage: true })).toMatchSnapshot(
      'launch-screen-at-low-vision.png'
    );
  });

  test('Menubar, small viewport', async ({ page }) => {
    await page.theme.setLightTheme();
    expect(await page.locator('#jp-top-panel').screenshot()).toMatchSnapshot(
      'visibility-of-menu-bar-at-low-vision.png'
    );
  });

  test('Left tab bar, small viewport', async ({ page }) => {
    await page.theme.setLightTheme();
    const tabbar = await page.sidebar.getTabBar();
    expect(await tabbar.screenshot()).toMatchSnapshot(
      'left-tabbar-at-low-vision.png'
    );
  });

  test('Right tab bar, small viewport', async ({ page }) => {
    await page.theme.setLightTheme();
    const tabbar = await page.sidebar.getTabBar('right');
    expect(await tabbar.screenshot()).toMatchSnapshot(
      'right-tabbar-at-low-vision.png'
    );
  });

  test('Status bar, small viewport', async ({ page }) => {
    await page.theme.setLightTheme();
    expect(
      await page.locator('#jp-main-statusbar').screenshot()
    ).toMatchSnapshot('status-bar-small-viewport.png');
  });
});
