// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { INotebookHeading } from '../../utils/headings';
import { isHeadingFiltered } from './is_heading_filtered';

/**
 * Appends a collapsible notebook heading to a list of headings.
 *
 * @private
 * @param headings - list of notebook headings
 * @param heading - rendered heading
 * @param prev - previous heading
 * @param collapseLevel - collapse level
 * @param tags - filter tags
 * @param collapsed - boolean indicating whether a heading is collapsed
 * @returns result tuple
 */
function appendCollapsibleHeading(
  headings: INotebookHeading[],
  heading: INotebookHeading,
  prev: INotebookHeading | null,
  collapseLevel: number,
  tags: string[],
  collapsed: boolean
): [INotebookHeading[], INotebookHeading | null, number] {
  const len = headings.length;
  if (!isHeadingFiltered(heading, tags)) {
    // If the previous heading is a higher level heading, update the heading to note that it has a child heading...
    if (prev && prev.type === 'header' && prev.level < heading.level) {
      for (let j = len - 1; j >= 0; j--) {
        if (headings[j] === prev) {
          // TODO: can a heading be the child of multiple headings? If not, we can `break` here upon finding a parent heading, so we don't traverse the entire heading list...
          headings[j].hasChild = true;
        }
      }
    }
    // If the collapse level doesn't include the heading, or, if there is no collapsing, add to headings and adjust the collapse level...
    if (collapseLevel >= heading.level || collapseLevel < 0) {
      headings.push(heading);
      collapseLevel = collapsed ? heading.level : -1;
    }
    prev = heading;
  } else if (prev && heading.level <= prev.level) {
    // If the heading is filtered out and has a lower level previous heading, determine if the heading has a parent...
    let parent = false;
    let k = len - 1;
    for (; k >= 0; k--) {
      if (headings[k].level < heading.level) {
        prev = headings[k];
        parent = true;
        break;
      }
    }
    // If there is no parent, reset collapsing...
    if (parent) {
      const isCollapsed = headings[k + 1].cellRef.model.metadata.get(
        'toc-hr-collapsed'
      ) as boolean;
      collapseLevel = isCollapsed ? headings[k + 1].level : -1;
    } else {
      prev = null;
      collapseLevel = -1;
    }
  }
  return [headings, prev, collapseLevel];
}

/**
 * Exports.
 */
export { appendCollapsibleHeading };
