// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  InputGroup as BPInputGroup,
  IInputGroupProps as IBPInputGroupProps
} from '@blueprintjs/core/lib/cjs/components/forms/inputGroup';
import * as React from 'react';
import { LabIcon } from './icon';
import { classes } from './utils';

interface IInputGroupProps extends IBPInputGroupProps {
  rightIcon?: string;
}

type CommonProps<T> = React.DOMAttributes<T>;

export const InputGroup = (
  props: IInputGroupProps & CommonProps<any>
): JSX.Element => {
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
