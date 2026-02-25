// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { IJupyterLabPageFixture } from '@jupyterlab/galata';
import { expect, galata, test } from '@jupyterlab/galata';
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
  // Scroll the cell into the middle of the viewport to ensure we do not include
  // notebook/shell borders in the screenshot boundary.
  await cell!.evaluate(element => {
    element.scrollIntoView({ block: 'center', inline: 'nearest' });
  });
  await page.waitForTimeout(50);
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
    await cell!.scrollIntoViewIfNeeded();
    const output = cell!.locator('.jp-RenderedMermaid');
    await output.waitFor();
    expect(await cell!.screenshot()).toMatchSnapshot(imageName);
  });

  test('Render a MermaidJS error', async ({ page, tmpPath }) => {
    const imageName = 'render-mermaid-error.png';
    const cell = await page.notebook.getCellLocator(4);
    await cell!.scrollIntoViewIfNeeded();
    const output = cell!.locator('.jp-RenderedMermaid');
    await output.waitFor();
    expect(await cell!.screenshot()).toMatchSnapshot(imageName);
  });
});

test.describe('Notebook Markdown Editing', () => {
  test('Toggle bold formatting with Ctrl+B', async ({ page }) => {
    await page.notebook.createNew();
    await page.notebook.setCell(0, 'markdown', 'Bold text');

    await page.notebook.enterCellEditingMode(0);

    await page.keyboard.press('Home');

    // Select "Bold" (4 characters)
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('Shift+ArrowRight');
    }

    // Press Ctrl+B (Accel B) to toggle bold
    await page.keyboard.press('Control+B');

    // Verify the text is wrapped with **
    const cellText = await page.notebook.getCellTextInput(0);
    expect(cellText).toContain('**Bold**');
    expect(cellText).toBe('**Bold** text');

    await page.keyboard.press('Home');

    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Shift+ArrowRight');
    }

    // Press Ctrl+B again to unwrap
    await page.keyboard.press('Control+B');

    // Verify the text is unwrapped
    const cellTextAfterUnwrap = await page.notebook.getCellTextInput(0);
    expect(cellTextAfterUnwrap).not.toContain('**Bold**');
    expect(cellTextAfterUnwrap).toBe('Bold text');
  });
});
