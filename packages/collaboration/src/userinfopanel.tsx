// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ReactWidget } from '@jupyterlab/apputils';

import * as React from 'react';

import { ICurrentUser, IUser } from './tokens';
import { UserIconComponent } from './components';
import { Panel } from '@lumino/widgets';

export class UserInfoPanel extends Panel {
  private _profile: ICurrentUser;
  private _body: UserInfoBody;

  constructor(user: ICurrentUser) {
    super({});
    this.title.label = 'User info';
    this.title.caption = 'User information';
    this.addClass('jp-UserInfoPanel');

    this._profile = user;

    if (this._profile.isReady) {
      this._body = new UserInfoBody(user.toJSON());
      this.addWidget(this._body);
      this.update();
    } else {
      this._profile.ready.connect(user => {
        this._body = new UserInfoBody(user.toJSON());
        this.addWidget(this._body);
        this.update();
      });
    }
  }
}

/**
 * A SettingsWidget for the user.
 */
export class UserInfoBody extends ReactWidget {
  private _user: IUser.User;

  /**
   * Constructs a new settings widget.
   */
  constructor(user: IUser.User) {
    super();
    this._user = user;
  }

  get user(): IUser.User {
    return this._user;
  }

  set user(user: IUser.User) {
    this._user = user;
    this.update();
  }

  render(): JSX.Element {
    return <UserIconComponent user={this._user} />;
  }
}
