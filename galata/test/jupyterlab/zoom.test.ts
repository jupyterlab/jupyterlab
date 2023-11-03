// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, test } from '@jupyterlab/galata';

test.use({ viewport: { width: 320, height: 256 } });

test.describe('Low Vision / Zoom Support', () => {
  test('Light Themed Launch Screen at low vision', async ({ page }) => {
    await page.sidebar.close('left');
    expect(await page.screenshot({ fullPage: true })).toMatchSnapshot(
      'light-launch-screen-at-low-vision.png'
    );
  });

  test('Dark Themed Launch Screen at low vision ', async ({ page }) => {
    await page.sidebar.close('left');
    await page.theme.setDarkTheme();
    expect(await page.screenshot({ fullPage: true })).toMatchSnapshot(
      'dark-launch-screen-at-low-vision.png'
    );
  });

  test('Should show visibility of light themed menubar at low vision', async ({
    page
  }) => {
    await page.theme.setLightTheme();
    expect(await page.locator('#jp-top-panel').screenshot()).toMatchSnapshot(
      'visibility-of-light-menu-bar-at-low-vision.png'
    );
  });

  test('Should show visibility of dark themed menubar at low vision', async ({
    page
  }) => {
    await page.theme.setDarkTheme();
    expect(await page.locator('#jp-top-panel').screenshot()).toMatchSnapshot(
      'visibility-of-dark-menu-bar-at-low-vision.png'
    );
  });

  test('Light themed left tabBar at low vision', async ({ page }) => {
    await page.theme.setLightTheme();
    const tabbar = await page.sidebar.getTabBar();
    expect(await tabbar.screenshot()).toMatchSnapshot(
      'left-light-tabbar-of-status-bar-at-low-vision.png'
    );
  });

  test('Dark Themed left tabBar at low vision', async ({ page }) => {
    await page.theme.setDarkTheme();
    const tabbar = await page.sidebar.getTabBar();
    expect(await tabbar.screenshot()).toMatchSnapshot(
      'left-dark-tabbar-of-status-bar-at-low-vision.png'
    );
  });

  test('Open File Browser on left at low vision', async ({ page }) => {
    await page.sidebar.openTab('filebrowser');
    expect(await page.sidebar.isTabOpen('filebrowser')).toEqual(true);
  });

  test('Light Themed right tabBar at low vision', async ({ page }) => {
    await page.theme.setLightTheme();
    const tabbar = await page.sidebar.getTabBar('right');
    expect(await tabbar.screenshot()).toMatchSnapshot(
      'right-light-tabbar-at-low-vision.png'
    );
  });

  test('Dark Themed right tabBar at low vision', async ({ page }) => {
    await page.theme.setDarkTheme();
    const tabbar = await page.sidebar.getTabBar('right');
    expect(await tabbar.screenshot()).toMatchSnapshot(
      'right-dark-tabbar-at-low-vision.png'
    );
  });

  test('Light Themed statusBar at low vision', async ({ page }) => {
    await page.theme.setLightTheme();
    expect(
      await page.locator('#jp-main-statusbar').screenshot()
    ).toMatchSnapshot('light-statusbar-at-low-vision.png');
  });
  // comment to file
  test('Dark Themed statusBar at low vision', async ({ page }) => {
    await page.theme.setDarkTheme();
    expect(
      await page.locator('#jp-main-statusbar').screenshot()
    ).toMatchSnapshot('dark-statusbar-at-low-vision.png');
  });
});
