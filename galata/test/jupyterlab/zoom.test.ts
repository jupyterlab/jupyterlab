// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, galata, test } from '@jupyterlab/galata';

const sidebarIds: galata.SidebarTabId[] = [
  'filebrowser',
  'jp-property-inspector',
  'jp-running-sessions',
  'table-of-contents',
  'extensionmanager.main-view'
];

test.use({ viewport: { width: 320, height: 256 } });

test.describe('Low Vision / Zoom Support', () => {
  sidebarIds.forEach(sidebarId => {
    test(`Open Sidebar tab ${sidebarId}`, async ({ page }) => {
      await page.sidebar.openTab(sidebarId);
      expect(await page.sidebar.isTabOpen(sidebarId)).toEqual(true);
    });
  });

  test('Light Themed Launch Screen at low vision', async ({ page }) => {
    expect(await page.screenshot({ fullPage: true })).toMatchSnapshot(
      'light-launch-screen-at-low-vision.png'
    );
  });

  test('Dark Themed Launch Screen at low vision ', async ({ page }) => {
    await page.theme.setDarkTheme();
    expect(await page.screenshot({ fullPage: true })).toMatchSnapshot(
      'dark-launch-screen-at-low-vision.png'
    );
  });

  test('Should show visibility of menubar at low vision', async ({ page }) => {
    expect(
      await page.screenshot({
        fullPage: true,
        clip: { x: 0, y: 0, width: 320, height: 150 }
      })
    ).toMatchSnapshot('visibility-of-menu-bar-at-low-vision.png');
  });
  h;

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

  test('Capture File Browser opened on left at low vision', async ({
    page
  }) => {
    await page.sidebar.openTab('filebrowser');
    expect(await page.screenshot({ fullPage: true })).toMatchSnapshot(
      'opened-filebrowser-on-left-tabbar-at-low-vision.png'
    );
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
});
