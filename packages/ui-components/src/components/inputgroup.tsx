/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import React from 'react';
import { LabIcon } from '../icon';
import { classes } from '../utils';

/**
 * InputGroup component properties
 */
export interface IInputGroupProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  /**
   * Pass a ref to the input element
   */
  inputRef?: React.RefObject<HTMLInputElement>;
  /**
   * Right icon adornment
   */
  rightIcon?: string | LabIcon;
}

/**
 * InputGroup component
 *
 * @param props Component properties
 * @returns Component
 */
export function InputGroup(props: IInputGroupProps): JSX.Element {
  const { className, inputRef, rightIcon, ...others } = props;
  return (
    <div className={classes('jp-InputGroup', className)}>
      <input ref={inputRef} {...others}></input>
      {rightIcon && (
        <span className="jp-InputGroupAction">
          {typeof rightIcon === 'string' ? (
            <LabIcon.resolveReact
              icon={rightIcon}
              elementPosition="center"
              tag="span"
            />
          ) : (
            <rightIcon.react elementPosition="center" tag="span" />
          )}
        </span>
      )}
    </div>
  );
}
