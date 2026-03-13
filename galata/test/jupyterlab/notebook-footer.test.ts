/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { expect, test } from '@jupyterlab/galata';

/**
 * Test the responsive alignment of the Notebook Footer
 */
test.describe('Notebook Footer Responsive Alignment', () => {
  test('should align correctly on screens smaller than 760px', async ({
    page
  }) => {
    await page.notebook.createNew();

    // Set the viewport to a mobile width
    await page.setViewportSize({ width: 600, height: 800 });

    const footer = page.locator('.jp-Notebook-footer');
    const panel = page.locator('.jp-WindowedPanel-outer');

    // Hover to make the footer visible
    await footer.hover();
    await page.waitForTimeout(200);

    const imageName = 'footer-alignment.png';

    expect(await panel.screenshot()).toMatchSnapshot(imageName);
  });
});
