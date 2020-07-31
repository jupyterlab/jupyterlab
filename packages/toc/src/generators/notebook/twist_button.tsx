// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as React from 'react';
import { IHeading } from '../../utils/headings';
import { caretDownIcon, caretRightIcon } from '@jupyterlab/ui-components';

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
      <div className="toc-collapse-button" onClick={wrapper}>
        <caretRightIcon.react width="25px" />
      </div>
    );
  }
  return (
    <div className="toc-collapse-button" onClick={wrapper}>
      <caretDownIcon.react width="25px" />
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
