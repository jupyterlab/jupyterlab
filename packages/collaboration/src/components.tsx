// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as React from 'react';

import { IUser } from './tokens';

type Props = {
  user: IUser.User;
};

/**
 * React component for the user icon.
 *
 * @returns The React component
 */
export const UserIconComponent: React.FC<Props> = props => {
  const { user } = props;

  return (
    <div className="jp-UserInfo-Container">
      <div
        title={user.displayName}
        className="jp-UserInfo-Icon"
        style={{ backgroundColor: user.color }}
      >
        <span>{user.initials}</span>
      </div>
      <h3>{user.displayName}</h3>
    </div>
  );
};
