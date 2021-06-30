// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Cell, CodeCell } from '@jupyterlab/cells';
import { NotebookPanel } from '@jupyterlab/notebook';

/**
 * Interface describing a heading.
 *
 * @private
 */
interface IHeading {
  /**
   * Heading text.
   */
  text: string;

  /**
   * HTML heading level.
   */
  level: number;

  /**
   * Callback invoked upon clicking a ToC item.
   *
   * ## Notes
   *
   * -   This will typically be used to scroll the parent widget to this item.
   */
  onClick: () => void;

  /**
   * Special HTML markup.
   *
   * ## Notes
   *
   * -   The HTML string **should** be properly **sanitized**!
   * -   The HTML string can be used to render Markdown headings which have already been rendered as HTML.
   */
  html?: string;
}

/**
 * Interface describing a numbered heading.
 *
 * @private
 */
interface INumberedHeading extends IHeading {
  /**
   * Heading numbering.
   */
  numbering?: string | null;
}

/**
 * Interface describing a notebook cell heading.
 *
 * @private
 */
interface INotebookHeading extends INumberedHeading {
  /**
   * Heading type.
   */
  type: 'header' | 'markdown' | 'code';

  /**
   * Reference to a notebook cell.
   */
  cellRef: Cell;

  /**
   * Heading prompt.
   */
  prompt?: string;

  /**
   * Boolean indicating whether a heading has a child node.
   */
  hasChild?: boolean;

  /**
   * index of reference cell in the notebook
   */
  index: number;
}

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
 * Runs runnable code cells.
 *
 * @private
 * @param headings - list of headings
 * @param heading - heading
 */
const runNestedCodeCells = (headings: IHeading[], heading: IHeading) => {
  let h: INotebookHeading;
  let i: number;

  if (!isNotebookHeading(heading)) {
    return;
  }

  let runCode: INotebookHeading[] = [];
  // Find the heading in the list of headings...
  i = headings.indexOf(heading);

  // Check if the current heading is a "code" heading...
  h = heading as INotebookHeading;
  if (h.type === 'code') {
    runCode.push(h);
  } else {
    // Check for nested code headings...
    const level = heading.level;
    for (i = i + 1; i < headings.length; i++) {
      h = headings[i] as INotebookHeading;
      if (h.level <= level) {
        break;
      }
      if (h.type === 'code') {
        runCode.push(h);
      }
    }
  }

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
};

/**
 * Exports.
 */
export { IHeading };
export { INumberedHeading };
export { INotebookHeading };
export { runNestedCodeCells };
