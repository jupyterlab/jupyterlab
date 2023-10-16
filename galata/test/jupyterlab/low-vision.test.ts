// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, test } from '@jupyterlab/galata';

test.describe('Low Vision / Zoom Support', () => {
  test('Should show visibility of menu bar at 400% zoom', async ({ page }) => {
    await page.evaluate('document.body.style.zoom = 4.0');
    expect(
      await page.screenshot({ clip: { x: 0, y: 0, width: 1280, height: 100 } })
    ).toMatchSnapshot('visibility-of-menu-bar-at-400-zoom.png');
  });
});
