/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { Widget } from '@lumino/widgets';

/**
 * The CSS class added to the cell header.
 */
const CELL_HEADER_CLASS = 'jp-CellHeader';

/**
 * The CSS class added to the cell footer.
 */
const CELL_FOOTER_CLASS = 'jp-CellFooter';

/**
 * The interface for a cell header.
 */
export interface ICellHeader extends Widget {}

/**
 * Default implementation of a cell header.
 */
export class CellHeader extends Widget implements ICellHeader {
  /**
   * Construct a new cell header.
   */
  constructor() {
    super();
    this.addClass(CELL_HEADER_CLASS);
  }
}

/**
 * The interface for a cell footer.
 */
export interface ICellFooter extends Widget {}

/**
 * Default implementation of a cell footer.
 */
export class CellFooter extends Widget implements ICellFooter {
  /**
   * Construct a new cell footer.
   */
  constructor() {
    super();
    this.addClass(CELL_FOOTER_CLASS);
  }
}
