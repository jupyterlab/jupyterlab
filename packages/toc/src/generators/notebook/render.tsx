// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as React from 'react';
import { Cell } from '@jupyterlab/cells';
import { INotebookTracker } from '@jupyterlab/notebook';
import { sanitizerOptions } from '../../utils/sanitizer_options';
import { INotebookHeading } from '../../utils/headings';
import { CodeComponent } from './codemirror';
import { OptionsManager } from './options_manager';
import { setCollapsedState } from './set_collapsed_state';
import { twistButton } from './twist_button';

/**
 * Renders a notebook table of contents item.
 *
 * @private
 * @param options - generator options
 * @param tracker - notebook tracker
 * @param item - notebook heading
 * @returns rendered item
 */
function render(
  options: OptionsManager,
  tracker: INotebookTracker,
  item: INotebookHeading
) {
  let jsx;
  if (item.type === 'markdown' || item.type === 'header') {
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
      // Render the headers:
      if (item.type === 'header') {
        let collapsed = item.cellRef!.model.metadata.get(
          'toc-hr-collapsed'
        ) as boolean;

        // Update the collapsed state of the corresponding notebook cell:
        setCollapsedState(tracker, item.cellRef, collapsed);

        // Only render the twist button if configured to enable collapsing behavior:
        if (options.collapsibleNotebooks) {
          let button = twistButton(item.cellRef, collapsed || false, onClick);

          // Render the heading item:
          jsx = (
            <div className="toc-entry-holder">
              {button}
              {jsx}
            </div>
          );
        } else {
          // Render the heading item without the dropdown button:
          jsx = <div className="toc-entry-holder">{jsx}</div>;
        }
      }
      return jsx;
    }
    if (item.type === 'header' || options.showMarkdown) {
      // Render headers/markdown for plain text:
      jsx = (
        <span className={item.type + '-cell toc-cell-item ' + fontSizeClass}>
          {numbering + item.text}
        </span>
      );
      if (item.type === 'header') {
        let collapsed = item.cellRef!.model.metadata.get(
          'toc-hr-collapsed'
        ) as boolean;

        if (options.collapsibleNotebooks) {
          let button = twistButton(item.cellRef, collapsed || false, onClick);
          setCollapsedState(tracker, item.cellRef, collapsed);
          jsx = (
            <div className="toc-entry-holder">
              {button}
              {jsx}
            </div>
          );
        } else {
          // Render the heading item without the dropdown button:
          jsx = <div className="toc-entry-holder">{jsx}</div>;
        }
      }
      return jsx;
    }
    return null;
  }
  if (item.type === 'code' && options.showCode) {
    // Render code cells:
    return (
      <div className="toc-code-cell-div">
        <div className="toc-code-cell-prompt">{item.prompt}</div>
        <span className={'toc-code-span'}>
          <CodeComponent sanitizer={options.sanitizer} heading={item} />
        </span>
      </div>
    );
  }
  return null;

  /**
   * Callback invoked upon encountering a "click" event.
   *
   * @private
   * @param cellRef - cell reference
   */
  function onClick(cellRef?: Cell) {
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
  }
}

/**
 * Exports.
 */
export { render };
