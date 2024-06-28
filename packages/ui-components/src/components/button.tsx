/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import React from 'react';
import { classes } from '../utils';

/**
 * Button component property
 */
export interface IButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Whether this button should use minimal styles.
   */
  minimal?: boolean;
  /**
   * Whether this button should use small styles.
   */
  small?: boolean;
}

/**
 * Button component
 *
 * @deprecated You should use the `Button` component from `@jupyter/react-components` instead.
 * @param props Component properties
 * @returns Component
 */
export function Button(props: IButtonProps): JSX.Element {
  const { minimal, small, children, ...others } = props;
  return (
    <button
      {...others}
      className={classes(
        props.className,
        minimal ? 'jp-mod-minimal' : '',
        small ? 'jp-mod-small' : '',
        'jp-Button'
      )}
    >
      {children}
    </button>
  );
}
