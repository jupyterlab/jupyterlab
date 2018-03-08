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


/**
 * A base button comopnent.
 */
export
class Button extends React.Component<IButtonProps> {
  static defaultProps = {
    className: '',
    tooltip: ''
   };

  handleClick = (event?: React.MouseEvent<HTMLElement>): void => {
    if (this.props.onClick) {
      this.props.onClick(event);
    }
  }

  render() {
    const classNames = [...this.props.className.split(' '), UI_CLASS, BUTTON_CLASS, STYLED_CLASS];
    return (
      <button
        className={classNames.join(' ')}
        onClick={this.handleClick}
        title={this.props.tooltip}
      >
        {this.props.children}
      </button>
    );
  }
}
