// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import type { IJupyterLabPageFixture } from '@jupyterlab/galata';
import type { Locator } from '@playwright/test';

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

  // Helper to measure actual visible pixels of the cell
  const measureVisiblePixels = async (): Promise<number> => {
    const notebookBbox = await scroller.boundingBox();
    const cellBbox = await cell.boundingBox();
    const cellTop = cellBbox.y;
    const cellBottom = cellBbox.y + cellBbox.height;
    const viewportTop = notebookBbox.y;
    const viewportBottom = notebookBbox.y + notebookBbox.height;

    if (cellBottom <= viewportTop || cellTop >= viewportBottom) {
      return 0; // Cell not in viewport
    }

    const visibleTop = Math.max(cellTop, viewportTop);
    const visibleBottom = Math.min(cellBottom, viewportBottom);
    return visibleBottom - visibleTop;
  };

  // Calculate target visible pixels
  const cellBbox = await cell.boundingBox();
  const targetPixels = cellBbox.height * ratio;

  // Initial scroll estimate
  const notebookBbox = await scroller.boundingBox();
  await page.mouse.move(notebookBbox.x, notebookBbox.y);

  const initialScrollOffset =
    cellBbox.y - notebookBbox.y - notebookBbox.height + targetPixels;
  await page.mouse.wheel(0, initialScrollOffset);

  // Optimization loop to refine positioning
  const MAX_ITERATIONS = 10;
  const TOLERANCE = 1; // 1 pixel tolerance

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const actualPixels = await measureVisiblePixels();
    const error = actualPixels - targetPixels;

    if (Math.abs(error) <= TOLERANCE) {
      break; // Achieved target within tolerance
    }

    // Correct by half the error amount
    const correction = -error / 2;
    await page.mouse.wheel(0, correction);
  }
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

/**
 * Get the font size of items in the file browser listing.
 */
export async function getFileListFontSize(
  page: IJupyterLabPageFixture
): Promise<number> {
  const itemElement = page.locator(
    '.jp-DirListing-content .jp-DirListing-itemText'
  );
  await itemElement.waitFor();
  const fontSize = await itemElement.evaluate(
    el => getComputedStyle(el).fontSize
  );
  return parseInt(fontSize);
}

/**
 * Change font size using Settings > Theme menu.
 */
export async function changeCodeFontSize(
  page: IJupyterLabPageFixture,
  menuOption: string
): Promise<void> {
  await page.menu.clickMenuItem(`Settings>Theme>${menuOption}`);
}
