// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as React from 'react';
import { INotebookTracker } from '@jupyterlab/notebook';
import { ellipsesIcon } from '@jupyterlab/ui-components';
import { sanitizerOptions } from '../../utils/sanitizer_options';
import { INotebookHeading } from '../../utils/headings';
import { CodeComponent } from './codemirror';
import { OptionsManager } from './options_manager';

/**
 * Renders a notebook table of contents item.
 *
 * @private
 * @param options - generator options
 * @param tracker - notebook tracker
 * @param item - notebook heading
 * @param toc - current list of notebook headings
 * @returns rendered item
 */
function render(
  options: OptionsManager,
  tracker: INotebookTracker,
  item: INotebookHeading,
  toc: INotebookHeading[] = []
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
          className={item.type + '-cell toc-cell-item'}
        />
      );
      // Render the headers:
      if (item.type === 'header') {
        let button = (
          <div
            className="jp-Collapser p-Widget lm-Widget"
            onClick={(event: any) => {
              event.stopPropagation();
              onClick(item);
            }}
          >
            <div className="toc-Collapser-child" />
          </div>
        );

        let collapsed;
        if (item.cellRef!.model.metadata.has('toc-hr-collapsed')) {
          collapsed = item.cellRef!.model.metadata.get(
            'toc-hr-collapsed'
          ) as boolean;
        }
        let ellipseButton = collapsed ? (
          <div
            className="toc-Ellipses"
            onClick={(event: any) => {
              event.stopPropagation();
              onClick(item);
            }}
          >
            <ellipsesIcon.react />
          </div>
        ) : (
          <div />
        );

        // Render the heading item:
        jsx = (
          <div
            className={
              'toc-entry-holder ' +
              fontSizeClass +
              (tracker.activeCell === item.cellRef
                ? ' toc-active-cell'
                : previousHeader(tracker, item, toc)
                ? ' toc-active-cell'
                : '')
            }
          >
            {button}
            {jsx}
            {ellipseButton}
          </div>
        );
      }
      return jsx;
    }
    if (item.type === 'header' || options.showMarkdown) {
      // Render headers/markdown for plain text:
      jsx = (
        <span className={item.type + '-cell toc-cell-item'}>
          {numbering + item.text}
        </span>
      );
      if (item.type === 'header') {
        let button = (
          <div
            className="jp-Collapser p-Widget lm-Widget"
            onClick={(event: any) => {
              event.stopPropagation();
              onClick(item);
            }}
          >
            <div className="toc-Collapser-child" />
          </div>
        );
        let collapsed;
        if (item.cellRef!.model.metadata.has('toc-hr-collapsed')) {
          collapsed = item.cellRef!.model.metadata.get(
            'toc-hr-collapsed'
          ) as boolean;
        }
        let ellipseButton = collapsed ? (
          <div
            className="toc-Ellipses"
            onClick={(event: any) => {
              event.stopPropagation();
              onClick(item);
            }}
          >
            <ellipsesIcon.react />
          </div>
        ) : (
          <div />
        );
        jsx = (
          <div
            className={
              'toc-entry-holder ' +
              fontSizeClass +
              (tracker.activeCell === item.cellRef
                ? ' toc-active-cell'
                : previousHeader(tracker, item, toc)
                ? ' toc-active-cell'
                : '')
            }
          >
            {button}
            {jsx}
            {ellipseButton}
          </div>
        );
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
   * @param heading - notebook heading that was clicked
   */
  function onClick(heading?: INotebookHeading) {
    let collapsed;
    if (heading!.cellRef!.model.metadata.has('toc-hr-collapsed')) {
      collapsed = heading!.cellRef!.model.metadata.get(
        'toc-hr-collapsed'
      ) as boolean;
      heading!.cellRef!.model.metadata.delete('toc-hr-collapsed');
    } else {
      collapsed = false;
      heading!.cellRef!.model.metadata.set('toc-hr-collapsed', true);
    }
    if (heading) {
      options.updateAndCollapse({
        heading: heading,
        collapsedState: collapsed,
        tocType: 'notebook'
      });
      // NOTE: we can imagine a future in which this extension combines with a collapsible-header/ings extension such that we can programmatically close notebook "sections" according to a public API specifically intended for collapsing notebook sections. In the meantime, we need to resort to manually "collapsing" sections...
    } else {
      options.updateWidget();
    }
  }
}

/**
 * Used to find the nearest above heading to an active notebook cell
 *
 * @private
 * @param tracker - notebook tracker
 * @param item - notebook heading
 * @param toc - current list of notebook headings
 * @returns true if heading is nearest above a selected cell, otherwise false
 */
function previousHeader(
  tracker: INotebookTracker,
  item: INotebookHeading,
  toc: INotebookHeading[]
) {
  if (item.index > -1 || toc?.length) {
    let activeCellIndex = tracker.currentWidget!.content.activeCellIndex;
    let headerIndex = item.index;
    // header index has to be less than the active cell index
    if (headerIndex < activeCellIndex) {
      let tocIndexOfNextHeader = toc.indexOf(item) + 1;
      // return true if header is the last header
      if (tocIndexOfNextHeader >= toc.length) {
        return true;
      }
      // return true if the next header cells index is greater than the active cells index
      let nextHeaderIndex = toc?.[tocIndexOfNextHeader].index;
      if (nextHeaderIndex > activeCellIndex) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Exports.
 */
export { render };
