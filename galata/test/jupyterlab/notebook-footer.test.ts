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
    // The footer is revealed via a CSS opacity change on hover; the footer
    // element is already considered "visible" by Playwright even at
    // opacity: 0, so wait briefly to let the paint settle before the
    // screenshot is taken.
    // eslint-disable-next-line playwright/no-wait-for-timeout -- allow the hover-triggered opacity change to render before taking the screenshot
    await page.waitForTimeout(200);

    const imageName = 'footer-alignment.png';

    expect(await panel.screenshot()).toMatchSnapshot(imageName);
  });
});
