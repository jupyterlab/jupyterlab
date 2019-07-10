// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as React from 'react';
import {
  Button as BPButton,
  IButtonProps as IBPButtonProps
} from '@blueprintjs/core/lib/cjs/components/button/buttons';
import {
  Icon as BPIcon,
  IIconProps
} from '@blueprintjs/core/lib/cjs/components/icon/icon';
import {
  Collapse as BPCollapse,
  ICollapseProps
} from '@blueprintjs/core/lib/cjs/components/collapse/collapse';
import {
  InputGroup as BPInputGroup,
  IInputGroupProps as IBPInputGroupProps
} from '@blueprintjs/core/lib/cjs/components/forms/inputGroup';
import {
  HTMLSelect as BPHTMLSelect,
  IHTMLSelectProps
} from '@blueprintjs/core/lib/cjs/components/html-select/htmlSelect';
import {
  Select as BPSelect,
  ISelectProps
} from '@blueprintjs/select/lib/cjs/components/select/select';
import { combineClasses } from './utils';

export { Intent } from '@blueprintjs/core/lib/cjs/common/intent';

interface IButtonProps extends IBPButtonProps {
  title?: string;
  type?: 'button' | 'submit' | 'reset';
}

interface IInputGroupProps extends IBPInputGroupProps {
  rightIcon?: IIconProps['icon'];
}

type CommonProps<T> = React.DOMAttributes<T>;

export const Button = (props: IButtonProps & CommonProps<any>) => (
  <BPButton
    {...props}
    className={combineClasses(
      props.className,
      props.minimal && 'minimal',
      'jp-Button'
    )}
  />
);

export const InputGroup = (props: IInputGroupProps & CommonProps<any>) => {
  if (props.rightIcon) {
    return (
      <BPInputGroup
        {...props}
        className={combineClasses(props.className, 'jp-InputGroup')}
        rightElement={
          <div className="jp-InputGroupAction">
            <BPIcon className={'jp-Icon'} icon={props.rightIcon} />
          </div>
        }
      />
    );
  }
  return (
    <BPInputGroup
      {...props}
      className={combineClasses(props.className, 'jp-InputGroup')}
    />
  );
};

export const Collapse = (props: ICollapseProps & CommonProps<any>) => (
  <BPCollapse {...props} />
);

export const HTMLSelect = (props: IHTMLSelectProps & CommonProps<any>) => (
  <BPHTMLSelect
    {...props}
    className={combineClasses(props.className, 'jp-HTMLSelect')}
  />
);

export const Select = (props: ISelectProps<any> & CommonProps<any>) => (
  <BPSelect
    {...props}
    className={combineClasses(props.className, 'jp-Select')}
  />
);
