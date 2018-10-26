// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { style } from 'typestyle/lib';

export const progressBarItem = style({
  background: 'black',
  height: '10px',
  width: '100px',
  border: '1px solid black',
  borderRadius: '3px',
  marginLeft: '4px',
  overflow: 'hidden'
});

export const fillerItem = style({
  background: 'var(--jp-brand-color2)',
  height: '10px'
});
