// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as React from 'react';
import { INotebookTracker, NotebookActions } from '@jupyterlab/notebook';
import { ellipsesIcon } from '@jupyterlab/ui-components';
import { MARKDOWN_HEADING_COLLAPSED } from '@jupyterlab/cells';
import { INotebookHeading } from '../../utils/headings';
import { sanitizerOptions } from '../../utils/sanitizer_options';
import { CodeComponent } from './codemirror';
import { OptionsManager } from './options_manager';
import { ElementExt } from '@lumino/domutils';
import { TableOfContents } from '../..';

/**
 * Class name of the toc item list.
 *
 * @private
 */
const TOC_TREE_CLASS = 'jp-TableOfContents-content';

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
  widget: TableOfContents,
  item: INotebookHeading,
  toc: INotebookHeading[] = []
): JSX.Element | null {
  let jsx;
  if (item.type === 'markdown' || item.type === 'header') {
    let fontSizeClass = 'toc-level-size-default';
    let numbering = item.numbering && options.numbering ? item.numbering : '';
    let cellCollapseMetadata = options.syncCollapseState
      ? MARKDOWN_HEADING_COLLAPSED
      : 'toc-hr-collapsed';
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
        ) : (
          <div />
        );

        // Render the heading item:
        jsx = (
          <NotebookHeading
            isActive={
              tracker.activeCell === item.cellRef ||
              previousHeader(tracker, item, toc)
            }
            className={'toc-entry-holder ' + fontSizeClass}
            button={button}
            jsx={jsx}
            ellipseButton={ellipseButton}
            area={widget.node.querySelector(`.${TOC_TREE_CLASS}`) as Element}
          />
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
        ) : (
          <div />
        );
        jsx = (
          <NotebookHeading
            isActive={
              tracker.activeCell === item.cellRef ||
              previousHeader(tracker, item, toc)
            }
            className={'toc-entry-holder ' + fontSizeClass}
            area={widget.node.querySelector(`.${TOC_TREE_CLASS}`) as Element}
          >
            {button}
            {jsx}
            {ellipseButton}
          </NotebookHeading>
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
  area: Element;
}>

/** React component for a single toc heading
 *
 * @private
 */
function NotebookHeading(props: NotebookHeadingProps): JSX.Element {
  const itemRef = React.useRef<HTMLDivElement>(null);
  const isActive = props.isActive;
  React.useEffect(() => {
    if (isActive && itemRef.current) {
      ElementExt.scrollIntoViewIfNeeded(
        props.area,
        itemRef.current.parentElement as Element
      );
    }
  }, [isActive]);
  return (
    <div
      ref={itemRef}
      className={[props.className, isActive ? 'toc-active-cell' : ''].join(' ')}
    >
      {props.children}
    </div>
  );
}

/**
 * Exports.
 */
export { render };
