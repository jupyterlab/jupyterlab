// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import vars from './variables';
import { NestedCSSProperties } from 'typestyle/lib/types';

export default (props: {
  left?: number;
  top?: number;
}): NestedCSSProperties => {
  return {
    minHeight: vars.iconMinHeight,
    $nest: {
      ['svg']: {
        height: vars.iconHeight,
        width: vars.iconWidth,
        position: 'relative',
        left: `${props.left ? props.left : 0}px`,
        top: `${props.top ? props.top : 0}px`
      }
    }
  };
};
