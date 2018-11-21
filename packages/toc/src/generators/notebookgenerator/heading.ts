// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Cell } from '@jupyterlab/cells';

import { INumberedHeading } from '../shared';

/**
 * A heading for a notebook cell.
 */
export interface INotebookHeading extends INumberedHeading {
  type: 'header' | 'markdown' | 'code';
  prompt?: string;
  cellRef: Cell;
  hasChild?: boolean;
}
