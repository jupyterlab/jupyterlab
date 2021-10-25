// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { DOMUtils } from '@jupyterlab/apputils';
import { userIcon } from '@jupyterlab/ui-components';

import * as React from 'react';

import { User } from './model';
import { IUser } from './tokens';
import { getInitials } from './utils';

/**
 * Function that returns the user icon from the user.
 *
 * @returns The React component
 */
export const getUserIcon = (user: IUser | IUser.User) => {
  const isReady = (user instanceof User) ? user.isReady : true;

  if (isReady && user.avatar_url) {
    return (
      <div
        key={user.id}
        className="login-icon"
      >
        <img className="user-img" src={user.avatar_url} />
      </div>
    );

  } else if (isReady) {
    return (
      <div
        key={user.id}
        className="login-icon"
        style={{ backgroundColor: user.color }}
      >
        <span>{getInitials(user.name)}</span>
      </div>
    );
  } else {
    return (
      <div 
        key={DOMUtils.createDomID()}
        className="login-icon"
      >
        <userIcon.react
          className="user-img"
          tag="span"
          width="25px"
          height="25px"
        />
      </div>
    );
  }
};

type Props = {
  user: IUser.User;
  handlerColor: (event: any) => void;
};

/**
 * React component for the user color picker.
 *
 * @returns The React component
 */
export const ColorPickerComponent: React.FC<Props> = props => {
  const { user, handlerColor } = props;
  const inputRef = React.useRef(null);

  const openPicker = () => {
    if (inputRef.current) {
      // @ts-ignore
      inputRef.current.click();
    }
  };

  return (
    <div
      title="Select color"
      onClick={openPicker}
      className="jp-UserInfo-Icon"
      style={{ backgroundColor: user.color }}
    >
      <input
        ref={inputRef}
        onChange={handlerColor}
        type="color"
        value={user.color}
      />
      <span>{getInitials(user.name)}</span>
    </div>
  );
};