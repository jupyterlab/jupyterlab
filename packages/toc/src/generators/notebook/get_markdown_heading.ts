// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Cell } from '@jupyterlab/cells';
import { INotebookHeading } from '../../utils/headings';
import { generateNumbering } from '../../utils/generate_numbering';
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
 * @returns notebook heading
 */
function getMarkdownHeading(
  text: string,
  onClick: onClickFactory,
  dict: any,
  lastLevel: number,
  cellRef: Cell
): INotebookHeading {
  const clbk = onClick(0);
  const heading = parseHeading(text);
  if (heading) {
    return {
      text: heading.text,
      level: heading.level,
      numbering: generateNumbering(dict, heading.level),
      onClick: clbk,
      type: 'header',
      cellRef: cellRef,
      hasChild: false
    };
  }
  return {
    text: text,
    level: lastLevel + 1,
    onClick: clbk,
    type: 'markdown',
    cellRef: cellRef,
    hasChild: false
  };
}

/**
 * Exports.
 */
export { getMarkdownHeading };
