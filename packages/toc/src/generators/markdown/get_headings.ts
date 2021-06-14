// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { generateNumbering } from '../../utils/generate_numbering';
import { INumberedHeading } from '../../utils/headings';
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
 * Parses a provided string and returns a list of headings.
 *
 * @private
 * @param text - input text
 * @param onClick - callback which returns a "click" handler
 * @param dict - numbering dictionary
 * @param numberingH1 - whether first level header should be numbered
 * @returns list of headings
 */
function getHeadings(
  text: string,
  onClick: onClickFactory,
  dict: INumberingDictionary,
  numberingH1: boolean
): INumberedHeading[] {
  // Split the text into lines:
  const lines = text.split('\n');

  // Iterate over the lines to get the header level and text for each line:
  let headings: INumberedHeading[] = [];
  let FLG;
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Don't check for Markdown headings if in a code block:
    if (line.indexOf('```') === 0) {
      FLG = !FLG;
    }
    if (FLG) {
      continue;
    }
    line += lines[i + 1] ? '\n' + lines[i + 1] : '';
    const heading = parseHeading(line); // append the next line to capture alternative style Markdown headings
    if (heading) {
      let level = heading.level;
      if (!numberingH1) {
        level -= 1;
      }
      headings.push({
        text: heading.text,
        numbering: generateNumbering(dict, level),
        level: heading.level,
        onClick: onClick(i)
      });
    }
  }
  return headings;
}

/**
 * Exports.
 */
export { getHeadings };
