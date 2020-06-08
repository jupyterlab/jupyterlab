// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import vars from './variables';
import { NestedCSSProperties } from 'typestyle/lib/types';
import { style } from 'typestyle/lib';

export const baseText: NestedCSSProperties = {
  fontSize: vars.fontSize,
  fontFamily: vars.fontFamily
};

export const textItem = style(baseText, {
  lineHeight: '24px',
  color: vars.textColor
});

export const nbresuse = style(baseText, {
  backgroundColor: '#FFD2D2',
  color: '#D8000C'
});
