// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, test } from '@jupyterlab/galata';

// const sidebarIds: galata.SidebarTabId[] = [
//   'filebrowser',
//   'jp-property-inspector',
//   'jp-running-sessions',
//   'table-of-contents',
//   'extensionmanager.main-view'
// ];

test.use({ viewport: { width: 320, height: 256 } });

test.describe('Low Vision / Zoom Support', () => {
  test('Launch Screen at 400% zoom', async ({ page }) => {
    expect(await page.screenshot({ fullPage: true })).toMatchSnapshot(
      'launch-screen-at-400-zoom.png'
    );
  });

  test('Should show visibility of menubar at low vision', async ({ page }) => {
    expect(
      await page.screenshot({
        fullPage: true,
        clip: { x: 0, y: 0, width: 320, height: 128 }
      })
    ).toMatchSnapshot('visibility-of-menu-bar-at-400-zoom.png');
  });
});
