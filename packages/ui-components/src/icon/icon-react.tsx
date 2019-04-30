// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import React, { ComponentType, HTMLAttributes } from 'react';

import { classes, style } from 'typestyle/lib';

import icon from '../style/icon';

// icon svg imports

import HTML5SvgX from '../../style/icons/html5-icon.svg';
import KernelSvgX from '../../style/icons/kernel-icon.svg';
import NotTrustedSvgX from '../../style/icons/not-trusted-icon.svg';
import TerminalSvgX from '../../style/icons/terminal-icon.svg';
import TrustedSvgX from '../../style/icons/trusted-icon.svg';

import _LineFormSvgX from '../../style/icons/line-form.svg';

// functions that produce/export React icons

export const HTML5IconX = IconFactory({ Svg: HTML5SvgX });
export const KernelIconX = IconFactory({ Svg: KernelSvgX });
export const NotTrustedIconX = IconFactory({ Svg: NotTrustedSvgX });
export const TerminalIconX = IconFactory({ Svg: TerminalSvgX });
export const TrustedIconX = IconFactory({ Svg: TrustedSvgX });

export const LineFormSvgX = _LineFormSvgX;

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
