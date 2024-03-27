// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, galata, test } from '@jupyterlab/galata';
import * as path from 'path';

import {
  dragCellTo,
  notebookViewportRatio,
  positionCellPartiallyBelowViewport
} from './utils';

const fileName = 'scroll.ipynb';
const longOutputsNb = 'long_outputs.ipynb';

test.use({
  mockSettings: {
    ...galata.DEFAULT_SETTINGS,
    '@jupyterlab/notebook-extension:tracker': {
      ...galata.DEFAULT_SETTINGS['@jupyterlab/notebook-extension:tracker'],
      windowingMode: 'none'
    }
  }
});

test.describe('Notebook scroll on navigation (no windowing)', () => {
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
      const firstCellLocator = page.locator(
        '.jp-Cell[data-windowed-list-index="0"]'
      );
      const lastCellLocator = page.locator(
        `.jp-Cell[data-windowed-list-index="${cellIdx}"]`
      );
      await firstCellLocator.scrollIntoViewIfNeeded();

      await page.click(`a:has-text("${link}")`);

      await expect(firstCellLocator).not.toBeInViewport();
      await expect(lastCellLocator).toBeInViewport();
    });
  }
});

test.describe('Notebook scroll on dragging cells (no windowing)', () => {
  test.beforeEach(async ({ page, tmpPath }) => {
    await page.contents.uploadFile(
      path.resolve(__dirname, `./notebooks/${fileName}`),
      `${tmpPath}/${fileName}`
    );

    await page.notebook.openByPath(`${tmpPath}/${fileName}`);
    await page.notebook.activate(fileName);
  });
  const NOTEBOOK_SCROLLER = '.jp-WindowedPanel-outer';
  const NOTEBOOK_CONTENT = '.jp-WindowedPanel-inner';
  const EDGE_MARGIN = 10;

  test.afterEach(async ({ page, tmpPath }) => {
    await page.contents.deleteDirectory(tmpPath);
  });

  test('Scroll down on dragging cell to the bottom edge', async ({ page }) => {
    const firstCellLocator = page.locator(
      '.jp-Cell[data-windowed-list-index="0"]'
    );
    const lastCellLocator = page.locator(
      '.jp-Cell[data-windowed-list-index="19"]'
    );
    const scroller = page.locator(NOTEBOOK_SCROLLER);
    await firstCellLocator.scrollIntoViewIfNeeded();

    const scrollerBBox = await scroller.boundingBox();
    const notebookContentHeight = (
      await page.locator(NOTEBOOK_CONTENT).boundingBox()
    ).height;

    // Ensure the notebook is scrolled correctly and last cell is not visible
    const before = await scroller.evaluate(node => node.scrollTop);
    expect(before).toBe(0);
    await expect(lastCellLocator).not.toBeInViewport();

    // Emulate drag and drop
    await dragCellTo(page, {
      cell: firstCellLocator,
      x: scrollerBBox.x + 0.5 * scrollerBBox.width,
      y: scrollerBBox.y + scrollerBBox.height - EDGE_MARGIN,
      stopCondition: async () => {
        const scrollTop = await scroller.evaluate(node => node.scrollTop);
        return scrollTop >= notebookContentHeight - 100;
      }
    });

    // The notebook should have scrolled down and the last cell should be visible
    const after = await scroller.evaluate(node => node.scrollTop);
    expect(after).toBeGreaterThan(before);
    await expect(lastCellLocator).toBeInViewport();
  });

  test('Scroll up on dragging cell to the top edge', async ({ page }) => {
    const firstCellLocator = page.locator(
      '.jp-Cell[data-windowed-list-index="0"]'
    );
    const lastCellLocator = page.locator(
      '.jp-Cell[data-windowed-list-index="19"]'
    );

    const scroller = page.locator(NOTEBOOK_SCROLLER);
    const scrollerBBox = await scroller.boundingBox();
    const notebookContentHeight = (
      await page.locator(NOTEBOOK_CONTENT).boundingBox()
    ).height;

    // Scroll notebook to the bottom, leaving top 200px visible
    await page.mouse.move(
      scrollerBBox.x + 0.5 * scrollerBBox.width,
      scrollerBBox.y + 0.5 * scrollerBBox.height
    );
    await page.mouse.wheel(0, notebookContentHeight - 200);
    await lastCellLocator.scrollIntoViewIfNeeded();

    // Ensure the notebook is scrolled correctly and first cell is not visible
    const before = await scroller.evaluate(node => node.scrollTop);
    expect(before).toBeGreaterThan(notebookContentHeight * 0.75);
    await expect(firstCellLocator).not.toBeInViewport();

    // Emulate drag and drop
    await dragCellTo(page, {
      cell: lastCellLocator,
      x: scrollerBBox.x + 0.5 * scrollerBBox.width,
      y: scrollerBBox.y + EDGE_MARGIN,
      stopCondition: async () => {
        const scrollTop = await scroller.evaluate(node => node.scrollTop);
        return scrollTop <= 50;
      }
    });

    // The notebook should have scrolled up and the first cell should be visible
    const after = await scroller.evaluate(node => node.scrollTop);
    expect(after).toBeLessThan(before);
    await expect(firstCellLocator).toBeInViewport();
  });
});

test.describe('Notebook scroll on execution (no windowing)', () => {
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
    const notebook = await page.notebook.getNotebookInPanelLocator();
    const thirdCell = await page.notebook.getCellLocator(2);

    await positionCellPartiallyBelowViewport(page, notebook!, thirdCell!, 0.01);
    // Select second cell
    await page.notebook.selectCells(1);

    // The third cell should be positioned at the bottom, revealing between 0 to 2% of its content.
    await expect(thirdCell!).toBeInViewport({ ratio: 0.0 });
    await expect(thirdCell!).not.toBeInViewport({ ratio: 0.02 });
    // Only a small fraction of notebook viewport should be taken up by that cell
    expect(await notebookViewportRatio(notebook!, thirdCell!)).toBeLessThan(
      0.1
    );

    // Run second cell
    await page.notebook.runCell(1);

    // After running the second cell, the third cell should be revealed, in at least 10%
    await expect(thirdCell!).toBeInViewport({ ratio: 0.1 });

    // The third cell should now occupy about half of the notebook viewport
    expect(await notebookViewportRatio(notebook!, thirdCell!)).toBeGreaterThan(
      0.4
    );
  });

  test('should not scroll when advancing if top is non-marginally visible', async ({
    page
  }) => {
    const notebook = await page.notebook.getNotebookInPanelLocator();
    const thirdCell = await page.notebook.getCellLocator(2);

    await positionCellPartiallyBelowViewport(page, notebook!, thirdCell!, 0.15);
    // Select second cell
    await page.notebook.selectCells(1);

    // The third cell should be positioned at the bottom, revealing between 10 to 20% of its content.
    await expect(thirdCell!).toBeInViewport({ ratio: 0.1 });
    await expect(thirdCell!).not.toBeInViewport({ ratio: 0.2 });
    // This cell should initially take up between 30% and 50% of the notebook viewport
    let spaceTaken = await notebookViewportRatio(notebook!, thirdCell!);
    expect(spaceTaken).toBeGreaterThan(0.3);
    expect(spaceTaken).toBeLessThan(0.5);

    // Run second cell
    await page.notebook.runCell(1);
    // After running the second cell, the third cell should not be scrolled
    await expect(thirdCell!).not.toBeInViewport({ ratio: 0.2 });
    // The cell should still take up between 30% and 50% of the notebook viewport
    spaceTaken = await notebookViewportRatio(notebook!, thirdCell!);
    expect(spaceTaken).toBeGreaterThan(0.3);
    expect(spaceTaken).toBeLessThan(0.5);
  });

  test('should not scroll when running in-place', async ({ page }) => {
    const notebook = await page.notebook.getNotebookInPanelLocator();
    const thirdCell = await page.notebook.getCellLocator(2);

    await positionCellPartiallyBelowViewport(page, notebook!, thirdCell!, 0.15);
    // Select third cell
    await page.notebook.enterCellEditingMode(2);

    // The third cell should be positioned at the bottom, revealing between 10 to 20% of its content.
    await expect(thirdCell!).toBeInViewport({ ratio: 0.1 });
    await expect(thirdCell!).not.toBeInViewport({ ratio: 0.2 });

    // Run third cell in-place
    await page.notebook.runCell(2, true);
    // After running the third cell it should not be scrolled
    await expect(thirdCell!).not.toBeInViewport({ ratio: 0.2 });

    // The galata implementation of `page.notebook.runCell(2, true);`
    // first switches to command mode before cell execution,
    // so we want to also check if this works from edit mode too.
    await page.keyboard.press('Control+Enter');

    // After running the third cell it should not be scrolled
    await expect(thirdCell!).not.toBeInViewport({ ratio: 0.2 });
  });
});

test.describe('Notebook scroll over long outputs (no windowing)', () => {
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
    const lastCell = await page.notebook.getCellLocator(10);
    await lastCell!.scrollIntoViewIfNeeded();

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
