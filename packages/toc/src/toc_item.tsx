// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as React from 'react';
import { IHeading, INotebookHeading } from './utils/headings';
import { CodeCell } from '@jupyterlab/cells';
import { NotebookPanel } from '@jupyterlab/notebook';
import { Signal } from '@lumino/signaling';
import { TableOfContents } from './toc';

/**
 * Tests whether a heading is a notebook heading.
 *
 * @param heading - heading to test
 * @returns boolean indicating whether a heading is a notebook heading
 */
const isNotebookHeading = (heading: any): heading is INotebookHeading => {
  return heading.type !== undefined && heading.cellRef !== undefined;
};

/**
 * Checks whether a heading has runnable code cells.
 * Runs runnable code cells if given runCode.
 *
 * @private
 * @param headings - list of headings
 * @param heading - heading
 * @param runCode - optional empty list of "code" headings
 * @returns boolean indicating whether a heading has runnable code cells
 */
export const NestedCodeCells = (
  headings: IHeading[],
  heading: IHeading,
  runCode?: INotebookHeading[]
): boolean => {
  let h: INotebookHeading;
  let i: number;

  if (runCode === undefined && !isNotebookHeading(heading)) {
    return false;
  }
  // In case non-empty list is passed in
  if (runCode) {
    runCode = [];
  }

  // Find the heading in the list of headings...
  i = headings.indexOf(heading);

  // Check if the current heading is a "code" heading...
  h = heading as INotebookHeading;
  if (h.type === 'code') {
    if (runCode) {
      runCode.push(h);
    } else {
      return true;
    }
  } else {
    // Check for nested code headings...
    const level = heading.level;
    for (i = i + 1; i < headings.length; i++) {
      h = headings[i] as INotebookHeading;
      if (h.level <= level) {
        break;
      }
      if (h.type === 'code') {
        if (runCode) {
          runCode.push(h);
        } else {
          return true;
        }
      }
    }
  }
  if (runCode) {
    // Run each of the associated code cells...
    for (i = 0; i < runCode.length; i++) {
      if (runCode[i].cellRef) {
        const cell = runCode[i].cellRef as CodeCell;
        const panel = cell.parent?.parent as NotebookPanel;
        if (panel) {
          void CodeCell.execute(cell, panel.sessionContext);
        }
      }
    }
    // Value false when no runnable heading
    return runCode.length > 0;
  }
  return false;
};

/**
 * Interface describing component properties.
 *
 * @private
 */
interface IProperties {
  /**
   * Heading to render.
   */
  heading: IHeading;
  /**
   * List of headings to use for rendering current position in toc
   */
  toc: IHeading[];

  /**
   * Optional signal that emits when a toc entry is clicked
   */
  entryClicked?: Signal<TableOfContents, TOCItem>;

  /**
   * Renders a heading.
   *
   * @param item - heading
   * @param toc - list of headings
   * @returns rendered heading
   */
  itemRenderer: (item: IHeading, toc: IHeading[]) => JSX.Element | null;
}

/**
 * Interface describing component state.
 *
 * @private
 */
interface IState {}

/**
 * React component for a table of contents entry.
 *
 * @private
 */
class TOCItem extends React.Component<IProperties, IState> {
  /**
   * Renders a table of contents entry.
   *
   * @returns rendered entry
   */
  render() {
    const { heading, toc } = this.props;

    // Create an onClick handler for the TOC item
    // that scrolls the anchor into view.
    const onClick = (event: React.SyntheticEvent<HTMLSpanElement>) => {
      event.preventDefault();
      event.stopPropagation();
      this.props.entryClicked?.emit(this);
      heading.onClick();
    };

    let content = this.props.itemRenderer(heading, toc);
    if (!content) {
      return null;
    }
    return (
      <li
        className="jp-tocItem"
        onClick={onClick}
        onContextMenu={(event: React.SyntheticEvent<HTMLSpanElement>) => {
          this.props.entryClicked?.emit(this);
          heading.onClick();
        }}
      >
        {content}
      </li>
    );
  }
}

/**
 * Exports.
 */
export { TOCItem };
