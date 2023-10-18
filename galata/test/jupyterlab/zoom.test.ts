// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, test } from '@jupyterlab/galata';

test.use({ viewport: { width: 1280, height: 1024 } });

test.describe('Low Vision / Zoom Support', () => {
  // test('Launch Screen at 400% zoom', async ({ page }) => {
  //   await page.evaluate('document.body.style.zoom = 4.0');
  //   expect(await page.screenshot()).toMatchSnapshot(
  //     'launch-screen-at-400-zoom.png'
  //   );
  // });

  test('Should show visibility of menu bar at 400% zoom', async ({ page }) => {
    await page.evaluate('document.body.style.zoom = 4.0');
    expect(
      await page.screenshot({ clip: { x: 0, y: 0, width: 320, height: 150 } })
    ).toMatchSnapshot('visibility-of-menu-bar-at-400-zoom.png');
  });
});
