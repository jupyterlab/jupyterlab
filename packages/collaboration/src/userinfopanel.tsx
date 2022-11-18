// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ReactWidget } from '@jupyterlab/apputils';

import { User } from '@jupyterlab/services';

import { Panel } from '@lumino/widgets';

import * as React from 'react';

import { UserIconComponent } from './components';

export class UserInfoPanel extends Panel {
  private _profile: User.IManager;
  private _body: UserInfoBody;

  constructor(user: User.IManager) {
    super({});
    this.addClass('jp-UserInfoPanel');

    this._profile = user;

    if (this._profile.isReady) {
      this._body = new UserInfoBody(this._profile.identity!);
      this.addWidget(this._body);
      this.update();
    } else {
      this._profile.ready
        .then(() => {
          this._body = new UserInfoBody(this._profile.identity!);
          this.addWidget(this._body);
          this.update();
        })
        .catch(e => console.error(e));
    }
  }
}

/**
 * A SettingsWidget for the user.
 */
export class UserInfoBody extends ReactWidget {
  private _user: User.IIdentity;

  /**
   * Constructs a new settings widget.
   */
  constructor(user: User.IIdentity) {
    super();
    this._user = user;
  }

  get user(): User.IIdentity {
    return this._user;
  }

  set user(user: User.IIdentity) {
    this._user = user;
    this.update();
  }

  render(): JSX.Element {
    return <UserIconComponent user={this._user} />;
  }
}
