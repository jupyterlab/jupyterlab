// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as React from 'react';
import {
  Button as BPButton,
  IButtonProps as IBPButtonProps
} from '@blueprintjs/core/lib/esm/components/button/buttons';
import {
  Icon as BPIcon,
  IIconProps
} from '@blueprintjs/core/lib/esm/components/icon/icon';
import {
  Collapse as BPCollapse,
  ICollapseProps
} from '@blueprintjs/core/lib/esm/components/collapse/collapse';
import {
  InputGroup as BPInputGroup,
  IInputGroupProps as IBPInputGroupProps
} from '@blueprintjs/core/lib/esm/components/forms/inputGroup';
import {
  HTMLSelect as BPHTMLSelect,
  IHTMLSelectProps
} from '@blueprintjs/core/lib/esm/components/html-select/htmlSelect';
import {
  Select as BPSelect,
  ISelectProps
} from '@blueprintjs/select/lib/esm/components/select/select';
import '@blueprintjs/icons/lib/css/blueprint-icons.css';
import '@blueprintjs/core/lib/css/blueprint.css';
import '../style/index.css';
import { combineClassNames } from './utils';

export { Intent } from '@blueprintjs/core/lib/esm/common/intent';

interface IButtonProps extends IBPButtonProps {
  title?: string;
}

interface IInputGroupProps extends IBPInputGroupProps {
  rightIcon?: IIconProps['icon'];
}

export const Button = (props: IButtonProps) => (
  <BPButton
    {...props}
    className={combineClassNames(
      props.className,
      props.minimal && 'minimal',
      'jp-Button'
    )}
  />
);

export const InputGroup = (props: IInputGroupProps) => {
  if (props.rightIcon) {
    return (
      <BPInputGroup
        {...props}
        className={combineClassNames(props.className, 'jp-InputGroup')}
        rightElement={
          <div className="jp-InputGroupAction">
            <Icon className="jp-Icon" icon={props.rightIcon} />
          </div>
        }
      />
    );
  }
  return (
    <BPInputGroup
      {...props}
      className={combineClassNames(props.className, 'jp-InputGroup')}
    />
  );
};

export const Icon = (props: IIconProps) => (
  <BPIcon
    {...props}
    className={combineClassNames(props.className, 'jp-Icon')}
  />
);

export const Collapse = (props: ICollapseProps) => <BPCollapse {...props} />;

export const HTMLSelect = (props: IHTMLSelectProps) => (
  <BPHTMLSelect
    {...props}
    className={combineClassNames(props.className, 'jp-HTMLSelect')}
  />
);

export const Select = (props: ISelectProps<any>) => (
  <BPSelect
    {...props}
    className={combineClassNames(props.className, 'jp-Select')}
  />
);
