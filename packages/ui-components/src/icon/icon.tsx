// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import React, { ComponentType, HTMLAttributes } from 'react';

import { classes, style } from 'typestyle/lib';

import icon from '../style/icon';
import KernelSvg from '../../style/icons/kernel-icon.svg';

/**
 * A namespace for SvgIcon statics.
 */
export namespace SvgIcon {
  /**
   * Props for an SvgIcon
   */
  export interface IProps {
    /**
     * The inline svg
     */
    SVG: ComponentType<HTMLAttributes<SVGElement>>;
  }
}

export function SvgIcon(
  props: SvgIcon.IProps &
    React.HTMLAttributes<SVGElement> & {
      offset: { x: number; y: number };
    }
): React.ReactElement<SvgIcon.IProps> {
  const { SVG, className, offset, ...rest } = props;
  return <SVG className={classes(className, style(icon(offset)))} {...rest} />;
}

export function KernelIcon(
  props: React.HTMLAttributes<SVGElement> & {
    offset: { x: number; y: number };
  }
): React.ReactElement<SvgIcon.IProps> {
  return <SvgIcon SVG={KernelSvg} {...props} />;
}
