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
export function appendHeading(
  headings: INotebookHeading[],
  heading: INotebookHeading,
  prev: INotebookHeading | null,
  collapseLevel: number,
  tags: string[]
): [INotebookHeading[], INotebookHeading | null] {
  if (heading && !isHeadingFiltered(heading, tags) && heading.text) {
    // Determine whether this heading is a child of a "header" notebook heading...
    for (let j = headings.length - 1; j >= 0; j--) {
      if (prev?.type === 'header' && headings[j] === prev) {
        // TODO: can a heading be the child of multiple headings? If not, we can `break` here upon finding a parent heading, so we don't traverse the entire heading list...
        headings[j].hasChild = true;
      }
      if (headings[j].hasChild) {
        headings[j].isRunning = Math.max(
          headings[j].isRunning,
          heading.isRunning
        );
        break;
      }
    }
    if (collapseLevel < 0) {
      headings.push(heading);
    }
    prev = heading;
  }
  return [headings, prev];
}
