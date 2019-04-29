// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import React, { ComponentType, HTMLAttributes } from 'react';

import { classes, style } from 'typestyle/lib';

import icon from '../style/icon';

import KernelSvg from '../../style/icons/kernel-icon.svg';
import TerminalSvg from '../../style/icons/terminal-icon.svg';

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

// export function KernelIcon(props: IconProps): IconElem {
//   return <SvgIcon Svg={KernelSvg} {...props} />;
// }

// export function TerminalIcon(props: IconProps): IconElem {
//   return <SvgIcon Svg={TerminalSvg} {...props} />;
// }

export const KernelIcon = IconFactory({ Svg: KernelSvg });
export const TerminalIcon = IconFactory({ Svg: TerminalSvg });
