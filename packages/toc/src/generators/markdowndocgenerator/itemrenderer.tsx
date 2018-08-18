// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { MarkdownDocGeneratorOptionsManager } from './optionsmanager';

import { INotebookHeading } from '../shared';

import * as React from 'react';

export function markdownDocItemRenderer(
  options: MarkdownDocGeneratorOptionsManager,
  item: INotebookHeading
) {
  const levelsSizes: { [level: number]: string } = {
    1: '18.74',
    2: '16.02',
    3: '13.69',
    4: '12',
    5: '11',
    6: '10'
  };
  let fontSize = '9px';
  let numbering = item.numbering && options.numbering ? item.numbering : '';
  fontSize = levelsSizes[item.level] + 'px';
  let jsx = <span style={{ fontSize }}> {numbering + item.text}</span>;
  return jsx;
}
