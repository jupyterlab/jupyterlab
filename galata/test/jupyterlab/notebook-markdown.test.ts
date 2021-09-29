// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { test } from '@jupyterlab/galata';
import { expect } from '@playwright/test';
import * as path from 'path';

const fileName = 'markdown_notebook.ipynb';

test.describe('Notebook Markdown', () => {
  test.beforeEach(async ({ page, tmpPath }) => {
    await page.contents.uploadFile(
      path.resolve(__dirname, `./notebooks/${fileName}`),
      `${tmpPath}/${fileName}`
    );
  });

  test('Highlight LaTeX syntax', async ({ page, tmpPath }) => {
    await page.notebook.openByPath(`${tmpPath}/${fileName}`);
    const imageName = 'highlight-latex.png';
    await page.notebook.enterCellEditingMode(0);
    const cell = await page.notebook.getCell(0);

    expect(await cell.screenshot()).toMatchSnapshot(imageName);
  });

  test('Do not highlight non-LaTeX syntax', async ({ page, tmpPath }) => {
    await page.notebook.openByPath(`${tmpPath}/${fileName}`);

    const imageName = 'do-not-highlight-not-latex.png';
    await page.notebook.enterCellEditingMode(1);
    const cell = await page.notebook.getCell(1);
    // Add some timeout to stabilize codemirror bounding box
    const cellBox = await cell.boundingBox();
    const cellNew = await page.notebook.getCell(1);
    const cellNewBox = await cellNew.boundingBox();
    if (
      cellBox.x != cellNewBox.x ||
      cellBox.y != cellNewBox.y ||
      cellBox.width != cellNewBox.width ||
      cellBox.height != cellNewBox.height
    ) {
      // Wait a bit if the bounding box have changed
      await page.waitForTimeout(100);
    }
    expect(await (await page.notebook.getCell(1)).screenshot()).toMatchSnapshot(
      imageName
    );
  });
});
