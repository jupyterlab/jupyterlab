// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

// import React, { ComponentType, HTMLAttributes } from 'react';
import React from 'react';

import { classes, style } from 'typestyle/lib';

// import { IconRegistry, defaultIconRegistry } from './icon';
import { defaultIconRegistry } from './icon';
import icon from '../style/icon';

// functions for setting up icons

type SvgPropsX = { name: string } & React.HTMLAttributes<SVGElement>;

export function SvgX(props: SvgPropsX): React.ReactElement {
  const { name, className } = props;
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: defaultIconRegistry.svg(name) }}
    />
  );
  // return <div className={className}>{defaultIconRegistry.svg(name)}</div>;
}

export function IconX(
  props: { offset: { x: number; y: number } } & SvgPropsX
): React.ReactElement {
  const { className, offset, ...rest } = props;
  return <SvgX className={classes(className, style(icon(offset)))} {...rest} />;
  // return <div className={ classes(className, style(icon(offset))) }>{defaultIconRegistry.svg(name)}</div>;
}

// export class IconRegistryX extends IconRegistry {
//   iconX(props: IconPropsX): React.ReactElement {
//     const {name, className, offset} = props;
//     return <div className={ classes(className, style(icon(offset))) }>{this.svg(name)}</div>;
//   }
// }
//
// export const defaultIconRegistryX: IconRegistryX = new IconRegistryX();
//
// /**
//  * A namespace for SvgIcon statics.
//  */
// export namespace SvgIcon {
//   /**
//    * Props for an SvgIcon
//    */
//   export interface IProps {
//     /**
//      * The inline svg
//      */
//     Svg: ComponentType<HTMLAttributes<SVGElement>>;
//   }
// }
//
// export function SvgIcon(props: SvgIcon.IProps & IconPropsX): React.ReactElement<SvgIcon.IProps> {
//   const { Svg, className, offset, ...rest } = props;
//   return <Svg className={classes(className, style(icon(offset)))} {...rest} />;
// }
//
// export function IconFactory(
//   props: SvgIcon.IProps
// ): (props: IconPropsX) => React.ReactElement<SvgIcon.IProps> {
//   const { Svg } = props;
//   return (props: IconPropsX) => <SvgIcon Svg={Svg} {...props} />;
// }
