// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Dialog, ReactWidget } from '@jupyterlab/apputils';
import { IStateDB } from '@jupyterlab/statedb';
import { userIcon } from '@jupyterlab/ui-components';
import { CommandRegistry } from '@lumino/commands';
import { ISignal, Signal } from '@lumino/signaling';
import { JSONObject, ReadonlyPartialJSONObject, UUID } from '@lumino/coreutils';
//import * as env from 'lib0/environment';
import * as React from 'react';

import { IUser, USER } from './tokens';
import { getAnonymousUserName, getRandomColor } from './utils';

export class User implements IUser {
  private _id: string;
  private _name: string;
  private _username: string;
  private _initials: string;
  private _color: string;
  private _anonymous: boolean;
  private _email?: string;
  private _avatar?: string;

  private _familyName?: string;
  private _birthDate?: Date;
  private _gender?: string;
  private _honorificPrefix?: string;
  private _honorificSuffix?: string;
  private _nationality?: string;
  private _affiliation?: string;
  private _jobTitle?: string;
  private _telephone?: string;
  private _address?: string;
  private _description?: string;

  private _isReady = false;
  private _state: IStateDB;
  private _ready = new Signal<User, boolean>(this);
  private _changed = new Signal<User, void>(this);

  private _logInMethods: string[] = [];

  constructor(state: IStateDB) {
    this._state = state;
    //let color = '#' + env.getParam('--usercolor', '');
    //let name = env.getParam('--username', '');
    this._fetchUser().then(() => {
      this._isReady = true;
      this._ready.emit(true);
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
  get anonymous(): boolean {
    return this._anonymous;
  }
  get email(): string | undefined {
    return this._email;
  }
  get avatar(): string | undefined {
    return this._avatar;
  }

  get familyName(): string | undefined {
    return this._familyName;
  }
  get birthDate(): Date | undefined {
    return this._birthDate;
  }
  get gender(): string | undefined {
    return this._gender;
  }
  get honorificPrefix(): string | undefined {
    return this._honorificPrefix;
  }
  get honorificSuffix(): string | undefined {
    return this._honorificSuffix;
  }
  get nationality(): string | undefined {
    return this._nationality;
  }
  get affiliation(): string | undefined {
    return this._affiliation;
  }
  get jobTitle(): string | undefined {
    return this._jobTitle;
  }
  get telephone(): string | undefined {
    return this._telephone;
  }
  get address(): string | undefined {
    return this._address;
  }
  get description(): string | undefined {
    return this._description;
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

  toJSON(): ReadonlyPartialJSONObject {
    return {
      id: this._id,
      name: this._name,
      username: this._username,
      initials: this._initials,
      color: this._color,
      anonymous: this._anonymous,
      email: this._email,
      avatar: this._avatar,
      familyName: this._familyName,
      birthDate: this._birthDate?.toLocaleDateString(),
      gender: this._gender,
      honorificPrefix: this._honorificPrefix,
      honorificSuffix: this._honorificSuffix,
      nationality: this._nationality,
      affiliation: this._affiliation,
      jobTitle: this._jobTitle,
      telephone: this._telephone,
      address: this._address,
      description: this._description
    };
  }

  registerLogInMethod(command: string): void {
    this._logInMethods.push(command);
  }

  rename(value: string) {
    if (this._anonymous) {
      this._name = value;
      this._username = value;
      const name = value.split(' ');
      if (name.length > 0) {
        this._initials = name[0].substring(0, 1).toLocaleUpperCase();
      }
      if (name.length > 1) {
        this._initials += name[1].substring(0, 1).toLocaleUpperCase();
      }
      this._save();
    }
  }

  update(user: User.User) {
    this._id = user.id;
    this._name = user.name;
    this._username = user.username;

    const name = this._name.split(' ');
    if (name.length > 0) {
      this._initials = name[0].substring(0, 1).toLocaleUpperCase();
    }
    if (name.length > 1) {
      this._initials += name[1].substring(0, 1).toLocaleUpperCase();
    }

    this._color = user.color;
    this._anonymous = user.anonymous;
    this._email = user.email;
    this._avatar = user.avatar;

    this._familyName = user.familyName;
    this._birthDate = user.birthDate;
    this._gender = user.gender;
    this._honorificPrefix = user.honorificPrefix;
    this._honorificSuffix = user.honorificSuffix;
    this._nationality = user.nationality;
    this._affiliation = user.affiliation;
    this._jobTitle = user.jobTitle;
    this._telephone = user.telephone;
    this._address = user.address;
    this._description = user.description;

    this._save();
  }

  private _save(): void {
    this._state.save(USER, this.toJSON());
    this._changed.emit();
  }

  private _fetchUser(): Promise<void> {
    return this._state.fetch(USER).then((data: JSONObject) => {
      if (data !== undefined) {
        this._anonymous = (data.anonymous as boolean) || false;

        this._id = data.id as string;
        this._name = data.name as string;
        this._username = (data.username as string) || this._name;

        const name = this._name.split(' ');
        if (name.length > 0) {
          this._initials = name[0].substring(0, 1).toLocaleUpperCase();
        }
        if (name.length > 1) {
          this._initials += name[1].substring(0, 1).toLocaleUpperCase();
        }

        this._color = data.color as string;
        this._email = data.email as string;
        this._avatar = data.avatar as string;
      } else {
        // Get random values
        this._anonymous = true;
        this._id = UUID.uuid4();
        this._name = getAnonymousUserName();
        this._color = '#' + getRandomColor().slice(1);
        this._username = this._name;

        const name = this._name.split(' ');
        if (name.length > 0) {
          this._initials = name[0].substring(0, 1).toLocaleUpperCase();
        }
        if (name.length > 1) {
          this._initials += name[1].substring(0, 1).toLocaleUpperCase();
        }
        this._save();
      }
    });
  }
}

export namespace User {
  export type User = {
    id: string;
    name: string;
    username: string;
    color: string;
    initials?: string;
    anonymous: boolean;
    email?: string;
    avatar?: string;

    familyName?: string;
    birthDate?: Date;
    gender?: string;
    honorificPrefix?: string;
    honorificSuffix?: string;
    nationality?: string;
    affiliation?: string;
    jobTitle?: string;
    telephone?: string;
    address?: string;
    description?: string;
  };
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

export class UserPanel extends ReactWidget {
  private _profile: User;
  private _collaborators: User.User[];

  constructor(user: User) {
    super();
    this.id = 'jp-user-panel';
    this.title.icon = userIcon;
    this.addClass('jp-AuthWidget');

    this._profile = user;
    this._collaborators = [];
  }

  get collaborators(): User.User[] {
    return this._collaborators;
  }

  set collaborators(users: User.User[]) {
    this._collaborators = users;
    this.update();
  }

  render(): JSX.Element {
    return (
      <div className="jp-UserPanel">
        <div className="panel-container">
          {getUserIcon(this._profile)}
          <span className="panel-username">{this._profile.name}</span>
        </div>

        <h5>Collaborators</h5>
        <hr />
        <div className="panel-container">
          {this._collaborators.map(user => {
            if (this._profile.username !== user.username) {
              return getUserIcon(user);
            }
          })}
        </div>
      </div>
    );
  }
}
