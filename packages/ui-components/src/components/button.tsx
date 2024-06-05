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
 * @param props Component properties
 * @returns Component
 */
export function Button(props: IButtonProps): JSX.Element {
  const { small, children, className, ...others } = props;
  return (
    <Button
      {...others}
      className={classes(className, small ? 'jp-mod-small' : '', 'jp-Button')}
    >
      {children}
    </Button>
  );
}
