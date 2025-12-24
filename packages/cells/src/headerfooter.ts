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
 * The CSS class added to cell footers.
 */
const CELL_FOOTER_CLASS = 'jp-CellFooter';

/**
 * The CSS modifier class added to cell footer below cell input.
 */
const INPUT_CLASS = 'jp-mod-input';

/**
 * The CSS modifier class added to cell footers below cell output.
 */
const OUTPUT_CLASS = 'jp-mod-output';

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
export interface ICellFooter extends Widget {
  /**
   * Whether the cell footer appears as a footer for cell input or output area.
   */
  readonly position: 'input' | 'output';
}

export interface ICellInputFooter extends ICellFooter {
  position: 'input';
}

export interface ICellOutputFooter extends ICellFooter {
  position: 'output';
}

/**
 * Default implementation of a cell footer.
 */
export class CellFooter extends Widget implements ICellFooter {
  /**
   * Construct a new cell footer.
   */
  constructor(readonly position: 'input' | 'output' = 'output') {
    super();
    this.addClass(CELL_FOOTER_CLASS);
    this.addClass(position === 'input' ? INPUT_CLASS : OUTPUT_CLASS);
  }
}
