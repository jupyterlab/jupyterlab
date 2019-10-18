// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ISanitizer } from '@jupyterlab/apputils';
import { CodeCell, CodeCellModel, MarkdownCell, Cell } from '@jupyterlab/cells';
import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';
import { Registry } from '../../registry';
import { TableOfContents } from '../../toc';
import { isMarkdown } from '../../utils/is_markdown';
import { isDOM } from '../../utils/is_dom';
import { INotebookHeading } from '../../utils/headings';
import { OptionsManager } from './options_manager';
import { getCodeCellHeading } from './get_code_cell_heading';
import { isHeadingFiltered } from './is_heading_filtered';
import { getLastHeadingLevel } from './get_last_heading_level';
import { getMarkdownHeading } from './get_markdown_heading';
import { getRenderedHTMLHeading } from './get_rendered_html_heading';
import { appendCollapsibleHeading } from './append_collapsible_heading';
import { render } from './render';
import { toolbar } from './toolbar_generator';

/**
 * Returns a ToC generator for notebooks.
 *
 * @private
 * @param tracker - file editor tracker
 * @param widget - table of contents widget
 * @param sanitizer - HTML sanitizer
 * @returns ToC generator capable of parsing notebooks
 */
function createNotebookGenerator(
  tracker: INotebookTracker,
  widget: TableOfContents,
  sanitizer: ISanitizer
): Registry.IGenerator<NotebookPanel> {
  const options = new OptionsManager(widget, tracker, {
    numbering: false,
    sanitizer: sanitizer
  });
  return {
    tracker,
    usesLatex: true,
    options: options,
    toolbarGenerator: () => {
      return toolbar(options, tracker);
    },
    itemRenderer: (item: INotebookHeading) => {
      return render(options, tracker, item);
    },
    generate: panel => {
      let headings: INotebookHeading[] = [];
      let collapseLevel = -1;
      let dict = {};

      // Initialize a variable for keeping track of the previous heading:
      let prev: INotebookHeading | null = null;

      // Generate headings by iterating through all notebook cells...
      for (let i = 0; i < panel.content.widgets.length; i++) {
        let cell: Cell = panel.content.widgets[i];
        let model = cell.model;

        let collapsed = cell.model.metadata.get('toc-hr-collapsed') as boolean;
        collapsed = collapsed || false;

        if (model.type === 'code') {
          if (!widget || (widget && options.showCode)) {
            const onClick = (line: number) => {
              return () => {
                panel.content.activeCellIndex = i;
                cell.node.scrollIntoView();
              };
            };
            let count = (cell as CodeCell).model.executionCount as
              | number
              | null;
            let executionCount = count !== null ? '[' + count + ']: ' : '[ ]: ';
            let heading = getCodeCellHeading(
              (model as CodeCellModel).value.text,
              onClick,
              executionCount,
              getLastHeadingLevel(headings),
              cell
            );
            [headings, prev] = Private.addMDOrCode(
              headings,
              heading,
              prev,
              collapseLevel,
              options.filtered
            );
          }
          // Iterate over the code cell outputs to check for Markdown or HTML from which we can generate ToC headings...
          for (let j = 0; j < (model as CodeCellModel).outputs.length; j++) {
            const m = (model as CodeCellModel).outputs.get(j);

            let dtypes = Object.keys(m.data);
            dtypes = dtypes.filter(t => isMarkdown(t) || isDOM(t));
            if (!dtypes.length) {
              continue;
            }
            const onClick = (el: Element) => {
              return () => {
                panel.content.activeCellIndex = i;
                panel.content.mode = 'command';
                el.scrollIntoView();
              };
            };
            let heading = getRenderedHTMLHeading(
              (cell as CodeCell).outputArea.widgets[j].node,
              onClick,
              sanitizer,
              dict,
              getLastHeadingLevel(headings),
              options.numbering,
              cell
            );
            [headings, prev, collapseLevel] = Private.processMD(
              heading,
              options.showMarkdown,
              headings,
              prev,
              collapseLevel,
              options.filtered,
              collapsed
            );
          }
          continue;
        }
        if (model.type === 'markdown') {
          let mcell = cell as MarkdownCell;
          let heading: INotebookHeading | undefined;
          let lastLevel = getLastHeadingLevel(headings);

          // If the cell is rendered, generate the ToC items from the HTML...
          if (mcell.rendered && !mcell.inputHidden) {
            const onClick = (el: Element) => {
              return () => {
                if (!mcell.rendered) {
                  panel.content.activeCellIndex = i;
                  el.scrollIntoView();
                } else {
                  panel.content.mode = 'command';
                  cell.node.scrollIntoView();
                  panel.content.activeCellIndex = i;
                }
              };
            };
            heading = getRenderedHTMLHeading(
              cell.node,
              onClick,
              sanitizer,
              dict,
              lastLevel,
              options.numbering,
              cell
            );
            // If not rendered, generate ToC items from the cell text...
          } else {
            const onClick = (line: number) => {
              return () => {
                panel.content.activeCellIndex = i;
                cell.node.scrollIntoView();
              };
            };
            heading = getMarkdownHeading(
              model!.value.text,
              onClick,
              dict,
              lastLevel,
              cell
            );
          }
          [headings, prev, collapseLevel] = Private.processMD(
            heading,
            options.showMarkdown,
            headings,
            prev,
            collapseLevel,
            options.filtered,
            collapsed
          );
        }
      }
      return headings;
    }
  };
}

namespace Private {
  export function processMD(
    heading: INotebookHeading | undefined,
    showMarkdown: boolean,
    headings: INotebookHeading[],
    prevHeading: INotebookHeading | null,
    collapseLevel: number,
    filtered: string[],
    collapsed: boolean
  ): [INotebookHeading[], INotebookHeading | null, number] {
    // If the heading is MD and MD is shown, add to headings
    if (heading && heading.type === 'markdown' && showMarkdown) {
      [headings, prevHeading] = Private.addMDOrCode(
        headings,
        heading,
        prevHeading,
        collapseLevel,
        filtered
      );
      // Otherwise, if the heading is a header, add to headings
    } else if (heading && heading.type === 'header') {
      [headings, prevHeading, collapseLevel] = appendCollapsibleHeading(
        headings,
        heading,
        prevHeading,
        collapseLevel,
        filtered,
        collapsed
      );
    }
    return [headings, prevHeading, collapseLevel];
  }

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
  export function addMDOrCode(
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
}

/**
 * Exports.
 */
export { createNotebookGenerator };
