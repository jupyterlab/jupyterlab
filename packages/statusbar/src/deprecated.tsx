/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

/* This file is a workaround for 1.0.x versions of Jlab pulling in 1.1.x
versions of statusbar.
TODO: delete this file in Jlab 2.0
*/

import * as React from 'react';

import { classes, style } from 'typestyle/lib';

import { NestedCSSProperties } from 'typestyle/lib/types';

const icon = (): NestedCSSProperties => {
  return {
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
    backgroundSize: '18px',
    minHeight: '24px',
    width: '20px'
  };
};

/**
 * (DEPRECATED) A namespace for IconItem statics.
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
 * (DEPRECATED) A functional tsx component for an icon.
 */
export function IconItem(
  props: IconItem.IProps & React.HTMLAttributes<HTMLDivElement>
): React.ReactElement<IconItem.IProps> {
  const { source, className, ...rest } = props;
  return (
    <div className={classes(className, source, style(icon()))} {...rest} />
  );
}
