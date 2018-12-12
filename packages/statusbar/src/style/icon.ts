// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import vars from './variables';
import { NestedCSSProperties } from 'typestyle/lib/types';

export default ({ x, y }: { x: number; y: number }): NestedCSSProperties => {
  return {
    backgroundRepeat: 'no-repeat',
    backgroundSize: vars.iconImageSize,
    backgroundPositionY: y !== 0 ? `${y}px` : undefined,
    backgroundPositionX: x !== 0 ? `${x}px` : undefined,
    minHeight: vars.height,
    width: vars.iconWidth
  };
};
