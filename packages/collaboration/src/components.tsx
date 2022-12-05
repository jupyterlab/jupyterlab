// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { User } from '@jupyterlab/services';

import * as React from 'react';

type Props = {
  user: User.IIdentity;
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
        title={user.display_name}
        className="jp-UserInfo-Icon"
        style={{ backgroundColor: user.color }}
      >
        <span>{user.initials}</span>
      </div>
      <h3>{user.display_name}</h3>
    </div>
  );
};
