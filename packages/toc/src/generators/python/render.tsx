// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as React from 'react';
import { IHeading } from '../../utils/headings';

/**
 * Renders a Python table of contents item.
 *
 * @private
 * @param item - numbered heading
 * @returns rendered item
 */
function render(item: IHeading) {
  let fontSizeClass = 'toc-level-size-' + item.level;

  return <span className={fontSizeClass}> {item.text} </span>;
}

/**
 * Exports.
 */
export { render };
