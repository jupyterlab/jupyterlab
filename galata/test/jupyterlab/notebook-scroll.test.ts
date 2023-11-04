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

      await page.click(`a:has-text("${link}")`);

      await firstCell.waitForElementState('hidden');

      const lastCell = await page.notebook.getCell(cellIdx);
      await lastCell.waitForElementState('visible');
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
