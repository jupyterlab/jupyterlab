// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Button as BPButton,
  IButtonProps as IBPButtonProps
} from '@blueprintjs/core/lib/cjs/components/button/buttons';
import {
  Collapse as BPCollapse,
  ICollapseProps
} from '@blueprintjs/core/lib/cjs/components/collapse/collapse';
import {
  Checkbox as BPCheckbox,
  ICheckboxProps
} from '@blueprintjs/core/lib/cjs/components/forms/controls';
import {
  InputGroup as BPInputGroup,
  IInputGroupProps as IBPInputGroupProps
} from '@blueprintjs/core/lib/cjs/components/forms/inputGroup';
import {
  Select as BPSelect,
  ISelectProps
} from '@blueprintjs/select/lib/cjs/components/select/select';
import * as React from 'react';
import { LabIcon } from './icon';
import { classes } from './utils';
export { Intent } from '@blueprintjs/core/lib/cjs/common/intent';

interface IButtonProps extends IBPButtonProps {
  title?: string;
  type?: 'button' | 'submit' | 'reset';
}

interface IInputGroupProps extends IBPInputGroupProps {
  rightIcon?: string;
}

type CommonProps<T> = React.DOMAttributes<T>;

export const Button = (props: IButtonProps & CommonProps<any>) => (
  <BPButton
    {...props}
    className={classes(
      props.className,
      props.minimal ? 'minimal' : '',
      'jp-Button'
    )}
  />
);

export const InputGroup = (props: IInputGroupProps & CommonProps<any>) => {
  if (props.rightIcon) {
    return (
      <BPInputGroup
        {...props}
        className={classes(props.className, 'jp-InputGroup')}
        rightElement={
          <div className="jp-InputGroupAction">
            <LabIcon.resolveReact icon={props.rightIcon} />
          </div>
        }
      />
    );
  }
  return (
    <BPInputGroup
      {...props}
      className={classes(props.className, 'jp-InputGroup')}
    />
  );
};

export const Collapse = (props: ICollapseProps & CommonProps<any>) => (
  <BPCollapse {...props} />
);

export const Select = (props: ISelectProps<any> & CommonProps<any>) => (
  <BPSelect {...props} className={classes(props.className, 'jp-Select')} />
);

export const Checkbox = (props: ICheckboxProps & CommonProps<any>) => (
  <BPCheckbox {...props} className={classes(props.className, 'jp-Checkbox')} />
);
