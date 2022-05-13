// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { style } from 'typestyle';
import type { NestedCSSProperties } from 'typestyle/lib/types.js';
import vars from './variables.js';

export const baseText: NestedCSSProperties = {
  fontSize: vars.fontSize,
  fontFamily: vars.fontFamily
};

export const textItem = style(baseText, {
  lineHeight: '24px',
  color: vars.textColor
});
