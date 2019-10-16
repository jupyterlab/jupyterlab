// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Cell, CodeCell, CodeCellModel } from '@jupyterlab/cells';

import { INotebookTracker } from '@jupyterlab/notebook';

import { Panel } from '@phosphor/widgets';

import { CodeComponent } from './codemirror';

import { NotebookGeneratorOptionsManager } from './optionsmanager';

import { INotebookHeading } from './heading';

import { sanitizerOptions, isDOM, isMarkdown } from '../shared';

import * as React from 'react';

/**
 * Returns the heading level from a provided string.
 *
 * ## Notes
 *
 * -   Header examples:
 *
 *     -   Markdown header:
 *
 *         ```
 *         # Foo
 *         ```
 *
 *     -   Markdown header:
 *
 *         ```
 *         Foo
 *         ===
 *         ```
 *
 *         ```
 *         Foo
 *         ---
 *         ```
 *
 *     -   HTML heading:
 *
 *         ```
 *         <h3>Foo</h3>
 *         ```
 *
 * @private
 * @param str - input text
 * @returns heading level
 */
function headingLevel(str: string): number {
  const lines = str.split('\n');

  // Case: Markdown heading
  let match = lines[0].match(/^([#]{1,6}) (.*)/);
  if (match) {
    return match[1].length;
  }
  // Case: Markdown heading
  if (lines.length > 1) {
    match = lines[1].match(/^([=]{2,}|[-]{2,})/);
    if (match) {
      return match[1][0] === '=' ? 1 : 2;
    }
  }
  // Case: HTML heading (WARNING: this is not particularly robust, as HTML headings can span multiple lines)
  match = lines[0].match(/<h([1-6]).*>(.*)<\/h\1>/i);
  if (match) {
    return parseInt(match[1], 10);
  }
  return -1;
}

/**
 * Collapses or expands ("un-collapses") a notebook cell by either hiding or displaying its section-defined sub-cells (i.e., cells which have lower precedence).
 *
 * @private
 * @param tracker - notebook tracker
 * @param cell - notebook cell
 * @param state - collapsed state (`true` if collapse; `false` if expand)
 */
function setCollapsedState(
  tracker: INotebookTracker,
  cell: Cell,
  state: boolean
): void {
  // Guard against attempting to collapse already hidden cells...
  if (state) {
    if (cell.isHidden) {
      return;
    }
  }
  // Guard against attempting to un-collapse cells which we did not collapse or are already un-collapsed...
  else if (
    cell.model.metadata.has('toc-nb-collapsed') === false ||
    cell.model.metadata.get('toc-nb-collapsed') === false
  ) {
    return;
  }
  if (cell.model.type !== 'markdown') {
    console.log(cell);
    return;
  }
  const level: number = headingLevel(cell.model.value.text);

  // Guard against attempting to (un-)collapse cells which are not "collapsible" (i.e., do not define sections)...
  if (level === -1) {
    return;
  }
  // Ensure a widget is currently focused...
  if (tracker.currentWidget === null) {
    return;
  }
  const widgets = tracker.currentWidget.content.widgets;
  const len = widgets.length;
  const idx = widgets.indexOf(cell);

  // Guard against an unrecognized "cell" argument...
  if (idx === -1) {
    return;
  }
  // Search for notebook cells which are semantically defined as sub-cells...
  for (let i = idx + 1; i < len; i++) {
    const w = widgets[i];

    // Cells which are neither Markdown nor code cells can be readily collapsed/expanded...
    if (w.model.type !== 'markdown' && w.model.type !== 'code') {
      w.setHidden(state);
      continue;
    }
    // Markdown cells are relatively straightforward, as we can determine whether to collapse/expand based on the level of the **first** encountered heading...
    if (w.model.type === 'markdown') {
      const l: number = headingLevel(w.model.value.text);

      // Check if a widget is at the same or higher level...
      if (l >= 0 && l <= level) {
        // We've reached the end of the section...
        break;
      }
      // Collapse/expand a sub-cell by setting the its `hidden` state:
      w.setHidden(state);
      continue;
    }
    // Code cells are more involved, as we need to analyze the outputs to check for generated Markdown/HTML...
    const c = w as CodeCell;
    const model = w.model as CodeCellModel;
    const outputs = model.outputs;

    // First, we do an initial pass to check for generated Markdown/HTML. If we don't find Markdown/HTML, then the entire cell can be collapsed/expanded (both inputs and outputs)...
    let FLG = false;
    let dtypes: string[] = [];
    for (let j = 0; j < outputs.length; j++) {
      // Retrieve the cell output model:
      const m = outputs.get(j);

      // Check the cell output MIME types:
      dtypes = Object.keys(m.data);
      for (let k = 0; k < dtypes.length; k++) {
        const t = dtypes[k];
        if (isMarkdown(t) || isDOM(t) || t === 'text/plain') {
          // FIXME: apparent Jupyter bug where additional Markdown displays have a `text/plain` MIME type
          FLG = true;
        } else {
          dtypes[k] = '';
        }
      }
    }
    // If we did not find Markdown/HTML, collapse/expand the entire cell...
    if (FLG === false) {
      w.setHidden(state);
      continue;
    }
    // Now, we perform a second pass to determine whether the output areas containing generated Markdown/HTML contain headings at the same or higher level...
    let idx = -1;
    for (let j = 0; j < outputs.length; j++) {
      if (dtypes[j] === '') {
        continue;
      }
      // Retrieve the output area widget:
      const ow = c.outputArea.widgets[j] as Panel;

      // Determine the heading level from the rendered HTML of the output area result:
      const l: number = headingLevel(ow.widgets[1].node.innerHTML);

      // Check if an output widget contains a heading at the same or higher level...
      if (l >= 0 && l <= level) {
        // We've reached the end of the section...
        idx = j;
        break;
      }
    }
    // If we did not encounter a new section, we can safely collapse/expand the entire widget...
    if (idx === -1) {
      w.setHidden(state);
      continue;
    }
    // Finally, we perform a third pass to collapse/expand individual output area widgets...
    for (let j = 0; j < idx; j++) {
      const ow = c.outputArea.widgets[j] as Panel;
      ow.setHidden(state);
    }
    // Collapse/expand a sub-cell's input area by setting the its `hidden` state:
    w.inputArea.setHidden(state);
  }
  if (state) {
    // Set a meta-data flag to indicate that we've collapsed notebook sections:
    cell.model.metadata.set('toc-nb-collapsed', true);
  } else {
    // Remove the meta-data flag indicating that we'd collapsed notebook sections:
    cell.model.metadata.delete('toc-nb-collapsed');
  }
}

export function notebookItemRenderer(
  options: NotebookGeneratorOptionsManager,
  tracker: INotebookTracker,
  item: INotebookHeading
) {
  let jsx;
  if (item.type === 'markdown' || item.type === 'header') {
    const collapseOnClick = (cellRef?: Cell) => {
      let collapsed;
      if (cellRef!.model.metadata.has('toc-hr-collapsed')) {
        collapsed = cellRef!.model.metadata.get('toc-hr-collapsed') as boolean;
        cellRef!.model.metadata.delete('toc-hr-collapsed');
      } else {
        collapsed = false;
        cellRef!.model.metadata.set('toc-hr-collapsed', true);
      }
      if (cellRef) {
        // NOTE: we can imagine a future in which this extension combines with a collapsible-header/ings extension such that we can programmatically close notebook "sections" according to a public API specifically intended for collapsing notebook sections. In the meantime, we need to resort to manually "collapsing" sections...
        setCollapsedState(tracker, cellRef, !collapsed);
      }
      options.updateWidget();
    };
    let fontSizeClass = 'toc-level-size-default';
    let numbering = item.numbering && options.numbering ? item.numbering : '';
    if (item.type === 'header') {
      fontSizeClass = 'toc-level-size-' + item.level;
    }
    if (item.html && (item.type === 'header' || options.showMarkdown)) {
      jsx = (
        <span
          dangerouslySetInnerHTML={{
            __html:
              numbering +
              options.sanitizer.sanitize(item.html, sanitizerOptions)
          }}
          className={item.type + '-cell toc-cell-item ' + fontSizeClass}
        />
      );
      // Render the headers
      if (item.type === 'header') {
        let collapsed = item.cellRef!.model.metadata.get(
          'toc-hr-collapsed'
        ) as boolean;
        collapsed = collapsed != undefined ? collapsed : false;

        // Render the twist button
        let twistButton;
        if (collapsed) {
          twistButton = (
            <div
              className="toc-collapse-button"
              onClick={event => {
                event.stopPropagation();
                collapseOnClick(item.cellRef);
              }}
            >
              <div className="toc-twist-placeholder">placeholder</div>
              <div className="toc-rightarrow-img toc-arrow-img" />
            </div>
          );
        } else {
          twistButton = (
            <div
              className="toc-collapse-button"
              onClick={event => {
                event.stopPropagation();
                collapseOnClick(item.cellRef);
              }}
            >
              <div className="toc-twist-placeholder">placeholder</div>
              <div className="toc-downarrow-img toc-arrow-img" />
            </div>
          );
        }
        // Render the header item
        jsx = (
          <div className="toc-entry-holder">
            {twistButton}
            {jsx}
          </div>
        );
      }
    } else if (item.type === 'header' || options.showMarkdown) {
      // Render headers/markdown for plain text
      jsx = (
        <span className={item.type + '-cell toc-cell-item ' + fontSizeClass}>
          {numbering + item.text}
        </span>
      );
      if (item.type === 'header') {
        let collapsed = item.cellRef!.model.metadata.get(
          'toc-hr-collapsed'
        ) as boolean;
        collapsed = collapsed != undefined ? collapsed : false;
        let twistButton;
        if (collapsed) {
          twistButton = (
            <div
              className="toc-collapse-button"
              onClick={event => {
                event.stopPropagation();
                collapseOnClick(item.cellRef);
              }}
            >
              <div className="toc-twist-placeholder">placeholder</div>
              <div className="toc-rightarrow-img toc-arrow-img" />
            </div>
          );
        } else {
          twistButton = (
            <div
              className="toc-collapse-button"
              onClick={event => {
                event.stopPropagation();
                collapseOnClick(item.cellRef);
              }}
            >
              <div className="toc-twist-placeholder">placeholder</div>
              <div className="toc-downarrow-img toc-arrow-img" />
            </div>
          );
        }
        jsx = (
          <div className="toc-entry-holder">
            {twistButton}
            {jsx}
          </div>
        );
      }
    } else {
      jsx = null;
    }
  } else if (item.type === 'code' && options.showCode) {
    // Render code cells
    jsx = (
      <div className="toc-code-cell-div">
        <div className="toc-code-cell-prompt">{item.prompt}</div>
        <span className={'toc-code-span'}>
          <CodeComponent sanitizer={options.sanitizer} heading={item} />
        </span>
      </div>
    );
  } else {
    jsx = null;
  }
  return jsx;
}
