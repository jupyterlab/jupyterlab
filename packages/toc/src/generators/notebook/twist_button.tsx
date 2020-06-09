// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as React from 'react';
import { Cell } from '@jupyterlab/cells';

/**
 * Callback invoked upon encountering a "click" event.
 *
 * @private
 * @param cellRef - cell reference
 */
type onClick = (cellRef?: Cell) => void;

/**
 * Renders a twist button.
 *
 * @private
 * @param cellRef - cell reference
 * @param collapsed - boolean indicating whether a ToC item is collapsed
 * @param onClick - "click" handler
 * @returns rendered twist button
 */
function twistButton(cellRef: Cell, collapsed: boolean, onClick: onClick) {
  if (collapsed) {
    return (
      <div className="toc-collapse-button" onClick={wrapper}>
        <div className="toc-twist-placeholder">placeholder</div>
        <div className="toc-rightarrow-img toc-arrow-img" />
      </div>
    );
  }
  return (
    <div className="toc-collapse-button" onClick={wrapper}>
      <div className="toc-twist-placeholder">placeholder</div>
      <div className="toc-downarrow-img toc-arrow-img" />
    </div>
  );

  /**
   * Callback invoked upon encountering a "click" event.
   *
   * @private
   * @param event - event object
   */
  function wrapper(event: any) {
    event.stopPropagation();
    onClick(cellRef);
  }
}

/**
 * Exports.
 */
export { twistButton };
