// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as React from 'react';

import { IUser } from './tokens';
import { getInitials } from './utils';

export const getUserIcon = (user: IUser.User) => {
  if (user.avatar_url) {
    return (
      <div key={user.username} className="login-icon">
        <img className="user-img" src={user.avatar_url} />
      </div>
    );
  }

  if (!user.avatar_url) {
    return (
      <div
        key={user.username}
        className="login-icon"
        style={{ backgroundColor: user.color }}
      >
        <span>{getInitials(user.username)}</span>
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
      <span>{getInitials(user.username)}</span>
    </div>
  );
};