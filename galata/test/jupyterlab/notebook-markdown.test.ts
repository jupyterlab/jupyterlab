// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  expect,
  galata,
  IJupyterLabPageFixture,
  test
} from '@jupyterlab/galata';
import * as path from 'path';

const fileName = 'markdown_notebook.ipynb';

async function enterEditingModeForScreenshot(
  page: IJupyterLabPageFixture,
  cellIndex: number
) {
  await page.notebook.enterCellEditingMode(cellIndex);
  const cell = await page.notebook.getCellLocator(cellIndex);
  // Make sure cursor is consistently in the same position to avoid screenshot flake
  await page.keyboard.press('Home');
  await page.keyboard.press('PageUp');
  // Add some timeout to stabilize codemirror bounding box
  const cellBox = await cell.boundingBox();
  const cellNew = await page.notebook.getCellLocator(cellIndex);
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
  test.use({ tmpPath: 'test-notebook-markdown' });

  test.beforeAll(async ({ tmpPath, request }) => {
    const contents = galata.newContentsHelper(request);
    await contents.uploadFile(
      path.resolve(__dirname, `./notebooks/${fileName}`),
      `${tmpPath}/${fileName}`
    );
  });

  test.beforeEach(async ({ page, tmpPath }) => {
    await page.notebook.openByPath(`${tmpPath}/${fileName}`);
  });

  test('Highlight LaTeX syntax', async ({ page }) => {
    const imageName = 'highlight-latex.png';
    await page.notebook.enterCellEditingMode(0);
    const cell = await page.notebook.getCellLocator(0);

    expect(await cell!.locator('.jp-Editor').screenshot()).toMatchSnapshot(
      imageName
    );
  });

  test('Do not highlight TeX in code blocks', async ({ page }) => {
    const imageName = 'do-not-highlight-not-latex.png';
    await enterEditingModeForScreenshot(page, 1);
    const cell = await page.notebook.getCellLocator(1);

    expect(await cell!.locator('.jp-Editor').screenshot()).toMatchSnapshot(
      imageName
    );
  });

  test('Do not enter math mode for standalone dollar', async ({
    page,
    tmpPath
  }) => {
    const imageName = 'do-not-highlight-standalone-dollar.png';
    await enterEditingModeForScreenshot(page, 2);
    const cell = await page.notebook.getCellLocator(2);

    expect(await cell!.locator('.jp-Editor').screenshot()).toMatchSnapshot(
      imageName
    );
  });

  test('Render a MermaidJS flowchart', async ({ page, tmpPath }) => {
    const imageName = 'render-mermaid-flowchart.png';
    const cell = await page.notebook.getCellLocator(3);
    expect(await cell!.screenshot()).toMatchSnapshot(imageName);
  });

  test('Render a MermaidJS error', async ({ page, tmpPath }) => {
    const imageName = 'render-mermaid-error.png';
    const cell = await page.notebook.getCellLocator(4);
    expect(await cell!.screenshot()).toMatchSnapshot(imageName);
  });
});
