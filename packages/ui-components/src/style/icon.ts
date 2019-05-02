// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import vars from './variables';
import { NestedCSSProperties } from 'typestyle/lib/types';

export default ({ x, y }: { x: number; y: number }): NestedCSSProperties => {
  return {
    minHeight: vars.iconMinHeight,
    $nest: {
      ['svg']: {
        height: vars.iconHeight,
        width: vars.iconWidth,
        position: 'relative',
        left: `${x}px`,
        top: `${y}px`
      }
    }
  };
};
