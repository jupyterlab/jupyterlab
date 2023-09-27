// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, test } from '@jupyterlab/galata';

test.describe('Dynamic Text Spacing', () => {
  test('should Use Dynamic Text Spacing', async ({ page }) => {
    await page.goto();
    await page.waitForSelector('.jp-LauncherCard-label');

    let element = page.locator('div.jp-LauncherCard-label');
    for (let i = 0; i < (await element.count()); i++) {
      let height = await element
        .nth(i)
        .evaluate(el =>
          window.getComputedStyle(el).getPropertyValue('min-height')
        );
      await expect(height).toContain('2.462em, 2.154em');
    }
    const imageName = 'launcher-card-label-height.png';
    expect(await page.screenshot()).toMatchSnapshot(imageName.toLowerCase());
  });
});
