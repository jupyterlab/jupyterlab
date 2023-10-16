// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, galata, test } from '@jupyterlab/galata';

test.describe('Low Vision Support Test', () => {
  test('Should show visability of menu-bar at 400-zoom', async ({ page }) => {
    await page.goto();
    await page.evaluate('document.body.style.zoom=4.0');

    const imageName = 'visability-of-menu-bar-at-400-zoom.png';
    expect(
      await page.screenshot({ clip: { x: 0, y: 0, width: 1280, height: 100 } })
    ).toMatchSnapshot(imageName.toLowerCase());
  });
});
