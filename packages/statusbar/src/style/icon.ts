// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import vars from './variables';
import { NestedCSSProperties } from 'typestyle/lib/types';

export default (): NestedCSSProperties => {
  return {
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
    backgroundSize: vars.iconImageSize,
    minHeight: vars.height,
    width: vars.iconWidth
  };
};
