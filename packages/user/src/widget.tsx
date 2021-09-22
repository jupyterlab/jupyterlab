// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Dialog, ReactWidget } from '@jupyterlab/apputils';

import { URLExt } from '@jupyterlab/coreutils';

import { ServerConnection } from '@jupyterlab/services';

import {
  getAnonymousUserName,
  getRandomColor
} from '@jupyterlab/docprovider/lib/awareness';

import { userIcon } from '@jupyterlab/ui-components';

import { CommandRegistry } from '@lumino/commands';

import { ISignal, Signal } from '@lumino/signaling';

import * as React from 'react';

import { IUser } from './tokens';

export class User implements IUser {
  private _id: string;
  private _name: string;
  private _username: string;
  private _initials: string;
  private _color: string;
  private _email?: string;
  private _avatar?: string;

  private _isAnonymous = true;
  private _isReady = false;
  private _ready = new Signal<User, boolean>(this);
  private _changed = new Signal<User, void>(this);

  private _logInMethods: string[] = [];

  constructor() {
    this._requestUser().then(() => {
      this._ready.emit(this._isReady);
    });
  }

  get id(): string {
    return this._id;
  }
  get name(): string {
    return this._name;
  }
  get username(): string {
    return this._username;
  }
  get initials(): string {
    return this._initials;
  }
  get color(): string {
    return this._color;
  }
  get email(): string | undefined {
    return this._email;
  }
  get avatar(): string | undefined {
    return this._avatar;
  }

  get isAnonymous(): boolean {
    return this._isAnonymous;
  }
  get isReady(): boolean {
    return this._isReady;
  }
  get ready(): ISignal<IUser, boolean> {
    return this._ready;
  }
  get changed(): ISignal<IUser, void> {
    return this._changed;
  }
  get logInMethods(): string[] {
    return this._logInMethods;
  }

  registerLogInMethod(command: string): void {
    this._logInMethods.push(command);
  }

  update() {
    this._requestUser().then(() => {
      this._changed.emit();
    });
  }

  private async _requestUser(): Promise<void> {
    const settings = ServerConnection.makeSettings();
    const requestUrl = URLExt.join(settings.baseUrl, 'auth', 'user');
    return ServerConnection.makeRequest(requestUrl, {}, settings)
      .then(async (resp: any) => {
        if (!resp.ok) {
          return Promise.resolve();
        }

        const data = await resp.json();
        this._isReady = data.initialized;
        this._isAnonymous = data.anonymous;

        this._id = data.id;
        this._name = data.name || getAnonymousUserName();
        this._username = data.username || this._name;

        const name = this._name.split(' ');
        if (name.length > 0) {
          this._initials = name[0].substring(0, 1).toLocaleUpperCase();
        }
        if (name.length > 1) {
          this._initials += name[1].substring(0, 1).toLocaleUpperCase();
        }

        this._color = data.color || getRandomColor();
        this._email = data.email;
        this._avatar = data.avatar;

        return Promise.resolve();
      })
      .catch((err: any) => console.error(err));
  }
}

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

export class UserIcon extends ReactWidget {
  private _profile: User;

  constructor(user: User) {
    super();
    this._profile = user;

    this._profile.ready.connect(() => this.update());
    this._profile.changed.connect(() => this.update());
  }

  render(): React.ReactElement {
    if (this._profile.isReady) {
      return (
        <div className="login-container">
          {getUserIcon(this._profile)}
          <span className="login-username">{this._profile.username}</span>
        </div>
      );
    }

    return (
      <div className="login-container">
        <div className="login-icon">
          <userIcon.react
            className="user-img"
            tag="span"
            width="28px"
            height="28px"
          />
        </div>
      </div>
    );
  }
}

export const getUserIcon = (user: IUser) => {
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
