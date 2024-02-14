// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import { IJupyterLabPageFixture } from '@jupyterlab/galata';
import { ElementHandle } from '@playwright/test';

const OUTER_SELECTOR = '.jp-WindowedPanel-outer';

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
