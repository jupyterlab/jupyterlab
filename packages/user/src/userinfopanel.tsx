// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ReactWidget } from '@jupyterlab/apputils';
import { ToolbarButton, saveIcon } from '@jupyterlab/ui-components';

import * as React from 'react';

import { IUser } from './tokens';
import { ColorPickerComponent } from './components';
import { PanelWithToolbar } from './panelwithtoolbar';

export class UserInfoPanel extends PanelWithToolbar {
	private _profile: IUser;
	private _body: UserInfoBody;

  constructor(user: IUser) {
    super({});
    this.title.label = "User info";
    this.title.caption = "Change username and color";
    this.addClass('jp-UserInfoPanel');

    this._profile = user;

    this.toolbar.addItem(
      'save',
      new ToolbarButton({
        tooltip: 'Save user settings',
        icon: saveIcon,
        onClick: this._onSave,
        actualOnClick: true
      })
    );

		this._profile.ready.connect((user) => {
      this._body = new UserInfoBody(user.toJSON());
      this.addWidget(this._body);
      this.update();
    });
		this._profile.changed.connect((user) => {
      this._body.user = user.toJSON();
      this.update();
    });
  }

  private _onSave = () => {
    this._profile.fromJSON(this._body.user);
  };
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

  private _handlerColor = (event: any) => {
    this._user.color = event.target.value;
    this.update();
  };

  private _handlerName = (event: any) => {
    this._user.name = event.target.value;
    this.update();
  };

  render(): JSX.Element {
    return (
      <div className="jp-UserInfo-Container">
        <ColorPickerComponent
          user={this._user}
          handlerColor={this._handlerColor}
        />

        <div className="jp-UserInfo-Info">
          <label>Name</label>
          <input
            onChange={this._handlerName}
            value={this._user.name}
            disabled={!this._user.anonymous}
          ></input>
        </div>
      </div>
    );
  }
}
