// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as React from 'react';

import icon from '../style/icon';
import { classes, style } from 'typestyle/lib';

export namespace IconItem {
  export interface IProps {
    source: string;
  }
}

// tslint:disable-next-line:variable-name
export const IconItem = (
  props: IconItem.IProps &
    React.HTMLAttributes<HTMLDivElement> & {
      offset: { x: number; y: number };
    }
): React.ReactElement<IconItem.IProps> => {
  const { source, className, offset, ...rest } = props;
  return (
    <div
      className={classes(className, source, style(icon(offset)))}
      {...rest}
    />
  );
};
