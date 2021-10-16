// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Dialog, ReactWidget } from '@jupyterlab/apputils';
import { CommandRegistry } from '@lumino/commands';

import * as React from 'react';

import { User } from './model';

export const getUserIcon = (user: User.User) => {
  if (user.avatar) {
    return (
      <div key={user.username} className="login-icon">
        <img className="user-img" src={user.avatar} />
      </div>
    );
  }

  if (!user.avatar) {
    return (
      <div
        key={user.username}
        className="login-icon"
        style={{ backgroundColor: user.color }}
      >
        <span>{user.initials}</span>
      </div>
    );
  }
};

export class UserNameInput
  extends ReactWidget
  implements Dialog.IBodyWidget<string> {
  private _name: string;
  private _user: User;
  private _commands: CommandRegistry;

  constructor(user: User, commands: CommandRegistry) {
    super();
    this._user = user;
    this._name = user.name;
    this._commands = commands;
  }

  getValue(): string {
    return this._name;
  }

  private _handleName = (event: React.ChangeEvent<HTMLInputElement>): void => {
    this._name = event.target.value;
    this.update();
  };

  render(): JSX.Element {
    const getButtons = () => {
      return this._user.logInMethods.map(id => {
        return (
          <button
            id="jp-Dialog-button"
            key={id}
            className="jp-mod-reject jp-mod-styled"
            onClick={() => this._commands.execute(id)}
          >
            {this._commands.label(id)}
          </button>
        );
      });
    };

    return (
      <div className="lm-Widget p-Widget jp-Dialog-body jp-Dialog-container">
        <label>Who are you?</label>
        <input
          id="jp-dialog-input-id"
          type="text"
          className="jp-Input-Dialog jp-mod-styled"
          value={this._name}
          onChange={this._handleName}
        />
        <hr />
        {getButtons()}
      </div>
    );
  }
}