// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Cell } from '@jupyterlab/cells';
import { generateNumbering } from '../../utils/generate_numbering';
import { INotebookHeading, RunningStatus } from '../../utils/headings';
import { INumberingDictionary } from '../../utils/numbering_dictionary';
import { parseHeading } from '../../utils/parse_heading';

/**
 * Returns a "click" handler.
 *
 * @private
 * @param line - line number
 * @returns "click" handler
 */
type onClickFactory = (line: number) => () => void;

/**
 * Parses a Markdown string and returns a notebook heading.
 *
 * @private
 * @param text - Markdown string
 * @param onClick - callback which returns a "click" handler
 * @param dict - numbering dictionary
 * @param lastLevel - last level
 * @param cellRef - cell reference
 * @param index - index of referenced cell relative to other cells in the notebook
 * @returns notebook heading
 */
function getMarkdownHeadings(
  text: string,
  onClick: onClickFactory,
  dict: INumberingDictionary,
  lastLevel: number,
  cellRef: Cell,
  index: number = -1,
  isRunning = RunningStatus.Idle
): INotebookHeading[] {
  const callback = onClick(0);
  let headings: INotebookHeading[] = [];
  if (index === -1) {
    console.warn(
      'Deprecation warning! index argument will become mandatory in the next version'
    );
  }
  for (const line of text.split('\n')) {
    const heading = parseHeading(line);
    if (heading) {
      headings.push({
        text: heading.text,
        level: heading.level,
        numbering: generateNumbering(dict, heading.level),
        onClick: callback,
        type: 'header',
        cellRef: cellRef,
        hasChild: false,
        isRunning,
        index
      });
    } else {
      headings.push({
        text: text,
        level: lastLevel + 1,
        onClick: callback,
        type: 'markdown',
        cellRef: cellRef,
        hasChild: false,
        isRunning,
        index
      });
    }
  }
  return headings;
}

/**
 * Exports.
 */
export { getMarkdownHeadings };
