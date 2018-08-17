// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import { ISanitizer } from '@jupyterlab/apputils';

import { CodeCell, CodeCellModel, MarkdownCell, Cell } from '@jupyterlab/cells';

import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';

import { each } from '@phosphor/algorithm';

import { notebookItemRenderer } from './itemrenderer';

import { notebookGeneratorToolbar } from './toolbargenerator';

import { TableOfContentsRegistry } from '../../registry';

import { TableOfContents } from '../../toc';

import { NotebookGeneratorOptionsManager } from './optionsmanager';

import {
  getRenderedHTMLHeadings,
  getMarkdownHeadings,
  isDOM,
  isMarkdown,
  INotebookHeading
} from '../shared';

/**
 * Create a TOC generator for notebooks.
 *
 * @param tracker: A notebook tracker.
 *
 * @returns A TOC generator that can parse notebooks.
 */
export function createNotebookGenerator(
  tracker: INotebookTracker,
  sanitizer: ISanitizer,
  widget: TableOfContents
): TableOfContentsRegistry.IGenerator<NotebookPanel> {
  const options = new NotebookGeneratorOptionsManager(widget, tracker, {
    needNumbering: true,
    sanitizer: sanitizer
  });
  return {
    tracker,
    usesLatex: true,
    options: options,
    toolbarGenerator: () => {
      return notebookGeneratorToolbar(options, tracker);
    },
    itemRenderer: (item: INotebookHeading) => {
      return notebookItemRenderer(options, item);
    },
    generate: panel => {
      let headings: INotebookHeading[] = [];
      let numberingDict: { [level: number]: number } = {};
      let currentCollapseLevel = -1;
      let prevHeading: INotebookHeading | null = null;
      each(panel.content.widgets, cell => {
        let collapsed = cell!.model.metadata.get('toc-hr-collapsed') as boolean;
        collapsed = collapsed != undefined ? collapsed : false;
        let model = cell.model;
        // Only parse markdown cells or code cell outputs
        if (model.type === 'code') {
          let executionCountNumber = (cell as CodeCell).model
            .executionCount as number;
          let executionCount =
            executionCountNumber != null
              ? '[' + executionCountNumber + ']: '
              : '[ ]: ';
          // Iterate over the outputs, and parse them if they
          // are rendered markdown or HTML.
          let showCode = true;
          if (widget) {
            showCode = options.showCode;
          }
          if (showCode) {
            let text = (model as CodeCellModel).value.text;
            const onClickFactory = (line: number) => {
              return () => {
                cell.node.scrollIntoView();
                if (tracker && tracker.currentWidget) {
                  let cells = tracker.currentWidget.model.cells;
                  for (let i = 0; i < cells.length; i++) {
                    let currCell = tracker.currentWidget.content.widgets[
                      i
                    ] as Cell;
                    if (cell === currCell) {
                      tracker.currentWidget.content.activeCellIndex = i;
                    }
                  }
                }
              };
            };
            let lastLevel = Private.getLastLevel(headings);
            let renderedHeadings = Private.getCodeCells(
              text,
              onClickFactory,
              numberingDict,
              executionCount,
              lastLevel,
              cell
            );
            if (
              currentCollapseLevel < 0 &&
              !Private.headingIsFilteredOut(
                renderedHeadings[0],
                options.filtered
              )
            ) {
              headings = headings.concat(renderedHeadings);
            }
            if (
              !Private.headingIsFilteredOut(
                renderedHeadings[0],
                options.filtered
              )
            ) {
              prevHeading = renderedHeadings[0];
            }
          }
          for (let i = 0; i < (model as CodeCellModel).outputs.length; i++) {
            // Filter out the outputs that are not rendered HTML
            // (that is, markdown, vdom, or text/html)
            const outputModel = (model as CodeCellModel).outputs.get(i);
            const dataTypes = Object.keys(outputModel.data);
            const htmlData = dataTypes.filter(t => isMarkdown(t) || isDOM(t));
            if (!htmlData.length) {
              continue;
            }
            // If the output has rendered HTML, parse it for headers.
            const outputWidget = (cell as CodeCell).outputArea.widgets[i];
            const onClickFactory = (el: Element) => {
              return () => {
                el.scrollIntoView();
                if (tracker && tracker.currentWidget) {
                  let cells = tracker.currentWidget.model.cells;
                  for (let i = 0; i < cells.length; i++) {
                    let currCell = tracker.currentWidget.content.widgets[
                      i
                    ] as Cell;
                    if (cell === currCell) {
                      tracker.currentWidget.content.activeCellIndex = i;
                    }
                  }
                }
              };
            };
            let lastLevel = Private.getLastLevel(headings);
            let numbering = options.numbering;
            let renderedHeadings = getRenderedHTMLHeadings(
              outputWidget.node,
              onClickFactory,
              sanitizer,
              numberingDict,
              lastLevel,
              numbering,
              cell
            );
            let renderedHeading = renderedHeadings[0];
            if (renderedHeading && renderedHeading.type === 'markdown') {
              if (
                currentCollapseLevel < 0 &&
                !Private.headingIsFilteredOut(
                  renderedHeadings[0],
                  options.filtered
                )
              ) {
                headings = headings.concat(renderedHeadings);
              }
            } else if (renderedHeading && renderedHeading.type === 'header') {
              if (
                prevHeading &&
                prevHeading.type === 'header' &&
                prevHeading.level >= renderedHeading.level
              ) {
                prevHeading.hasChild = false;
              }
              if (
                (currentCollapseLevel >= renderedHeading.level ||
                  currentCollapseLevel < 0) &&
                !Private.headingIsFilteredOut(
                  renderedHeadings[0],
                  options.filtered
                )
              ) {
                headings = headings.concat(renderedHeadings);
                if (collapsed) {
                  currentCollapseLevel = renderedHeading.level;
                } else {
                  currentCollapseLevel = -1;
                }
              } else {
                if (
                  Private.headingIsFilteredOut(
                    renderedHeadings[0],
                    options.filtered
                  )
                ) {
                  currentCollapseLevel = -1;
                }
              }
            }
            if (
              !Private.headingIsFilteredOut(
                renderedHeadings[0],
                options.filtered
              )
            ) {
              prevHeading = renderedHeading;
            }
          }
        } else if (model.type === 'markdown') {
          // If the cell is rendered, generate the ToC items from
          // the HTML. If it is not rendered, generate them from
          // the text of the cell.
          if (
            (cell as MarkdownCell).rendered &&
            !(cell as MarkdownCell).inputHidden
          ) {
            const onClickFactory = (el: Element) => {
              return () => {
                if (!(cell as MarkdownCell).rendered) {
                  cell.node.scrollIntoView();
                } else {
                  el.scrollIntoView();
                  if (tracker && tracker.currentWidget) {
                    let cells = tracker.currentWidget.model.cells;
                    for (let i = 0; i < cells.length; i++) {
                      let currCell = tracker.currentWidget.content.widgets[
                        i
                      ] as Cell;
                      if (cell === currCell) {
                        tracker.currentWidget.content.activeCellIndex = i;
                      }
                    }
                  }
                }
              };
            };
            let numbering = options.numbering;
            let lastLevel = Private.getLastLevel(headings);
            let renderedHeadings = getRenderedHTMLHeadings(
              cell.node,
              onClickFactory,
              sanitizer,
              numberingDict,
              lastLevel,
              numbering,
              cell
            );
            let renderedHeading = renderedHeadings[0];
            if (renderedHeading && renderedHeading.type === 'markdown') {
              if (
                currentCollapseLevel < 0 &&
                !Private.headingIsFilteredOut(
                  renderedHeadings[0],
                  options.filtered
                )
              ) {
                headings = headings.concat(renderedHeadings);
              }
            } else if (renderedHeading && renderedHeading.type === 'header') {
              if (
                prevHeading &&
                prevHeading.type === 'header' &&
                prevHeading.level >= renderedHeading.level
              ) {
                prevHeading.hasChild = false;
              }
              if (
                (currentCollapseLevel >= renderedHeading.level ||
                  currentCollapseLevel < 0) &&
                !Private.headingIsFilteredOut(
                  renderedHeadings[0],
                  options.filtered
                )
              ) {
                headings = headings.concat(renderedHeadings);
                if (collapsed) {
                  currentCollapseLevel = renderedHeading.level;
                } else {
                  currentCollapseLevel = -1;
                }
              } else {
                if (
                  Private.headingIsFilteredOut(
                    renderedHeadings[0],
                    options.filtered
                  )
                ) {
                  currentCollapseLevel = -1;
                }
              }
            }
            if (
              !Private.headingIsFilteredOut(
                renderedHeadings[0],
                options.filtered
              )
            ) {
              prevHeading = renderedHeading;
            }
          } else {
            const onClickFactory = (line: number) => {
              return () => {
                cell.node.scrollIntoView();
                if (!(cell as MarkdownCell).rendered) {
                  cell.editor.setCursorPosition({ line, column: 0 });
                }
                if (tracker && tracker.currentWidget) {
                  let cells = tracker.currentWidget.model.cells;
                  for (let i = 0; i < cells.length; i++) {
                    let currCell = tracker.currentWidget.content.widgets[
                      i
                    ] as Cell;
                    if (cell === currCell) {
                      tracker.currentWidget.content.activeCellIndex = i;
                    }
                  }
                }
              };
            };
            let lastLevel = Private.getLastLevel(headings);
            let renderedHeadings = getMarkdownHeadings(
              model.value.text,
              onClickFactory,
              numberingDict,
              lastLevel,
              cell
            );
            let renderedHeading = renderedHeadings[0];
            if (renderedHeading && renderedHeading.type === 'markdown') {
              if (
                currentCollapseLevel < 0 &&
                !Private.headingIsFilteredOut(
                  renderedHeadings[0],
                  options.filtered
                )
              ) {
                headings = headings.concat(renderedHeadings);
              }
            } else if (renderedHeading && renderedHeading.type === 'header') {
              if (
                prevHeading &&
                prevHeading.type === 'header' &&
                prevHeading.level >= renderedHeading.level
              ) {
                prevHeading.hasChild = false;
              }
              if (
                (currentCollapseLevel >= renderedHeading.level ||
                  currentCollapseLevel < 0) &&
                !Private.headingIsFilteredOut(
                  renderedHeadings[0],
                  options.filtered
                )
              ) {
                headings = headings.concat(renderedHeadings);
                if (collapsed) {
                  currentCollapseLevel = renderedHeading.level;
                } else {
                  currentCollapseLevel = -1;
                }
              } else {
                if (
                  Private.headingIsFilteredOut(
                    renderedHeadings[0],
                    options.filtered
                  )
                ) {
                  currentCollapseLevel = -1;
                }
              }
            }
          }
        }
      });
      return headings;
    }
  };
}

/**
 * A private namespace for miscellaneous things.
 */
namespace Private {
  export function headingIsFilteredOut(
    heading: INotebookHeading,
    tags: string[]
  ) {
    if (tags.length === 0) {
      return false;
    }
    if (heading && heading.cellRef) {
      let cellMetadata = heading.cellRef.model.metadata;
      let cellTagsData = cellMetadata.get('tags') as string[];
      if (cellTagsData) {
        for (var j = 0; j < cellTagsData.length; j++) {
          let name = cellTagsData[j];
          for (var k = 0; k < tags.length; k++) {
            if (tags[k] === name) {
              return false;
            }
          }
        }
        return true;
      }
      return true;
    }
    return true;
  }

  export function getLastLevel(headings: INotebookHeading[]) {
    if (headings.length > 0) {
      let location = headings.length - 1;
      while (location >= 0) {
        if (headings[location].type === 'header') {
          return headings[location].level;
        }
        location = location - 1;
      }
    }
    return 0;
  }

  export function getCodeCells(
    text: string,
    onClickFactory: (line: number) => (() => void),
    numberingDict: any,
    executionCount: string,
    lastLevel: number,
    cellRef: Cell
  ): INotebookHeading[] {
    let headings: INotebookHeading[] = [];
    if (text) {
      const lines = text.split('\n');
      let headingText = '';
      let numLines = Math.min(lines.length, 10);
      for (let i = 0; i < numLines - 1; i++) {
        headingText = headingText + lines[i] + '\n';
      }
      headingText = headingText + lines[numLines - 1];
      const onClick = onClickFactory(0);
      const level = lastLevel + 1;
      headings.push({
        text: headingText,
        level,
        onClick,
        type: 'code',
        prompt: executionCount,
        cellRef: cellRef,
        hasChild: false
      });
    }
    return headings;
  }
}
