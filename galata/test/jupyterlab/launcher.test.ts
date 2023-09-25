// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, test } from '@jupyterlab/galata';

test.describe('Dynamic Text Spacing', () => {
  test('should Use Dynamic Text Spacing', async ({ page }) => {
    await page.goto();
    await page.waitForSelector('.jp-LauncherCard-label');

    let element = page.locator('div >> .jp-LauncherCard-label');
    let height = await element.evaluate(el => {
      return window.getComputedStyle(el).getPropertyValue('min-height');
    });
    await expect(height).toBe('var(--jp-private-launcher-card-label-height)');

    const imageName = 'launcher-card-label-height.png';
    expect(await page.screenshot()).toMatchSnapshot(imageName.toLowerCase());
  });
});
