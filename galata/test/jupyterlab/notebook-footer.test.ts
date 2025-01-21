/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { test, expect } from '@jupyterlab/galata';
const fileName = 'notebook.ipynb';

const breakpoints = [759, 600, 500, 400];
test.describe('Notebook footer responsiveness', () => {
  for (const width of breakpoints) {
    test(`Footer layout for viewport width ${width}px`, async ({ page }) => {
      // Dynamically set the viewport for the test
      await page.setViewportSize({ width, height: 800 });
      await page.notebook.createNew(fileName)
      // Wait for the footer element to be available
      const footer = page.locator('.jp-Notebook-footer');
      await footer.waitFor();

      await footer.hover();

      // Capture a screenshot of the open menu and verify responsiveness
      const imageName = `footer-viewport-${width}px.png`;
      const footerScreenshot = await footer.screenshot();
      expect(footerScreenshot!).toMatchSnapshot(imageName.toLowerCase());
    });
  }
});
