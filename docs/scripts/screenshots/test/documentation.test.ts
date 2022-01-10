// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { test } from '@jupyterlab/galata';
import { expect } from '@playwright/test';

test.use({ autoGoto: false });

test.describe('Documentation screenshots', () => {
  test('Overview', async ({ page }) => {
    await page.goto();

    // Click text=README.mdan hour ago >> span
    await page.click('text=README.md', {
      button: 'right'
    });
    // Click text=Markdown Preview
    await page.click('text=Open With');
    await page.click('text=Markdown Preview');
    // Double click [aria-label="File Browser Section"] >> text=notebooks
    await page.dblclick(
      '[aria-label="File Browser Section"] >> text=notebooks'
    );
    await page.dblclick('text=Lorenz.ipynb');

    // Click text=File
    await page.click('text=File');
    await page.click('ul[role="menu"] >> text=New');
    // Click #jp-mainmenu-file-new >> text=Terminal
    await page.click('#jp-mainmenu-file-new >> text=Terminal');
    // Click text=File
    await page.click('text=File');
    await page.click('ul[role="menu"] >> text=New');
    // Click #jp-mainmenu-file-new >> text=Console
    await page.click('#jp-mainmenu-file-new >> text=Console');
    await page.click('button:has-text("Select")');

    // Click text=Data.ipynb
    await page.dblclick('text=Data.ipynb');

    await page.dblclick('text=lorenz.py');

    // Click div[role="main"] >> text=Lorenz.ipynb
    await page.click('div[role="main"] >> text=Lorenz.ipynb');

    await page.notebook.run();
    // // Click text=Run
    // await page.click('text=Run');
    // // Click ul[role="menu"] >> text=Run All Cells
    // await page.click('ul[role="menu"] >> text=Run All Cells');

    // await page.waitForTimeout(500);
    // const cell = await page.notebook.getCell(5);
    const cell = await page.$(
      '[aria-label="Code Cell Content with Output"] >> text=interactive'
    );
    await cell.click();
    await page.keyboard.press('ContextMenu');
    // Click text=Create New View for Output
    await page.click('text=Create New View for Output');

    // Emulate drag and drop
    const viewerHandle = await page.$('div[role="main"] >> text=lorenz.py');
    await viewerHandle.click();
    const viewerBBox = await viewerHandle.boundingBox();

    await page.mouse.move(
      viewerBBox.x + 0.5 * viewerBBox.width,
      viewerBBox.y + 0.5 * viewerBBox.height
    );
    await page.mouse.down();
    await page.mouse.move(viewerBBox.x + 0.5 * viewerBBox.width, 600);
    await page.mouse.up();

    expect(await page.screenshot()).toMatchSnapshot('overview.png');
  });
});
