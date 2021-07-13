// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { INotebookHeading } from '../../utils/headings';
import { appendCollapsibleHeading } from './append_collapsible_heading';
import { appendHeading } from './append_heading';

/**
 * Appends a Markdown notebook heading to a list of headings.
 *
 * @private
 * @param headings - list of notebook headings
 * @param heading - rendered heading
 * @param prev - previous heading
 * @param collapseLevel - collapse level
 * @param tags - filter tags
 * @param collapsed - boolean indicating whether a heading is collapsed
 * @param showMarkdown - boolean indicating whether to show Markdown previews
 * @param cellCollapseMetadata - indicates which metadata string to use based on the cellSyncSetting
 * @returns result tuple
 */
function appendMarkdownHeading(
  heading: INotebookHeading | undefined,
  headings: INotebookHeading[],
  prev: INotebookHeading | null,
  collapseLevel: number,
  tags: string[],
  collapsed: boolean,
  showMarkdown: boolean,
  cellCollapseMetadata: string
): [INotebookHeading[], INotebookHeading | null, number] {
  if (heading && heading.type === 'markdown' && showMarkdown) {
    // Append a Markdown preview heading:
    [headings, prev] = appendHeading(
      headings,
      heading,
      prev,
      collapseLevel,
      tags
    );
  } else if (heading && heading.type === 'header') {
    [headings, prev, collapseLevel] = appendCollapsibleHeading(
      headings,
      heading,
      prev,
      collapseLevel,
      tags,
      collapsed,
      cellCollapseMetadata
    );
  }
  return [headings, prev, collapseLevel];
}

/**
 * Exports.
 */
export { appendMarkdownHeading };
