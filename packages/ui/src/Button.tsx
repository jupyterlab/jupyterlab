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
 * The class name added to a pressed button.
 */
const BUTTON_PRESSED_CLASS = 'jp-mod-pressed';


/**
 * The properties of the Button component.
 */
export
interface IButtonProps {
  children: any;
  classNames: string[];
  onClick: (event: React.MouseEvent<HTMLElement>) => void;
  tooltip: string;
}


/**
 * The state of the Button component.
 */
export
interface IButtonState {
  pressed: boolean;
}


/**
 * A base button comopnent.
 */
export
class Button extends React.Component<IButtonProps, IButtonState> {
  state = { pressed: false,  };

  handleClick = (event: React.MouseEvent<HTMLElement>): void => {
    if (this.props.onClick) this.props.onClick(event);
  }
  
  handleMouseDown = (event: React.MouseEvent<HTMLElement>): void => {
    this.setState({ pressed: true });
  }
  
  handleMouseUp = (event: React.MouseEvent<HTMLElement>): void => {
    this.setState({ pressed: false });
  }

  render() {
    const classNames = [...this.props.classNames, UI_CLASS, BUTTON_CLASS];
    if (this.state.pressed) classNames.concat(BUTTON_PRESSED_CLASS);
    return (
      <button 
        className={classNames.join(' ')} 
        onClick={this.handleClick} 
        onMouseDown={this.handleMouseDown}
        onMouseOut={this.handleMouseUp}
        title={this.props.tooltip}
      >
        {this.props.children}
      </button>
    );
  }
}
