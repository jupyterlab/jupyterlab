// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as React from 'react';

/**
 * The class name added to all UI components.
 */
const UI_CLASS = 'jp-ui';

/**
 * The class name added to buttons.
 */
const BUTTON_CLASS = 'jp-button';

/**
 * The class name added to styled buttons.
 */
const STYLED_CLASS = 'jp-mod-styled';


/**
 * The properties of the Button component.
 */
export
interface IButtonProps {
  children?: any;
  className?: string;
  onClick?: (event?: React.MouseEvent<HTMLElement>) => void;
  tooltip?: string;
  [key: string]: any;
}

export type ButtonProps = IButtonProps & React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>;


/**
 * A base button comopnent.
 */
export
const Button = (props: ButtonProps) => {
  const {
    className,
    tooltip,
    ...buttonProps
  } = props;
  const classNames = [...className.split(' '), UI_CLASS, BUTTON_CLASS, STYLED_CLASS];
  return (
    <button
      className={classNames.join(' ')}
      onClick={(event?: React.MouseEvent<HTMLElement>): void => {
        if (props.onClick) {
          props.onClick(event);
        }
      }}
      title={tooltip}
      {...buttonProps}
    >
      {props.children}
    </button>
  );
};
