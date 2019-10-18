// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { INotebookHeading } from '../../utils/headings';
import { isHeadingFiltered } from './is_heading_filtered';

/**
 * Appends a notebook heading to a list of headings.
 *
 * @private
 * @param headings - list of notebook headings
 * @param heading - rendered heading
 * @param prev - previous heading
 * @param collapseLevel - collapse level
 * @param tags - filter tags
 * @returns result tuple
 */
function appendHeading(
  headings: INotebookHeading[],
  heading: INotebookHeading,
  prev: INotebookHeading | null,
  collapseLevel: number,
  tags: string[]
): [INotebookHeading[], INotebookHeading | null] {
  if (heading && !isHeadingFiltered(heading, tags) && heading.text) {
    if (prev && prev.type === 'header') {
      for (let j = headings.length - 1; j >= 0; j--) {
        if (headings[j] === prev) {
          headings[j].hasChild = true;
        }
      }
    }
    if (collapseLevel < 0) {
      headings.push(heading);
    }
    prev = heading;
  }
  return [headings, prev];
}

/**
 * Exports.
 */
export { appendHeading };
