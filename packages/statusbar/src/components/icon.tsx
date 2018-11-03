// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as React from 'react';

import { classes, style } from 'typestyle/lib';

import icon from '../style/icon';

/**
 * A namespace for IconItem statics.
 */
export namespace IconItem {
  /**
   * Props for an IconItem
   */
  export interface IProps {
    /**
     * A CSS class name for the icon.
     */
    source: string;
  }
}

/**
 * A functional tsx component for an icon.
 */
export function IconItem(
  props: IconItem.IProps &
    React.HTMLAttributes<HTMLDivElement> & {
      offset: { x: number; y: number };
    }
): React.ReactElement<IconItem.IProps> {
  const { source, className, offset, ...rest } = props;
  return (
    <div
      className={classes(className, source, style(icon(offset)))}
      {...rest}
    />
  );
}
