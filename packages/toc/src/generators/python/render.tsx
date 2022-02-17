// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as React from 'react';
import { IHeading } from '../../tokens';

/**
 * Renders a Python table of contents item.
 *
 * @private
 * @param item - numbered heading
 * @returns rendered item
 */
function render(item: IHeading): JSX.Element {
  let fontSizeClass = 'toc-level-size-' + item.level;

  return (
    <div className={fontSizeClass + ' toc-entry-holder'}>
      <div className="jp-Collapser p-Widget lm-Widget">
        <div className="toc-Collapser-child"></div>
      </div>
      <span className="header-cell toc-cell-item"> {item.text} </span>
    </div>
  );
}

/**
 * Exports.
 */
export { render };
