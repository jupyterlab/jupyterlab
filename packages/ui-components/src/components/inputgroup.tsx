import React from 'react';
import { LabIcon } from '..';
import { classes } from '../utils';

export interface IInputGroupProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  rightIcon?: string | LabIcon;
}

export function InputGroup(props: IInputGroupProps): JSX.Element {
  const { className, rightIcon, ...others } = props;
  return (
    <div className={classes('jp-InputGroup', className)}>
      <input {...others}></input>
      {rightIcon && (
        <span className="jp-InputGroupAction">
          {typeof rightIcon === 'string' ? (
            <LabIcon.resolveReact
              icon={rightIcon}
              elementPosition="center"
              tag="span"
            />
          ) : (
            <rightIcon.react elementPosition="center" tag="span" />
          )}
        </span>
      )}
    </div>
  );
}
