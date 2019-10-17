// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Cell } from '@jupyterlab/cells';

import { INumberedHeading } from './inumberedheading';

/**
 * Describes an interface for a notebook cell heading.
 *
 * @private
 */
interface INotebookHeading extends INumberedHeading {
  /**
   * Heading type.
   */
  type: 'header' | 'markdown' | 'code';

  /**
   * Reference to a notebook cell.
   */
  cellRef: Cell;

  /**
   * Heading prompt.
   */
  prompt?: string;

  /**
   * Boolean indicating whether a heading has a child node.
   */
  hasChild?: boolean;
}

/**
 * Exports.
 */
export { INotebookHeading };
