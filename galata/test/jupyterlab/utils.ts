// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import { IJupyterLabPageFixture } from '@jupyterlab/galata';
import { ElementHandle, Locator } from '@playwright/test';

const OUTER_SELECTOR = '.jp-WindowedPanel-outer';
const DRAGGABLE_AREA = '.jp-InputArea-prompt';

/**
 * Measure how much of the **notebook** viewport does a cell take up.
 */
export async function notebookViewportRatio(
  notebook: ElementHandle,
  cell: ElementHandle
): Promise<number> {
  const scroller = (await notebook.$(
    OUTER_SELECTOR
  )) as ElementHandle<HTMLElement>;
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
  notebook: ElementHandle,
  cell: ElementHandle,
  ratio: number
): Promise<void> {
  const scroller = (await notebook.$(
    OUTER_SELECTOR
  )) as ElementHandle<HTMLElement>;
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
 * Set the sidebar width
 *
 * @param page Page object
 * @param width Sidebar width in pixels
 * @param side Which sidebar to set: 'left' or 'right'
 */
export async function setSidebarWidth(
  page: IJupyterLabPageFixture,
  width = 251,
  side: 'left' | 'right' = 'left'
): Promise<void> {
  const handles = page.locator(
    '#jp-main-split-panel > .lm-SplitPanel-handle:not(.lm-mod-hidden)'
  );
  const splitHandle =
    side === 'left'
      ? await handles.first().elementHandle()
      : await handles.last().elementHandle();
  const handleBBox = await splitHandle.boundingBox();

  await page.mouse.move(
    handleBBox.x + 0.5 * handleBBox.width,
    handleBBox.y + 0.5 * handleBBox.height
  );
  await page.mouse.down();
  await page.mouse.move(
    side === 'left' ? 33 + width : page.viewportSize().width - 33 - width,
    handleBBox.y + 0.5 * handleBBox.height
  );
  await page.mouse.up();
}
