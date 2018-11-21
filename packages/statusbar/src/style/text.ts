// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import vars from './variables';
import { NestedCSSProperties } from 'typestyle/lib/types';
import { style } from 'typestyle/lib';

export const baseText: NestedCSSProperties = {
  fontSize: vars.fontSize,
  fontFamily:
    '"HelveticaNeue-Regular", "Helvetica Neue Regular", "Helvetica Neue", Helvetica, Arial, "Lucida Grande", sans-serif'
};

export const textItem = style(baseText, {
  lineHeight: '26px',
  color: vars.textColor
});
