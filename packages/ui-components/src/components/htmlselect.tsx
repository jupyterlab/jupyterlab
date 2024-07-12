// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as React from 'react';
import { caretDownEmptyIcon, LabIcon } from '../icon';
import { classes } from '../utils';
import { DEFAULT_STYLE_CLASS, IElementRefProps } from './interface';

export const HTML_SELECT_CLASS = 'jp-HTMLSelect';

export interface IOptionProps {
  /**
   * A space-delimited list of class names
   */
  className?: string;

  /**
   * Whether this option is non-interactive.
   */
  disabled?: boolean;

  /**
   * Label text for this option. If omitted, `value` is used as the label.
   */
  label?: string;

  /**
   * Value of this option.
   */
  value: string | number;
}

export interface IHTMLSelectProps
  extends IElementRefProps<HTMLSelectElement>,
    React.SelectHTMLAttributes<HTMLSelectElement> {
  defaultStyle?: boolean;

  iconProps?: LabIcon.IProps;

  icon?: LabIcon;

  options?: Array<string | number | IOptionProps>;
}

export class HTMLSelect extends React.Component<IHTMLSelectProps> {
  public render(): JSX.Element {
    const {
      className,
      defaultStyle = true,
      disabled,
      elementRef,
      iconProps,
      icon = caretDownEmptyIcon,
      options = [],
      ...htmlProps
    } = this.props;

    const cls = classes(
      HTML_SELECT_CLASS,
      {
        [DEFAULT_STYLE_CLASS]: defaultStyle
      },
      className
    );

    // If the HTMLSelect is integrated to a toolbar, we avoid propagating the focus
    // to the element with tabindex=0.
    const handleFocus = (event: React.FocusEvent) => {
      event.stopPropagation();
    };

    const optionChildren = options.map(option => {
      const props: IOptionProps =
        typeof option === 'object' ? option : { value: option };
      return (
        <option {...props} key={props.value}>
          {props.label || props.value}
        </option>
      );
    });

    return (
      <div className={cls}>
        <select
          onFocus={handleFocus}
          disabled={disabled}
          ref={elementRef}
          {...htmlProps}
          multiple={false}
        >
          {optionChildren}
          {htmlProps.children}
        </select>
        <icon.react
          {...{
            tag: 'span',
            stylesheet: 'select',
            right: '4px',
            top: '8px',
            ...iconProps
          }}
        />
      </div>
    );
  }
}
