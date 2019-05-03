// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { style } from 'typestyle/lib';

export interface IIconStyle {
  left?: string;
  top?: string;
  height?: string;
  width?: string;
}

export const defaultIconStyle: IIconStyle = {
  left: '0px',
  top: '0px',
  height: '18px',
  width: '20px'
};

export const iconStyle = (props: IIconStyle): string => {
  const { left, top, height, width } = { ...defaultIconStyle, ...props };
  return style({
    height: height,
    width: width,
    position: 'relative',
    left: left,
    top: top
  });
};

export const iconNestedStyle = (props: IIconStyle): string => {
  const { left, top, height, width } = { ...defaultIconStyle, ...props };
  return style({
    $nest: {
      ['svg']: {
        height: height,
        width: width,
        position: 'relative',
        left: left,
        top: top
      }
    }
  });
};
