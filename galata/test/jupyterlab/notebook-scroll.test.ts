// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, galata, test } from '@jupyterlab/galata';
import * as path from 'path';

const fileName = 'scroll.ipynb';
const longOutputsNb = 'long_outputs.ipynb';

test.use({
  mockSettings: {
    ...galata.DEFAULT_SETTINGS,
    '@jupyterlab/notebook-extension:tracker': {
      ...galata.DEFAULT_SETTINGS['@jupyterlab/notebook-extension:tracker'],
      windowingMode: 'full'
    }
  }
});

test.describe('Notebook scroll on navigation', () => {
  test.beforeEach(async ({ page, tmpPath }) => {
    await page.contents.uploadFile(
      path.resolve(__dirname, `./notebooks/${fileName}`),
      `${tmpPath}/${fileName}`
    );

    await page.notebook.openByPath(`${tmpPath}/${fileName}`);
    await page.notebook.activate(fileName);
  });

  test.afterEach(async ({ page, tmpPath }) => {
    await page.contents.deleteDirectory(tmpPath);
  });

  const cellLinks = {
    'penultimate cell using heading, legacy format': 18,
    'penultimate cell using heading, explicit fragment': 18,
    'last cell using heading, legacy format': 19,
    'last cell using heading, explicit fragment': 19,
    'last cell using cell identifier': 19
  };
  for (const [link, cellIdx] of Object.entries(cellLinks)) {
    test(`Scroll to ${link}`, async ({ page }) => {
      const firstCell = await page.notebook.getCell(0);
      await firstCell.scrollIntoViewIfNeeded();
      expect(await firstCell.boundingBox()).toBeTruthy();

      await page.click(`a:has-text("${link}")`);

      await firstCell.waitForElementState('hidden');
      expect(await firstCell.boundingBox()).toBeFalsy();

      const lastCell = await page.notebook.getCell(cellIdx);
      await lastCell.waitForElementState('visible');
      expect(await lastCell.boundingBox()).toBeTruthy();
    });
  }
});

test.describe('Notebook scroll on execution', () => {
  test.beforeEach(async ({ page, tmpPath }) => {
    await page.contents.uploadFile(
      path.resolve(__dirname, `./notebooks/${longOutputsNb}`),
      `${tmpPath}/${longOutputsNb}`
    );

    await page.notebook.openByPath(`${tmpPath}/${longOutputsNb}`);
    await page.notebook.activate(longOutputsNb);
  });

  test.afterEach(async ({ page, tmpPath }) => {
    await page.contents.deleteDirectory(tmpPath);
  });

  test('should scroll when advancing if top is only marginally visible', async ({
    page
  }) => {
    const notebook = await page.notebook.getNotebookInPanel();
    const thirdCell = await page.notebook.getCell(2);

    const notebookBbox = await notebook.boundingBox();
    const thirdCellBBox = await thirdCell.boundingBox();
    await page.mouse.move(notebookBbox.x, notebookBbox.y);
    const scrollOffset =
      thirdCellBBox.y -
      notebookBbox.y -
      notebookBbox.height +
      thirdCellBBox.height * 0.01;
    await Promise.all([page.mouse.wheel(0, scrollOffset)]);
    // Select second cell
    await page.notebook.selectCells(1);

    const thirdCellLocator = page.locator(
      '.jp-Cell[data-windowed-list-index="2"]'
    );
    // The third cell should be positioned at the bottom, revealing between 0 to 2% of its content.
    await expect(thirdCellLocator).toBeInViewport({ ratio: 0.0 });
    await expect(thirdCellLocator).not.toBeInViewport({ ratio: 0.02 });

    // Run second cell
    await page.notebook.runCell(1);
    // After running the second cell, the third cell should be revealed, in at least 25%
    await expect(thirdCellLocator).toBeInViewport({ ratio: 0.25 });
  });

  test('should not scroll when advancing if top is non-marginally visible', async ({
    page
  }) => {
    const notebook = await page.notebook.getNotebookInPanel();
    const thirdCell = await page.notebook.getCell(2);

    const notebookBbox = await notebook.boundingBox();
    const thirdCellBBox = await thirdCell.boundingBox();
    await page.mouse.move(notebookBbox.x, notebookBbox.y);
    const scrollOffset =
      thirdCellBBox.y -
      notebookBbox.y -
      notebookBbox.height +
      thirdCellBBox.height * 0.15;
    await Promise.all([page.mouse.wheel(0, scrollOffset)]);
    // Select second cell
    await page.notebook.selectCells(1);

    const thirdCellLocator = page.locator(
      '.jp-Cell[data-windowed-list-index="2"]'
    );
    // The third cell should be positioned at the bottom, revealing between 10 to 20% of its content.
    await expect(thirdCellLocator).toBeInViewport({ ratio: 0.1 });
    await expect(thirdCellLocator).not.toBeInViewport({ ratio: 0.2 });

    // Run second cell
    await page.notebook.runCell(1);
    // After running the second cell, the third cell should not be scrolled
    await expect(thirdCellLocator).not.toBeInViewport({ ratio: 0.2 });
  });
});

test.describe('Notebook scroll over long outputs', () => {
  const outputAndHeading = 'long_output_and_headings.ipynb';
  test.beforeEach(async ({ page, tmpPath }) => {
    await page.contents.uploadFile(
      path.resolve(__dirname, `./notebooks/${outputAndHeading}`),
      `${tmpPath}/${outputAndHeading}`
    );

    await page.notebook.openByPath(`${tmpPath}/${outputAndHeading}`);
    await page.notebook.activate(outputAndHeading);
  });

  test.afterEach(async ({ page, tmpPath }) => {
    await page.contents.deleteDirectory(tmpPath);
  });

  test('should scroll smoothly without snapping to headings', async ({
    page
  }) => {
    const renderedMarkdownLocator = page.locator(
      '.jp-Cell .jp-RenderedMarkdown:has-text("Before")'
    );
    // Wait until Markdown cells are rendered
    await renderedMarkdownLocator.waitFor({ timeout: 100 });
    // Un-render the "before" markdown cell
    await renderedMarkdownLocator.dblclick();
    // Make the first cell active
    await page.notebook.selectCells(0);
    // Check that that the markdown cell is un-rendered
    await renderedMarkdownLocator.waitFor({ state: 'hidden', timeout: 100 });

    // Scroll to the last cell
    const lastCell = await page.notebook.getCell(10);
    await lastCell.scrollIntoViewIfNeeded();

    // Get the outer window
    const outer = page.locator('.jp-WindowedPanel-outer');

    let previousOffset = await outer.evaluate(node => node.scrollTop);
    expect(previousOffset).toBeGreaterThan(1000);

    // Scroll piece by piece checking that there is no jump
    while (previousOffset > 75) {
      await page.mouse.wheel(0, -100);
      // Explicit wait because mouse wheel does not wait for scrolling.
      await page.waitForTimeout(150);
      const offset = await outer.evaluate(node => node.scrollTop);
      const diff = previousOffset - offset;
      // The scroll should be by about 100px, but because wheel event
      // does not wait we allow for some wiggle room (+/-25px).
      expect(diff).toBeLessThanOrEqual(125);
      expect(diff).toBeGreaterThan(75);
      previousOffset = offset;
    }
  });
});
