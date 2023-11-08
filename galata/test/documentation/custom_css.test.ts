// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, galata, test } from '@jupyterlab/galata';

test.use({
  autoGoto: false,
  mockState: galata.DEFAULT_DOCUMENTATION_STATE,
  viewport: { height: 720, width: 1280 }
});

test.describe('Use custom CSS layout', () => {
  test('should apply custom CSS to main page', async ({ page }) => {
    await galata.Mock.freezeContentLastModified(page);
    await page.goto();
    await page.evaluate(() => {
      const body = document.body;

      body.setAttribute('data-testing-custom-css', '');
    });
    const attributeValue = await page.getAttribute(
      'body',
      'data-testing-custom-css'
    );
    expect(attributeValue).not.toBeNull();

    await page.waitForSelector('.jp-LauncherCard-label');

    expect(await page.screenshot()).toMatchSnapshot('custom-css-main.png');
  });

  test('should apply custom CSS to h1 headings', async ({ page }) => {
    await galata.Mock.freezeContentLastModified(page);
    await page.goto();
    await page.evaluate(() => {
      const body = document.body;

      body.setAttribute('data-testing-custom-css', '');
    });
    const attributeValue = await page.getAttribute(
      'body',
      'data-testing-custom-css'
    );
    expect(attributeValue).not.toBeNull();

    await page.dblclick(
      '[aria-label="File Browser Section"] >> text=notebooks'
    );
    await page.dblclick('text=Lorenz.ipynb');

    await page.waitForSelector('div[role="main"] >> text=Lorenz.ipynb');

    // Wait for kernel to settle on idle
    await page
      .locator('.jp-DebuggerBugButton[aria-disabled="false"]')
      .waitFor();
    await page
      .locator('.jp-Notebook-ExecutionIndicator[data-status="idle"]')
      .waitFor();

    expect(await page.screenshot()).toMatchSnapshot(
      'custom-css-notebook-markdown.png'
    );
  });
});
