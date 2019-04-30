// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import React, { ComponentType, HTMLAttributes } from 'react';

import { classes, style } from 'typestyle/lib';

import icon from '../style/icon';

// icon svg imports

import KernelSvg from '../../style/icons/kernel-icon.svg';
import _LineFormSvg from '../../style/icons/line-form.svg';
import TerminalSvg from '../../style/icons/terminal-icon.svg';

// functions for setting up icons

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
    Svg: ComponentType<HTMLAttributes<SVGElement>>;
  }
}

type IconProps = React.HTMLAttributes<SVGElement> & {
  offset: { x: number; y: number };
};
type IconElem = React.ReactElement<SvgIcon.IProps>;

export function SvgIcon(props: SvgIcon.IProps & IconProps): IconElem {
  const { Svg, className, offset, ...rest } = props;
  return <Svg className={classes(className, style(icon(offset)))} {...rest} />;
}

export function IconFactory(
  props: SvgIcon.IProps
): (props: IconProps) => IconElem {
  const { Svg } = props;
  return (props: IconProps) => <SvgIcon Svg={Svg} {...props} />;
}

// functions that produce the actual icon React elements

export const KernelIcon = IconFactory({ Svg: KernelSvg });
export const LineFormSvg = _LineFormSvg;
export const TerminalIcon = IconFactory({ Svg: TerminalSvg });
