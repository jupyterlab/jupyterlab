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
  props: IconItem.IProps & React.HTMLAttributes<HTMLDivElement>
): React.ReactElement<IconItem.IProps> {
  const { source, className, ...rest } = props;
  return (
    <div className={classes(className, source, style(icon()))} {...rest} />
  );
}

// /**
//  * A namespace for IconItem statics.
//  */
// export namespace SVGIconItem {
//   /**
//    * Props for an IconItem
//    */
//   export interface IProps {
//     /**
//      * The inline svg
//      */
//     src: string;
//   }
// }
//
// export function SVGIconItem(
//   props: SVGIconItem.IProps &
//     React.HTMLAttributes<HTMLImageElement> & {
//     offset: { x: number; y: number };
//   }
// ): React.ReactElement<SVGIconItem.IProps> {
//   const { src, className, offset } = props;
//   return (
//     <img
//      className={classes(className, style(icon(offset)))}
//      src={src}
//     />
//   );
// }

// export default class SVGIcon extends Component {
//   render () {
//     return <Icon className='normal' />;
//   }
// };
