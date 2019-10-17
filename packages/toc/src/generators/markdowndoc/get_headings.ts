// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { INumberingDictionary } from '../../utils/numbering_dictionary';

import { INumberedHeading } from '../../utils/headings';

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
 * Parses a provided string and returns a list of headings.
 *
 * @private
 * @param text - input text
 * @param onClick - "click" handler
 * @param dict - numbering dictionary
 * @returns list of headings
 */
function getHeadings(
  text: string,
  onClick: onClickFactory,
  dict: INumberingDictionary
): INumberedHeading[] {
  // Split the text into lines.
  const lines = text.split('\n');
  let headings: INumberedHeading[] = [];

  let inCodeBlock = false;

  // Iterate over the lines to get the header level and
  // the text for the line.
  lines.forEach((line, idx) => {
    // Don't check for Markdown headings if we
    // are in a code block (demarcated by backticks).
    if (line.indexOf('```') === 0) {
      inCodeBlock = !inCodeBlock;
    }
    if (inCodeBlock) {
      return;
    }
    // Attempt to parse a heading:
    const heading = parseHeading(
      line + (lines[idx + 1] ? '\n' + lines[idx + 1] : '')
    ); // append the next line to capture alternative style Markdown headings
    if (heading) {
      headings.push({
        text: heading.text,
        numbering: generateNumbering(dict, heading.level),
        level: heading.level,
        onClick: onClick(idx)
      });
      return;
    }
  });
  return headings;
}

/**
 * Exports.
 */
export { getHeadings };
