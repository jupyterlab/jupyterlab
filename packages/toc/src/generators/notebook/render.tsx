// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { MARKDOWN_HEADING_COLLAPSED } from '@jupyterlab/cells';
import { INotebookTracker, NotebookActions } from '@jupyterlab/notebook';
import { classes, ellipsesIcon } from '@jupyterlab/ui-components';
import { ElementExt } from '@lumino/domutils';
import * as React from 'react';
import { TableOfContentsWidget } from '../..';
import { INotebookHeading, RunningStatus } from '../../tokens';
import { sanitizerOptions } from '../../utils/sanitizer_options';
import { CodeComponent } from './codemirror';
import { OptionsManager } from './options_manager';

/**
 * Class name of the toc item list.
 *
 * @private
 */
const TOC_TREE_CLASS = 'jp-TableOfContents-content';

/**
 * Renders a notebook table of contents item.
 *
 * @param options - generator options
 * @param tracker - notebook tracker
 * @param item - notebook heading
 * @param toc - current list of notebook headings
 * @returns rendered item
 */
export function render(
  options: OptionsManager,
  tracker: INotebookTracker,
  widget: TableOfContentsWidget,
  item: INotebookHeading,
  toc: INotebookHeading[] = []
): JSX.Element | null {
  if (item.type === 'markdown' || item.type === 'header') {
    const fontSizeClass =
      item.type === 'header'
        ? `toc-level-size-${item.level}`
        : 'toc-level-size-default';
    const numbering = item.prefix && options.numbering ? item.prefix : '';
    const cellCollapseMetadata = options.syncCollapseState
      ? MARKDOWN_HEADING_COLLAPSED
      : 'toc-hr-collapsed';

    if (item.type === 'header' || options.showMarkdown) {
      const header = item.html ? (
        <span
          dangerouslySetInnerHTML={{
            __html:
              numbering +
              options.sanitizer.sanitize(item.html, sanitizerOptions)
          }}
          className={`${item.type}-cell toc-cell-item`}
        />
      ) : (
        <span className={`${item.type}-cell toc-cell-item`}>
          {numbering + item.text}
        </span>
      );

      if (item.type === 'header') {
        let button = (
          <div
            className="jp-Collapser p-Widget lm-Widget"
            onClick={(event: any) => {
              event.stopPropagation();
              onClick(tracker, cellCollapseMetadata, item);
            }}
          >
            <div className="toc-Collapser-child" />
          </div>
        );

        let collapsed;
        if (item.cellRef!.model.metadata.has(cellCollapseMetadata)) {
          collapsed = item.cellRef!.model.metadata.get(
            cellCollapseMetadata
          ) as boolean;
        }
        let ellipseButton = collapsed ? (
          <div
            className="toc-Ellipses"
            onClick={(event: any) => {
              event.stopPropagation();
              onClick(tracker, cellCollapseMetadata, item);
            }}
          >
            <ellipsesIcon.react />
          </div>
        ) : null;

        return (
          <NotebookHeading
            isActive={
              tracker.activeCell === item.cellRef ||
              previousHeader(tracker, item, toc)
            }
            className={'toc-entry-holder ' + fontSizeClass}
            isRunning={item.isRunning}
            area={widget.node.querySelector(`.${TOC_TREE_CLASS}`)}
          >
            {button}
            {header}
            {ellipseButton}
          </NotebookHeading>
        );
      } else {
        return header;
      }
    }
  }

  if (options.showCode && item.type === 'code') {
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

  function onClick(
    tracker: INotebookTracker,
    cellCollapseMetadata: string,
    heading?: INotebookHeading
  ) {
    let collapsed = false;
    let syncCollapseState = options.syncCollapseState;
    if (heading!.cellRef!.model.metadata.get(cellCollapseMetadata)) {
      collapsed = heading!.cellRef!.model.metadata.get(
        cellCollapseMetadata
      ) as boolean;
    }
    if (heading) {
      if (syncCollapseState) {
        // if collapse state is synced, update state here
        if (tracker.currentWidget) {
          NotebookActions.setHeadingCollapse(
            heading!.cellRef!,
            !collapsed,
            tracker.currentWidget.content
          );
        }
      } else {
        if (collapsed) {
          heading!.cellRef!.model.metadata.delete(cellCollapseMetadata);
        } else {
          heading!.cellRef!.model.metadata.set(cellCollapseMetadata, true);
        }
      }
      options.updateAndCollapse({
        heading: heading,
        collapsedState: collapsed,
        tocType: 'notebook'
      });
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

type NotebookHeadingProps = React.PropsWithChildren<{
  isActive: boolean;
  className: string;
  area: Element | null;
  isRunning?: RunningStatus;
}>;

/**
 * React component for a single toc heading
 *
 * @private
 */
function NotebookHeading(props: NotebookHeadingProps): JSX.Element {
  const itemRef = React.useRef<HTMLDivElement>(null);
  const isActive = props.isActive;
  React.useEffect(() => {
    if (isActive && itemRef.current && props.area) {
      ElementExt.scrollIntoViewIfNeeded(
        props.area,
        itemRef.current.parentElement as Element
      );
    }
  }, [isActive]);
  return (
    <div
      ref={itemRef}
      className={classes(props.className, isActive ? 'toc-active-cell' : '')}
      data-running={props.isRunning}
    >
      {props.children}
    </div>
  );
}
