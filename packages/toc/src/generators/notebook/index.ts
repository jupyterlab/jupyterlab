// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ISanitizer } from '@jupyterlab/apputils';
import {
  Cell,
  CodeCell,
  CodeCellModel,
  ICellModel,
  MARKDOWN_HEADING_COLLAPSED,
  MarkdownCell
} from '@jupyterlab/cells';
import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { TableOfContentsRegistry as Registry } from '../../registry';
import { TableOfContents } from '../../toc';
import { INotebookHeading } from '../../utils/headings';
import { isDOM } from '../../utils/is_dom';
import { isMarkdown } from '../../utils/is_markdown';
import { appendHeading } from './append_heading';
import { appendMarkdownHeading } from './append_markdown_heading';
import { getCodeCellHeading } from './get_code_cell_heading';
import { getLastHeadingLevel } from './get_last_heading_level';
import { getMarkdownHeadings } from './get_markdown_heading';
import { getRenderedHTMLHeadings } from './get_rendered_html_heading';
import { OptionsManager } from './options_manager';
import { render } from './render';
import { toolbar } from './toolbar_generator';
import { ISettingRegistry } from '@jupyterlab/settingregistry';

/**
 * Returns a ToC generator for notebooks.
 *
 * @private
 * @param tracker - notebook tracker
 * @param widget - table of contents widget
 * @param sanitizer - HTML sanitizer
 * @param translator - Language translator
 * @param settings - advanced settings for toc extension
 * @returns ToC generator capable of parsing notebooks
 */
function createNotebookGenerator(
  tracker: INotebookTracker,
  widget: TableOfContents,
  sanitizer: ISanitizer,
  translator?: ITranslator,
  settings?: ISettingRegistry.ISettings
): Registry.IGenerator<NotebookPanel> {
  let numberingH1 = true;
  let includeOutput = true;
  let syncCollapseState = false;
  if (settings) {
    numberingH1 = settings.composite.numberingH1 as boolean;
    includeOutput = settings.composite.includeOutput as boolean;
    syncCollapseState = settings.composite.syncCollapseState as boolean;
  }
  const options = new OptionsManager(widget, tracker, {
    numbering: false,
    numberingH1: numberingH1,
    includeOutput: includeOutput,
    syncCollapseState: syncCollapseState,
    sanitizer: sanitizer,
    translator: translator || nullTranslator
  });
  if (settings) {
    settings.changed.connect(() => {
      options.numberingH1 = settings.composite.numberingH1 as boolean;
      options.includeOutput = settings.composite.includeOutput as boolean;
      options.syncCollapseState = settings.composite
        .syncCollapseState as boolean;
    });
  }
  tracker.activeCellChanged.connect(
    (sender: INotebookTracker, args: Cell<ICellModel>) => {
      widget.update();
    }
  );
  return {
    tracker,
    usesLatex: true,
    options: options,
    toolbarGenerator: generateToolbar,
    itemRenderer: renderItem,
    generate: generate,
    collapseChanged: options.collapseChanged
  };

  /**
   * Returns a toolbar generator.
   *
   * @private
   * @returns toolbar generator
   */
  function generateToolbar() {
    return toolbar(options, tracker);
  }

  /**
   * Renders a table of contents item.
   *
   * @private
   * @param item - heading to render
   * @param toc - list of all headers to render
   * @returns rendered item
   */
  function renderItem(item: INotebookHeading, toc: INotebookHeading[] = []) {
    return render(options, tracker, item, toc);
  }

  /**
   * Generates a table of contents.
   *
   * @private
   * @param panel - notebook widget
   * @returns a list of headings
   */
  function generate(panel: NotebookPanel): INotebookHeading[] {
    let headings: INotebookHeading[] = [];
    let collapseLevel = -1;
    let dict = {};

    // Initialize a variable for keeping track of the previous heading:
    let prev: INotebookHeading | null = null;

    // Generate headings by iterating through all notebook cells...
    for (let i = 0; i < panel.content.widgets.length; i++) {
      let cell: Cell = panel.content.widgets[i];
      let model = cell.model;
      let cellCollapseMetadata = options.syncCollapseState
        ? MARKDOWN_HEADING_COLLAPSED
        : 'toc-hr-collapsed';
      let collapsed = model.metadata.get(cellCollapseMetadata) as boolean;
      collapsed = collapsed || false;

      if (model.type === 'code') {
        if (!widget || (widget && options.showCode)) {
          const onClick = (line: number) => {
            return () => {
              panel.content.activeCellIndex = i;
              cell.node.scrollIntoView();
            };
          };
          let count = (cell as CodeCell).model.executionCount as number | null;
          let executionCount = count !== null ? '[' + count + ']: ' : '[ ]: ';
          let heading = getCodeCellHeading(
            (model as CodeCellModel).value.text,
            onClick,
            executionCount,
            getLastHeadingLevel(headings),
            cell,
            i
          );
          [headings, prev] = appendHeading(
            headings,
            heading,
            prev,
            collapseLevel,
            options.filtered
          );
        }
        if (options.includeOutput) {
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
            let htmlHeadings = getRenderedHTMLHeadings(
              (cell as CodeCell).outputArea.widgets[j].node,
              onClick,
              sanitizer,
              dict,
              getLastHeadingLevel(headings),
              options.numbering,
              options.numberingH1,
              cell,
              i
            );
            for (const heading of htmlHeadings) {
              [headings, prev, collapseLevel] = appendMarkdownHeading(
                heading,
                headings,
                prev,
                collapseLevel,
                options.filtered,
                collapsed,
                options.showMarkdown,
                cellCollapseMetadata
              );
            }
          }
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
          const htmlHeadings = getRenderedHTMLHeadings(
            cell.node,
            onClick,
            sanitizer,
            dict,
            lastLevel,
            options.numbering,
            options.numberingH1,
            cell,
            i
          );
          for (heading of htmlHeadings) {
            [headings, prev, collapseLevel] = appendMarkdownHeading(
              heading,
              headings,
              prev,
              collapseLevel,
              options.filtered,
              collapsed,
              options.showMarkdown,
              cellCollapseMetadata
            );
          }
          // If not rendered, generate ToC items from the cell text...
        } else {
          const onClick = (line: number) => {
            return () => {
              panel.content.activeCellIndex = i;
              cell.node.scrollIntoView();
            };
          };
          const markdownHeadings = getMarkdownHeadings(
            model!.value.text,
            onClick,
            dict,
            lastLevel,
            cell,
            i
          );
          for (heading of markdownHeadings) {
            [headings, prev, collapseLevel] = appendMarkdownHeading(
              heading,
              headings,
              prev,
              collapseLevel,
              options.filtered,
              collapsed,
              options.showMarkdown,
              cellCollapseMetadata
            );
          }
        }
      }
    }
    return headings;
  }
}

/**
 * Exports.
 */
export { createNotebookGenerator };
