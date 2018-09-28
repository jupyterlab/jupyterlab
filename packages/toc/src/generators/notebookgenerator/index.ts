// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ISanitizer } from '@jupyterlab/apputils';

import { CodeCell, CodeCellModel, MarkdownCell, Cell } from '@jupyterlab/cells';

import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';

import { notebookItemRenderer } from './itemrenderer';

import { notebookGeneratorToolbar } from './toolbargenerator';

import { TableOfContentsRegistry } from '../../registry';

import { TableOfContents } from '../../toc';

import { NotebookGeneratorOptionsManager } from './optionsmanager';

import { INotebookHeading } from './heading';

import {
  generateNumbering,
  isDOM,
  isMarkdown,
  sanitizerOptions
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
  // Create a option manager to manage user settings
  const options = new NotebookGeneratorOptionsManager(widget, tracker, {
    needsNumbering: false,
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

      // Keep track of the previous heading that is shown in TOC, used for
      // determine whether one header has child
      let prevHeading: INotebookHeading | null = null;
      for (let i = 0; i < panel.content.widgets.length; i++) {
        let cell: Cell = panel.content.widgets[i];
        let collapsed = false;
        collapsed = cell.model.metadata.get('toc-hr-collapsed') as boolean;
        collapsed = collapsed !== undefined ? collapsed : false;
        let model = cell.model;
        if (model.type === 'code') {
          // Get the execution count prompt for code cells
          let executionCountNumber = (cell as CodeCell).model.executionCount as
            | number
            | null;
          let executionCount =
            executionCountNumber !== null
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
              // Activate the corresponding cell if user click on the TOC entry
              return () => {
                panel.content.activeCellIndex = i;
                cell.node.scrollIntoView();
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

            // Do not render the code cell in TOC if it is filtered out by tags
            if (
              currentCollapseLevel < 0 &&
              !Private.headingIsFilteredOut(
                renderedHeadings[0],
                options.filtered
              )
            ) {
              headings = headings.concat(renderedHeadings);
            }

            // Keep a copy of the TOC entry in prevHeadings
            if (
              !Private.headingIsFilteredOut(
                renderedHeadings[0],
                options.filtered
              )
            ) {
              prevHeading = renderedHeadings[0];
            }
          }
          for (let j = 0; j < (model as CodeCellModel).outputs.length; j++) {
            // Filter out the outputs that are not rendered HTML
            // (that is, markdown, vdom, or text/html)
            const outputModel = (model as CodeCellModel).outputs.get(j);
            const dataTypes = Object.keys(outputModel.data);
            const htmlData = dataTypes.filter(t => isMarkdown(t) || isDOM(t));
            if (!htmlData.length) {
              continue;
            }
            // If the output has rendered HTML, parse it for headers.
            const outputWidget = (cell as CodeCell).outputArea.widgets[j];
            const onClickFactory = (el: Element) => {
              return () => {
                panel.content.activeCellIndex = i;
                panel.content.mode = 'command';
                el.scrollIntoView();
              };
            };
            let lastLevel = Private.getLastLevel(headings);
            let numbering = options.numbering;
            let renderedHeading = Private.getRenderedHTMLHeading(
              outputWidget.node,
              onClickFactory,
              sanitizer,
              numberingDict,
              lastLevel,
              numbering,
              cell
            );
            if (renderedHeading && renderedHeading.type === 'markdown') {
              // Do not put the item in TOC if its filtered out by tags
              if (
                currentCollapseLevel < 0 &&
                !Private.headingIsFilteredOut(renderedHeading, options.filtered)
              ) {
                headings.push(renderedHeading);
              }
            } else if (renderedHeading && renderedHeading.type === 'header') {
              // Determine whether the heading has children
              if (
                prevHeading &&
                prevHeading.type === 'header' &&
                prevHeading.level >= renderedHeading.level
              ) {
                prevHeading.hasChild = false;
              }
              // Do not put the item in TOC if its header is collapsed
              // or filtered out by tags
              if (
                (currentCollapseLevel >= renderedHeading.level ||
                  currentCollapseLevel < 0) &&
                !Private.headingIsFilteredOut(renderedHeading, options.filtered)
              ) {
                headings.push(renderedHeading);
                if (collapsed) {
                  currentCollapseLevel = renderedHeading.level;
                } else {
                  currentCollapseLevel = -1;
                }
              } else {
                if (
                  Private.headingIsFilteredOut(
                    renderedHeading,
                    options.filtered
                  )
                ) {
                  currentCollapseLevel = -1;
                }
              }
            }
            if (
              renderedHeading &&
              !Private.headingIsFilteredOut(renderedHeading, options.filtered)
            ) {
              if (
                !(renderedHeading.type === 'markdown') ||
                options.showMarkdown
              ) {
                prevHeading = renderedHeading;
              }
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
                  panel.content.activeCellIndex = i;
                  el.scrollIntoView();
                } else {
                  cell.node.scrollIntoView();
                  panel.content.activeCellIndex = i;
                }
              };
            };
            let numbering = options.numbering;
            let lastLevel = Private.getLastLevel(headings);
            let renderedHeading: INotebookHeading | undefined;
            renderedHeading = Private.getRenderedHTMLHeading(
              cell.node,
              onClickFactory,
              sanitizer,
              numberingDict,
              lastLevel,
              numbering,
              cell
            );
            if (renderedHeading && renderedHeading.type === 'markdown') {
              // Do not put the item in TOC if its filtered out by tags
              if (
                currentCollapseLevel < 0 &&
                !Private.headingIsFilteredOut(renderedHeading, options.filtered)
              ) {
                headings.push(renderedHeading);
              }
            } else if (
              (renderedHeading && renderedHeading.type === 'header') ||
              !renderedHeading
            ) {
              // Determine whether the heading has children
              if (
                prevHeading &&
                prevHeading.type === 'header' &&
                (renderedHeading && prevHeading.level >= renderedHeading.level)
              ) {
                prevHeading.hasChild = false;
              }
              // Do not put the item in TOC if its header is collapsed
              // or filtered out by tags
              if (
                renderedHeading &&
                (currentCollapseLevel >= renderedHeading.level ||
                  currentCollapseLevel < 0) &&
                !Private.headingIsFilteredOut(renderedHeading, options.filtered)
              ) {
                headings.push(renderedHeading);
                if (collapsed) {
                  currentCollapseLevel = renderedHeading.level;
                } else {
                  currentCollapseLevel = -1;
                }
              } else if (
                renderedHeading &&
                Private.headingIsFilteredOut(renderedHeading, options.filtered)
              ) {
                currentCollapseLevel = -1;
              }
            }
            if (
              renderedHeading &&
              !Private.headingIsFilteredOut(renderedHeading, options.filtered)
            ) {
              if (
                (renderedHeading && !(renderedHeading.type === 'markdown')) ||
                options.showMarkdown
              ) {
                prevHeading = renderedHeading;
              }
            }
          } else {
            const onClickFactory = (line: number) => {
              return () => {
                panel.content.activeCellIndex = i;
                cell.node.scrollIntoView();
              };
            };
            let lastLevel = Private.getLastLevel(headings);
            let renderedHeading: INotebookHeading | null = null;
            if (cell) {
              renderedHeading = Private.getMarkdownHeading(
                model!.value.text,
                onClickFactory,
                numberingDict,
                lastLevel,
                cell
              );
            }
            if (renderedHeading && renderedHeading.type === 'markdown') {
              if (
                renderedHeading &&
                currentCollapseLevel < 0 &&
                !Private.headingIsFilteredOut(renderedHeading, options.filtered)
              ) {
                headings.push(renderedHeading);
              }
            } else if (renderedHeading && renderedHeading.type === 'header') {
              // Determine whether the heading has children
              if (
                prevHeading &&
                prevHeading.type === 'header' &&
                prevHeading.level >= renderedHeading.level
              ) {
                prevHeading.hasChild = false;
              }
              // Do not put the item in TOC if its header is collapsed
              // or filtered out by tags
              if (
                renderedHeading &&
                (currentCollapseLevel >= renderedHeading.level ||
                  currentCollapseLevel < 0) &&
                !Private.headingIsFilteredOut(renderedHeading, options.filtered)
              ) {
                headings.push(renderedHeading);
                if (collapsed) {
                  currentCollapseLevel = renderedHeading.level;
                } else {
                  currentCollapseLevel = -1;
                }
              } else {
                if (
                  renderedHeading &&
                  Private.headingIsFilteredOut(
                    renderedHeading,
                    options.filtered
                  )
                ) {
                  currentCollapseLevel = -1;
                }
              }
            }
          }
        }
      }
      return headings;
    }
  };
}

/**
 * A private namespace for miscellaneous things.
 */
namespace Private {
  /**
   * Given a heading and the tags user selected,
   * determine whether the heading is filtered out by these tags.
   */
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
        for (let j = 0; j < cellTagsData.length; j++) {
          let name = cellTagsData[j];
          for (let k = 0; k < tags.length; k++) {
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

  /**
   * Given a string of code, get the code entry.
   */
  export function getCodeCells(
    text: string,
    onClickFactory: (line: number) => (() => void),
    numberingDict: { [level: number]: number },
    executionCount: string,
    lastLevel: number,
    cellRef: Cell
  ): INotebookHeading[] {
    let headings: INotebookHeading[] = [];
    if (text) {
      const lines = text.split('\n');
      let headingText = '';

      // Take at most first 3 lines
      let numLines = Math.min(lines.length, 3);
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

  /**
   * Given a string of markdown, get the markdown headings
   * in that string.
   */
  export function getMarkdownHeading(
    text: string,
    onClickFactory: (line: number) => (() => void),
    numberingDict: any,
    lastLevel: number,
    cellRef: Cell
  ): INotebookHeading {
    // Split the text into lines.
    const lines = text.split('\n');

    // Get the first line an check if it is a header.
    const line = lines[0];
    const line2 = lines.length > 1 ? lines[1] : undefined;
    // Make an onClick handler for this line.
    const onClick = onClickFactory(0);

    // First test for '#'-style headers.
    let match = line.match(/^([#]{1,6}) (.*)/);
    let match2 = line2 && line2.match(/^([=]{2,}|[-]{2,})/);
    let match3 = line.match(/<h([1-6])>(.*)<\/h\1>/i);
    if (match) {
      const level = match[1].length;
      // Take special care to parse markdown links into raw text.
      const text = match[2].replace(/\[(.+)\]\(.+\)/g, '$1');
      let numbering = generateNumbering(numberingDict, level);
      return {
        text,
        level,
        numbering,
        onClick,
        type: 'header',
        cellRef: cellRef,
        hasChild: true
      };
    } else if (match2) {
      // Next test for '==='-style headers.
      const level = match2[1][0] === '=' ? 1 : 2;
      // Take special care to parse markdown links into raw text.
      const text = line.replace(/\[(.+)\]\(.+\)/g, '$1');
      let numbering = generateNumbering(numberingDict, level);
      return {
        text,
        level,
        numbering,
        onClick,
        type: 'header',
        cellRef: cellRef,
        hasChild: true
      };
    } else if (match3) {
      // Finally test for HTML headers. This will not catch multiline
      // headers, nor will it catch multiple headers on the same line.
      // It should do a decent job of catching many, though.
      const level = parseInt(match3[1], 10);
      const text = match3[2];
      let numbering = generateNumbering(numberingDict, level);
      return {
        text,
        level,
        numbering,
        onClick,
        type: 'header',
        cellRef: cellRef,
        hasChild: true
      };
    } else {
      return {
        text: line,
        level: lastLevel + 1,
        onClick,
        type: 'markdown',
        cellRef: cellRef,
        hasChild: false
      };
    }
  }

  /**
   * Given an HTML element, generate ToC headings
   * by finding all the headers and making IHeading objects for them.
   */
  export function getRenderedHTMLHeading(
    node: HTMLElement,
    onClickFactory: (el: Element) => (() => void),
    sanitizer: ISanitizer,
    numberingDict: { [level: number]: number },
    lastLevel: number,
    needsNumbering = false,
    cellRef?: Cell
  ): INotebookHeading | undefined {
    let headingNodes = node.querySelectorAll('h1, h2, h3, h4, h5, h6, p');
    if (headingNodes.length > 0) {
      let markdownCell = headingNodes[0];
      if (markdownCell.nodeName.toLowerCase() === 'p') {
        if (markdownCell.innerHTML) {
          let html = sanitizer.sanitize(
            markdownCell.innerHTML,
            sanitizerOptions
          );
          html = html.replace('¶', '');
          return {
            level: lastLevel + 1,
            html: html,
            text: markdownCell.textContent ? markdownCell.textContent : '',
            onClick: onClickFactory(markdownCell),
            type: 'markdown',
            cellRef: cellRef,
            hasChild: true
          };
        }
      } else {
        const heading = headingNodes[0];
        const level = parseInt(heading.tagName[1], 10);
        const text = heading.textContent ? heading.textContent : '';
        let shallHide = !needsNumbering;
        if (heading.getElementsByClassName('numbering-entry').length > 0) {
          heading.removeChild(
            heading.getElementsByClassName('numbering-entry')[0]
          );
        }
        let html = sanitizer.sanitize(heading.innerHTML, sanitizerOptions);
        html = html.replace('¶', ''); // Remove the anchor symbol.
        const onClick = onClickFactory(heading);
        let numbering = generateNumbering(numberingDict, level);
        let numDOM = '';
        if (!shallHide) {
          numDOM = '<span class="numbering-entry">' + numbering + '</span>';
        }
        heading.innerHTML = numDOM + html;
        return {
          level,
          text,
          numbering,
          html,
          onClick,
          type: 'header',
          cellRef: cellRef,
          hasChild: true
        };
      }
    }
    return undefined;
  }
}
