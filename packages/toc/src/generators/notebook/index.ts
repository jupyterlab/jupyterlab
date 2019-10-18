// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ISanitizer } from '@jupyterlab/apputils';

import { CodeCell, CodeCellModel, MarkdownCell, Cell } from '@jupyterlab/cells';

import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';

import { notebookItemRenderer } from './itemrenderer';

import { notebookGeneratorToolbar } from './toolbargenerator';

import { TableOfContentsRegistry } from '../../registry';

import { TableOfContents } from '../../toc';

import { parseHeading } from '../../utils/parse_heading';

import { isMarkdown } from '../../utils/is_markdown';

import { isDOM } from '../../utils/is_dom';

import { sanitizerOptions } from '../../utils/sanitizer_options';

import { INotebookHeading } from '../../utils/headings';

import { INumberingDictionary } from '../../utils/numbering_dictionary';

import { generateNumbering } from '../../utils/generate_numbering';

import { NotebookGeneratorOptionsManager } from './optionsmanager';

import { getCodeCells } from './get_code_cells';

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
      return notebookItemRenderer(options, tracker, item);
    },
    generate: panel => {
      let headings: INotebookHeading[] = [];
      let numberingDict: INumberingDictionary = {};
      let collapseLevel = -1;
      // Keep track of the previous heading, so it can be
      // marked as having a child if one is discovered
      let prevHeading: INotebookHeading | null = null;
      // Iterate through the cells in the notebook, generating their headings
      for (let i = 0; i < panel.content.widgets.length; i++) {
        let cell: Cell = panel.content.widgets[i];
        let collapsed = cell.model.metadata.get('toc-hr-collapsed') as boolean;
        collapsed = collapsed !== undefined ? collapsed : false;
        let model = cell.model;
        if (model.type === 'code') {
          // Code is shown by default, overridden by previously saved settings
          if (!widget || (widget && options.showCode)) {
            // Generate the heading and add to headings if appropriate
            let executionCountNumber = (cell as CodeCell).model
              .executionCount as number | null;
            let executionCount =
              executionCountNumber !== null
                ? '[' + executionCountNumber + ']: '
                : '[ ]: ';
            let text = (model as CodeCellModel).value.text;
            const onClickFactory = (line: number) => {
              return () => {
                panel.content.activeCellIndex = i;
                cell.node.scrollIntoView();
              };
            };
            let lastLevel = Private.getLastLevel(headings);
            let renderedHeading = getCodeCells(
              text,
              onClickFactory,
              executionCount,
              lastLevel,
              cell
            );
            [headings, prevHeading] = Private.addMDOrCode(
              headings,
              renderedHeading,
              prevHeading,
              collapseLevel,
              options.filtered
            );
          }
          // Iterate over the code cell outputs to check for MD/HTML
          for (let j = 0; j < (model as CodeCellModel).outputs.length; j++) {
            const outputModel = (model as CodeCellModel).outputs.get(j);
            const dataTypes = Object.keys(outputModel.data);
            const htmlData = dataTypes.filter(t => isMarkdown(t) || isDOM(t));
            if (!htmlData.length) {
              continue;
            }
            // If MD/HTML generate the heading and add to headings if applicable
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
            [headings, prevHeading, collapseLevel] = Private.processMD(
              renderedHeading,
              options.showMarkdown,
              headings,
              prevHeading,
              collapseLevel,
              options.filtered,
              collapsed
            );
          }
        } else if (model.type === 'markdown') {
          let mdCell = cell as MarkdownCell;
          let renderedHeading: INotebookHeading | undefined = undefined;
          let lastLevel = Private.getLastLevel(headings);
          // If the cell is rendered, generate the ToC items from the HTML
          if (mdCell.rendered && !mdCell.inputHidden) {
            const onClickFactory = (el: Element) => {
              return () => {
                if (!mdCell.rendered) {
                  panel.content.activeCellIndex = i;
                  el.scrollIntoView();
                } else {
                  panel.content.mode = 'command';
                  cell.node.scrollIntoView();
                  panel.content.activeCellIndex = i;
                }
              };
            };
            renderedHeading = Private.getRenderedHTMLHeading(
              cell.node,
              onClickFactory,
              sanitizer,
              numberingDict,
              lastLevel,
              options.numbering,
              cell
            );
            // If not rendered, generate ToC items from the text of the cell
          } else {
            const onClickFactory = (line: number) => {
              return () => {
                panel.content.activeCellIndex = i;
                cell.node.scrollIntoView();
              };
            };
            renderedHeading = Private.getMarkdownHeading(
              model!.value.text,
              onClickFactory,
              numberingDict,
              lastLevel,
              cell
            );
          }
          // Add to headings if applicable
          [headings, prevHeading, collapseLevel] = Private.processMD(
            renderedHeading,
            options.showMarkdown,
            headings,
            prevHeading,
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
  /**
   * Determine whether a heading is filtered out by selected tags.
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
      }
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

  export function processMD(
    renderedHeading: INotebookHeading | undefined,
    showMarkdown: boolean,
    headings: INotebookHeading[],
    prevHeading: INotebookHeading | null,
    collapseLevel: number,
    filtered: string[],
    collapsed: boolean
  ): [INotebookHeading[], INotebookHeading | null, number] {
    // If the heading is MD and MD is shown, add to headings
    if (
      renderedHeading &&
      renderedHeading.type === 'markdown' &&
      showMarkdown
    ) {
      [headings, prevHeading] = Private.addMDOrCode(
        headings,
        renderedHeading,
        prevHeading,
        collapseLevel,
        filtered
      );
      // Otherwise, if the heading is a header, add to headings
    } else if (renderedHeading && renderedHeading.type === 'header') {
      [headings, prevHeading, collapseLevel] = Private.addHeader(
        headings,
        renderedHeading,
        prevHeading,
        collapseLevel,
        filtered,
        collapsed
      );
    }
    return [headings, prevHeading, collapseLevel];
  }

  export function addMDOrCode(
    headings: INotebookHeading[],
    renderedHeading: INotebookHeading,
    prevHeading: INotebookHeading | null,
    collapseLevel: number,
    filtered: string[]
  ): [INotebookHeading[], INotebookHeading | null] {
    if (
      !Private.headingIsFilteredOut(renderedHeading, filtered) &&
      renderedHeading &&
      renderedHeading.text
    ) {
      // If there is a previous header, find it and mark hasChild true
      if (prevHeading && prevHeading.type === 'header') {
        for (let j = headings.length - 1; j >= 0; j--) {
          if (headings[j] === prevHeading) {
            headings[j].hasChild = true;
          }
        }
      }
      if (collapseLevel < 0) {
        headings.push(renderedHeading);
      }
      prevHeading = renderedHeading;
    }
    return [headings, prevHeading];
  }

  export function addHeader(
    headings: INotebookHeading[],
    renderedHeading: INotebookHeading,
    prevHeading: INotebookHeading | null,
    collapseLevel: number,
    filtered: string[],
    collapsed: boolean
  ): [INotebookHeading[], INotebookHeading | null, number] {
    if (!Private.headingIsFilteredOut(renderedHeading, filtered)) {
      // if the previous heading is a header of a higher level,
      // find it and mark it as having a child
      if (
        prevHeading &&
        prevHeading.type === 'header' &&
        prevHeading.level < renderedHeading.level
      ) {
        for (let j = headings.length - 1; j >= 0; j--) {
          if (headings[j] === prevHeading) {
            headings[j].hasChild = true;
          }
        }
      }
      // if the collapse level doesn't include the header, or if there is no
      // collapsing, add to headings and adjust the collapse level appropriately
      if (collapseLevel >= renderedHeading.level || collapseLevel < 0) {
        headings.push(renderedHeading);
        collapseLevel = collapsed ? renderedHeading.level : -1;
      }
      prevHeading = renderedHeading;
    } else if (prevHeading && renderedHeading.level <= prevHeading.level) {
      // If header is filtered out and has a previous heading of smaller level, go
      // back through headings to determine if it has a parent
      let k = headings.length - 1;
      let parentHeading = false;
      while (k >= 0 && parentHeading === false) {
        if (headings[k].level < renderedHeading.level) {
          prevHeading = headings[k];
          parentHeading = true;
        }
        k--;
      }
      // If there is no parent, set prevHeading to null and reset collapsing
      if (!parentHeading) {
        prevHeading = null;
        collapseLevel = -1;
        // Otherwise, reset collapsing appropriately
      } else {
        let parentState = headings[k + 1].cellRef.model.metadata.get(
          'toc-hr-collapsed'
        ) as boolean;
        parentState = parentState !== undefined ? parentState : false;
        collapseLevel = parentState ? headings[k + 1].level : -1;
      }
    }
    return [headings, prevHeading, collapseLevel];
  }

  /**
   * Given a string of markdown, get the markdown headings in that string.
   */
  export function getMarkdownHeading(
    text: string,
    onClickFactory: (line: number) => () => void,
    numberingDict: any,
    lastLevel: number,
    cellRef: Cell
  ): INotebookHeading {
    const onClick = onClickFactory(0);
    const heading = parseHeading(text);
    if (heading) {
      return {
        text: heading.text,
        level: heading.level,
        numbering: generateNumbering(numberingDict, heading.level),
        onClick,
        type: 'header',
        cellRef: cellRef,
        hasChild: false
      };
    }
    return {
      text: text,
      level: lastLevel + 1,
      onClick,
      type: 'markdown',
      cellRef: cellRef,
      hasChild: false
    };
  }

  /**
   * Given an HTML element, generate ToC headings
   * by finding all the headers and making IHeading objects for them.
   */
  export function getRenderedHTMLHeading(
    node: HTMLElement,
    onClickFactory: (el: Element) => () => void,
    sanitizer: ISanitizer,
    numberingDict: INumberingDictionary,
    lastLevel: number,
    needsNumbering = false,
    cellRef: Cell
  ): INotebookHeading | undefined {
    let nodes = node.querySelectorAll('h1, h2, h3, h4, h5, h6, p');
    if (nodes.length === 0) {
      return;
    }
    let markdownCell = nodes[0];
    if (markdownCell.nodeName.toLowerCase() === 'p') {
      if (markdownCell.innerHTML) {
        let html = sanitizer.sanitize(markdownCell.innerHTML, sanitizerOptions);
        html = html.replace('¶', '');
        return {
          level: lastLevel + 1,
          html: html,
          text: markdownCell.textContent ? markdownCell.textContent : '',
          onClick: onClickFactory(markdownCell),
          type: 'markdown',
          cellRef: cellRef,
          hasChild: false
        };
      }
      return;
    }
    const heading = nodes[0];
    const level = parseInt(heading.tagName[1], 10);
    const text = heading.textContent ? heading.textContent : '';
    let shallHide = !needsNumbering;
    if (heading.getElementsByClassName('numbering-entry').length > 0) {
      heading.removeChild(heading.getElementsByClassName('numbering-entry')[0]);
    }
    let html = sanitizer.sanitize(heading.innerHTML, sanitizerOptions);
    html = html.replace('¶', '');
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
      hasChild: false
    };
  }
}
