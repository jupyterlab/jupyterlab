// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as React from 'react';
import { sanitizerOptions } from '../../utils/sanitizer_options';
import { INumberedHeading } from '../../utils/headings';
import { OptionsManager } from './options_manager';

/**
 * Renders a Markdown table of contents item.
 *
 * @private
 * @param options - generator options
 * @param item - numbered heading
 * @returns rendered item
 */
function render(options: OptionsManager, item: INumberedHeading) {
  let fontSizeClass = 'toc-level-size-' + item.level;

  // Render item numbering:
  let numbering = item.numbering && options.numbering ? item.numbering : '';

  // Render the item:
  let jsx;
  if (item.html) {
    let html = options.sanitizer.sanitize(item.html, sanitizerOptions);
    jsx = (
      <span
        dangerouslySetInnerHTML={{ __html: numbering + html }}
        className={'toc-markdown-cell ' + fontSizeClass}
      />
    );
  } else {
    jsx = <span className={fontSizeClass}> {numbering + item.text}</span>;
  }
  return jsx;
}

/**
 * Exports.
 */
export { render };
