// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as React from 'react';
import { default as MButton, ButtonProps } from '@material-ui/core/Button';
import {
  default as MIcon,
  IconProps as IIconProps
} from '@material-ui/core/Icon';
import {
  default as MCollapse,
  CollapseProps
} from '@material-ui/core/Collapse';
import { default as Input, InputProps } from '@material-ui/core/Input';
import InputAdornment from '@material-ui/core/InputAdornment';
import { default as MSelect, SelectProps } from '@material-ui/core/Select';
import { combineClassNames } from './utils';

interface IButtonProps extends ButtonProps {
  title?: string;
  type?: 'button' | 'submit' | 'reset';
}

interface IInputGroupProps extends InputProps {
  className: string;
  rightIcon?: any;
}

type CommonProps<T> = React.DOMAttributes<T>;

export const Button = (props: IButtonProps & CommonProps<any>) => (
  <MButton
    {...props}
    className={combineClassNames(props.className, 'jp-Button')}
  />
);

export const InputGroup = (props: IInputGroupProps & CommonProps<any>) => {
  const { rightIcon, ...oprops } = props;

  if (rightIcon) {
    return (
      <Input
        {...oprops}
        className={combineClassNames(oprops.className, 'jp-InputGroup')}
        disableUnderline={true}
        endAdornment={
          <InputAdornment position="end" disablePointerEvents={true}>
            <Icon>{rightIcon}</Icon>
          </InputAdornment>
        }
      />
    );
  }
  return (
    <Input
      {...oprops}
      disableUnderline={true}
      className={combineClassNames(oprops.className, 'jp-InputGroup')}
    />
  );
};

export const Icon = (props: IIconProps) => (
  <MIcon {...props} className={combineClassNames(props.className, 'jp-Icon')} />
);

export const Collapse = (props: CollapseProps & CommonProps<any>) => (
  <MCollapse {...props} />
);

export const HTMLSelect = (props: SelectProps & CommonProps<any>) => (
  <MSelect
    native
    {...props}
    input={
      <Input {...(props.inputProps as InputProps)} disableUnderline={true} />
    }
    className={combineClassNames(props.className, 'jp-HTMLSelect')}
  />
);

export const Select = (props: SelectProps & CommonProps<any>) => (
  <MSelect
    {...props}
    className={combineClassNames(props.className, 'jp-Select')}
  />
);
