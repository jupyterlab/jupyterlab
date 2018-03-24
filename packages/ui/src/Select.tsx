// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as React from 'react';

/**
 * The class name added to all UI components.
 */
const UI_CLASS = 'jp-ui';

/**
 * The class name added to wrapper div.
 */
const WRAPPER_CLASS = 'jp-select-wrapper';

/**
 * The class name added to styled select.
 */
const STYLED_CLASS = 'jp-mod-styled';

/**
 * The class name added to a focused select element.
 */
const SELECT_FOCUSED_CLASS = 'jp-mod-focused';

/**
 * The properties of the Select component.
 */
export interface ISelectProps {
  children?: any;
  className?: string;
  onChange?: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  onKeydown?: (event: React.KeyboardEvent<HTMLSelectElement>) => void;
  options: string[];
  selected?: string;
  [prop: string]: any;
}

/**
 * The state of the Select component.
 */
export interface ISelectState {
  focused: boolean;
  selected: string;
}

/**
 * A base select comopnent.
 */
export class Select extends React.Component<ISelectProps, ISelectState> {
  constructor(props: ISelectProps) {
    super(props);
    this.state = {
      focused: false,
      selected: props.selected || props.options[0]
    };
  }

  static defaultProps: ISelectProps = {
    className: '',
    options: []
  };

  handleChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    const { value } = event.target;
    this.setState({ selected: value });
    if (this.props.onChange) {
      this.props.onChange(event);
    }
  }

  handleKeyDown = (event: React.KeyboardEvent<HTMLSelectElement>): void => {
    if (this.props.onKeyDown) {
      this.props.onKeyDown(event);
    }
  }

  handleFocus = (event?: React.FocusEvent<HTMLSelectElement>): void => {
    this.setState({ focused: event.type === 'focus' });
  }

  render() {
    const {
      className,
      onChange,
      options,
      selected,
      ...props
    } = this.props;
    const classNames = [...className.split(' '), UI_CLASS, STYLED_CLASS];
    if (this.state.focused) {
      classNames.concat(SELECT_FOCUSED_CLASS);
    }
    return (
      <div className={WRAPPER_CLASS}>
        <select
          className={classNames.join(' ')}
          onChange={this.handleChange}
          onFocus={this.handleFocus}
          value={selected || this.state.selected}
          {...props}
        >
          {options.map((text, index) => (
            <option key={index} value={text.toLowerCase()}>{text}</option>
          ))}
        </select>
      </div>
    );
  }
}
