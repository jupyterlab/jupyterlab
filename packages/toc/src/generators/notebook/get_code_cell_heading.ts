// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Cell } from '@jupyterlab/cells';
import { INotebookHeading, RunningStatus } from '../../utils/headings';

/**
 * Returns a "click" handler.
 *
 * @private
 * @param line - line number
 * @returns "click" handler
 */
type onClickFactory = (line: number) => () => void;

/**
 * Returns a code entry notebook heading from a code string.
 *
 * @private
 * @param text - code string
 * @param onClick - callback which returns a "click" handler
 * @param executionCount - execution count
 * @param lastLevel - last heading level
 * @param cellRef - cell reference
 * @param index - index of referenced cell relative to other cells in the notebook
 * @returns notebook heading
 */
function getCodeCellHeading(
  text: string,
  onClick: onClickFactory,
  executionCount: string,
  lastLevel: number,
  cellRef: Cell,
  index: number = -1,
  isRunning = RunningStatus.Idle
): INotebookHeading {
  let headings: INotebookHeading[] = [];
  if (index === -1) {
    console.warn(
      'Deprecation warning! index argument will become mandatory in the next version'
    );
  }
  if (text) {
    const lines = text.split('\n');
    const len = Math.min(lines.length, 3);
    let str = '';
    let i = 0;
    for (; i < len - 1; i++) {
      str += lines[i] + '\n';
    }
    str += lines[i];
    headings.push({
      text: str,
      level: lastLevel + 1,
      onClick: onClick(0),
      type: 'code',
      prompt: executionCount,
      cellRef: cellRef,
      hasChild: false,
      index: index,
      isRunning
    });
  }
  return headings[0];
}

/**
 * Exports.
 */
export { getCodeCellHeading };
