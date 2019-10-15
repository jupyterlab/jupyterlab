// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { CodeComponent } from './codemirror';

import { Cell } from '@jupyterlab/cells';

import { INotebookTracker } from '@jupyterlab/notebook';

import { NotebookGeneratorOptionsManager } from './optionsmanager';

import { INotebookHeading } from './heading';

import { sanitizerOptions } from '../shared';

import * as React from 'react';

/**
 * Returns the header level for a provided cell.
 *
 * ## Notes
 *
 * -   If a cell does not contain a header, the function returns the sentinel value `-1`.
 *
 * -   Cell header examples:
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
 * @param cell - notebook cell
 * @returns header level
 */
function headerLevel(cell: Cell): number {
  if (cell.constructor.name !== 'MarkdownCell') {
    return -1;
  }
  const lines = cell.model.value.text.split('\n');

  // Case: Markdown header
  let match = lines[0].match(/^([#]{1,6}) (.*)/);
  if (match) {
    return match[1].length;
  }
  // Case: Markdown header
  if (lines.length > 1) {
    match = lines[1].match(/^([=]{2,}|[-]{2,})/);
    if (match) {
      return match[1][0] === '=' ? 1 : 2;
    }
  }
  // Case: HTML heading (WARNING: this is not particularly robust, as HTML headings can span multiple lines)
  match = lines[0].match(/<h([1-6])>(.*)<\/h\1>/i);
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
  const level: number = headerLevel(cell);

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
    const l: number = headerLevel(w);

    // Check if a widget is at the same or higher level...
    if (l >= 0 && l <= level) {
      // We've reached the end of the section...
      break;
    }
    // Collapse/expand a sub-cell by setting its `hidden` state:
    w.setHidden(state);
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
      let collapsed = cellRef!.model.metadata.get(
        'toc-hr-collapsed'
      ) as boolean;
      collapsed = collapsed !== undefined ? collapsed : false;
      cellRef!.model.metadata.set('toc-hr-collapsed', !collapsed);
      if (cellRef) {
        // NOTE: we can imagine a future in which this extension combines with a collapsible-header/ings extension such that we can programmatically close notebook "sections". In the meantime, we need to resort to manually "collapsing" sections...
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
