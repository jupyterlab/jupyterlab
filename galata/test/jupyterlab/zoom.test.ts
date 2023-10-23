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

  test('Launch Screen at 400% zoom', async ({ page }) => {
    expect(await page.screenshot({ fullPage: true })).toMatchSnapshot(
      'launch-screen-at-low-vision.png'
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

  test('Should show visibility of left light tabBar at low vision', async ({
    page
  }) => {
    await page.theme.setLightTheme();
    const tabbar = await page.sidebar.getTabBar();
    expect(await tabbar.screenshot()).toMatchSnapshot(
      'left-light-tabbar-of-status-bar-at-low-vision.png'
    );
  });
});
