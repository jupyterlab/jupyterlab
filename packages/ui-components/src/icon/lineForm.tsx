// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import React, { ComponentType, HTMLAttributes } from 'react';

import {
  lineFormButtonDiv,
  lineFormButtonIcon,
  lineFormButton
} from '../style/lineForm';

import LineFormSvg from '../../style/icons/line-form.svg';

/**
 * A namespace for LineFormButtonItem statics.
 */
export namespace LineFormButtonItem {
  /**
   * Props for an LineFormButtonItem
   */
  export interface IProps {
    /**
     * The inline svg
     */
    SVG: ComponentType<HTMLAttributes<SVGElement>>;

    /**
     * The input type
     */
    type: string;

    /**
     * The input value
     */
    value: string;
  }
}

export function GenericButton(
  props: LineFormButtonItem.IProps &
    React.HTMLAttributes<SVGElement> &
    React.HTMLAttributes<HTMLInputElement>
): React.ReactElement<LineFormButtonItem.IProps> {
  const { SVG, type, value, ...rest } = props;
  return (
    <div className={lineFormButtonDiv}>
      <SVG className={lineFormButtonIcon} {...rest} />
      <input type={type} className={lineFormButton} value={value} />
    </div>
  );
}

export function LineFormButton(
  props: { type: string; value: string } & React.HTMLAttributes<SVGElement> &
    React.HTMLAttributes<HTMLInputElement>
): React.ReactElement<LineFormButtonItem.IProps> {
  return <GenericButton SVG={LineFormSvg} {...props} />;
}
