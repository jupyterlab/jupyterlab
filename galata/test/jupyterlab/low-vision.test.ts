// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, galata, test } from '@jupyterlab/galata';

test.use({
  autoGoto: false,
  mockState: galata.DEFAULT_DOCUMENTATION_STATE,
  viewport: {
    width: 1280,
    height: 1024
  }
});

test.describe('Low Vision Support Test', () => {
  test('should take snapshot at 400% zoom', async ({ page }) => {
    await page.goto();
    await page.evaluate('document.body.style.zoom=4.0');

    const imageName = 'low-vision-high-zoom.png';
    expect(await page.screenshot()).toMatchSnapshot(imageName.toLowerCase());
  });
});
