// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { NestedCSSProperties } from 'typestyle/lib/types';

export const centeredFlex: NestedCSSProperties = {
  display: 'flex',
  alignItems: 'center'
};

export const leftToRight: NestedCSSProperties = {
  flexDirection: 'row'
};

export const rightToLeft: NestedCSSProperties = {
  flexDirection: 'row-reverse'
};

export const equiDistant: NestedCSSProperties = {
  justifyContent: 'space-between'
};
