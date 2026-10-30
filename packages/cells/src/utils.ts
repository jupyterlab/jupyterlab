/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { WindowedList } from '@jupyterlab/ui-components';
import { ElementExt } from '@lumino/domutils';
import type { Widget } from '@lumino/widgets';

/**
 * Scroll a cell into view after its outputs shrank, so the view does not
 * stay where the outputs used to be.
 */
export function scrollCellIntoView(cell: Widget): void {
  const area =
    cell.parent instanceof WindowedList
      ? cell.parent.outerNode
      : cell.parent?.node;
  if (area) {
    ElementExt.scrollIntoViewIfNeeded(area, cell.node);
  }
}
