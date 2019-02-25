// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import React, { ComponentType, HTMLAttributes } from 'react';

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
  props: IconItem.IProps & React.HTMLAttributes<HTMLDivElement>
): React.ReactElement<IconItem.IProps> {
  const { source, className, ...rest } = props;
  return (
    <div className={classes(className, source, style(icon()))} {...rest} />
  );
}

/**
 * A namespace for SVGIconItem statics.
 */
export namespace SVGIconItem {
  /**
   * Props for an SVGIconItem
   */
  export interface IProps {
    /**
     * The inline svg
     */
    SVG: ComponentType<HTMLAttributes<SVGElement>>;
  }
}

export function SVGIconItem(
  props: SVGIconItem.IProps &
    React.HTMLAttributes<SVGElement> & {
      offset: { x: number; y: number };
    }
): React.ReactElement<SVGIconItem.IProps> {
  const { SVG, className, offset, ...rest } = props;
  return <SVG className={classes(className, style(icon(offset)))} {...rest} />;
}

export function SVGInputItem(
  props: SVGIconItem.IProps &
    React.HTMLAttributes<SVGElement> &
    React.HTMLAttributes<HTMLInputElement>
): React.ReactElement<SVGIconItem.IProps> {
  const { SVG, className, ...rest } = props;
  return (
    <SVG
      className={classes(className, style(icon({ x: 0, y: 0 })))}
      {...rest}
    />
  );
}
