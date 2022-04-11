// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, IJupyterLabPageFixture, test } from '@jupyterlab/galata';
import * as path from 'path';

const fileName = 'markdown_notebook.ipynb';

async function enterEditingModeForScreenshot(
  page: IJupyterLabPageFixture,
  cellIndex: number
) {
  await page.notebook.enterCellEditingMode(cellIndex);
  const cell = await page.notebook.getCell(cellIndex);
  // Make sure cursor is consistently in the same position to avoid screenshot flake
  await page.keyboard.press('Home');
  await page.keyboard.press('PageUp');
  // Add some timeout to stabilize codemirror bounding box
  const cellBox = await cell.boundingBox();
  const cellNew = await page.notebook.getCell(cellIndex);
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
}

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

    expect(await (await cell.$('.jp-Editor')).screenshot()).toMatchSnapshot(
      imageName
    );
  });

  test('Do not highlight TeX in code blocks', async ({ page, tmpPath }) => {
    await page.notebook.openByPath(`${tmpPath}/${fileName}`);

    const imageName = 'do-not-highlight-not-latex.png';
    await enterEditingModeForScreenshot(page, 1);
    const cell = await page.notebook.getCell(1);

    expect(await (await cell.$('.jp-Editor')).screenshot()).toMatchSnapshot(
      imageName
    );
  });

  test('Do not enter math mode for standalone dollar', async ({
    page,
    tmpPath
  }) => {
    await page.notebook.openByPath(`${tmpPath}/${fileName}`);

    const imageName = 'do-not-highlight-standalone-dollar.png';
    await enterEditingModeForScreenshot(page, 2);
    const cell = await page.notebook.getCell(2);

    expect(await (await cell.$('.jp-Editor')).screenshot()).toMatchSnapshot(
      imageName
    );
  });
});
