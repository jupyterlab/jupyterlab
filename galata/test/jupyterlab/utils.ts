// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import { IJupyterLabPageFixture } from '@jupyterlab/galata';
import { Locator } from '@playwright/test';

const OUTER_SELECTOR = '.jp-WindowedPanel-outer';
const DRAGGABLE_AREA = '.jp-InputArea-prompt';

/**
 * Measure how much of the **notebook** viewport does a cell take up.
 */
export async function notebookViewportRatio(
  notebook: Locator,
  cell: Locator
): Promise<number> {
  const scroller = notebook.locator(OUTER_SELECTOR).first();
  const n = await scroller.boundingBox();
  const c = await cell.boundingBox();
  const cellBottom = c.y + c.height;
  const cellTop = c.y;
  const notebookBottom = n.y + n.height;
  const notebookTop = n.y;
  const visibleBottom =
    notebookBottom > cellBottom ? cellBottom - notebookTop : 0;
  const visibleTop = cellTop > notebookTop ? notebookBottom - cellTop : 0;
  const intersection =
    notebookBottom > cellBottom && cellTop > notebookTop
      ? n.height
      : visibleBottom + visibleTop;
  return intersection / n.height;
}
/**
 * Scroll so that the given cell is below the viewport, revealing only a given `ratio` of the cell.
 */
export async function positionCellPartiallyBelowViewport(
  page: IJupyterLabPageFixture,
  notebook: Locator,
  cell: Locator,
  ratio: number
): Promise<void> {
  const scroller = notebook.locator(OUTER_SELECTOR).first();
  const notebookBbox = await scroller.boundingBox();
  const cellBbox = await cell.boundingBox();
  await page.mouse.move(notebookBbox.x, notebookBbox.y);
  const scrollOffset =
    cellBbox.y - notebookBbox.y - notebookBbox.height + cellBbox.height * ratio;
  await page.mouse.wheel(0, scrollOffset);
}

/**
 * Drag a cell to a given position, and wait until specified condition is met.
 */
export async function dragCellTo(
  page: IJupyterLabPageFixture,
  options: {
    cell: Locator;
    x: number;
    y: number;
    stopCondition: () => Promise<boolean>;
  }
) {
  const dragHandle = options.cell.locator(DRAGGABLE_AREA);
  const handleBBox = await dragHandle.boundingBox();

  // Emulate drag and drop
  await dragHandle.click();
  await page.mouse.move(
    handleBBox.x + 0.5 * handleBBox.width,
    handleBBox.y + 0.5 * handleBBox.height
  );
  await page.mouse.down();
  await page.mouse.move(options.x, options.y);
  await page.waitForCondition(options.stopCondition);
  await page.mouse.up();
}

/**
 * Check if a given string value is valid JSON.
 */
export function isValidJSON(value: string): boolean {
  try {
    JSON.parse(value);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Check if a given string value is empty (excluding spaces).
 */
export function isBlank(value: string): boolean {
  return value.trim().length === 0;
}
