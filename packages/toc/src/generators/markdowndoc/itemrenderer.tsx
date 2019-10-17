// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { sanitizerOptions } from '../../utils/sanitizer_options';

import { INumberedHeading } from '../../utils/headings';

import { MarkdownDocGeneratorOptionsManager } from './optionsmanager';

import * as React from 'react';

export function markdownDocItemRenderer(
  options: MarkdownDocGeneratorOptionsManager,
  item: INumberedHeading
) {
  let fontSizeClass = 'toc-level-size-default';

  // Render numbering if needed
  let numbering = item.numbering && options.numbering ? item.numbering : '';
  fontSizeClass = 'toc-level-size-' + item.level;
  let jsx;
  if (item.html) {
    jsx = (
      <span
        dangerouslySetInnerHTML={{
          __html:
            numbering + options.sanitizer.sanitize(item.html, sanitizerOptions)
        }}
        className={'toc-markdown-cell ' + fontSizeClass}
      />
    );
  } else {
    jsx = <span className={fontSizeClass}> {numbering + item.text}</span>;
  }
  return jsx;
}
