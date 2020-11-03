// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as React from 'react';
import { IHeading } from '../../utils/headings';

/**
 * Callback invoked upon encountering a "click" event.
 *
 * @private
 * @param heading - heading clicked
 */
type onClick = (heading?: IHeading) => void;

/**
 * Interface for properties of the twist button
 */
interface ITwistButtonProps {
  /**
   * Heading that the twist button will be attached to
   */
  heading: IHeading;

  /**
   * Current state of the twist button
   */
  collapsed: boolean;

  /**
   * "Click" handler
   */
  onClick: onClick;
}

/**
 * Renders a twist button.
 *
 * @private
 * @param cellRef - cell reference
 * @param collapsed - boolean indicating whether a ToC item is collapsed
 * @param onClick - "click" handler
 * @returns rendered twist button
 */
function twistButton(props: ITwistButtonProps) {
  if (props.collapsed) {
    return (
      <div className="jp-Collapser p-Widget lm-Widget" onClick={wrapper}>
        <div className="toc-Collapser-child" />
      </div>
    );
  }
  return (
    <div className="jp-Collapser p-Widget lm-Widget" onClick={wrapper}>
      <div className="toc-Collapser-child" />
    </div>
  );

  /**
   * Callback invoked upon encountering a "click" event.
   *
   * @private
   * @param event - event object
   */
  function wrapper(event: any) {
    event.stopPropagation();
    props.onClick(props.heading);
  }
}

/**
 * Exports.
 */
export { twistButton };
