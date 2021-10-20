// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IStateDB } from '@jupyterlab/statedb';
import { ISignal, Signal } from '@lumino/signaling';
import { JSONObject, ReadonlyPartialJSONObject, UUID } from '@lumino/coreutils';

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
  private _position?: { cell: number, index: number };

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
  get position(): { cell: number, index: number } | undefined {
    return this._position;
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

  toJSON(): User.User {
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

  rename(value: string): Promise<void> {
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
      return this._save();
    }
    return Promise.reject();
  }

  update(user: User.User): Promise<void> {
    this._id = user.id;
    this._name = user.name;
    this._username = user.username;

    const name = this._name.split(' ');
    const familyName: string = user.familyName
      ? (user.familyName as string)
      : '';
    if (name.length > 0) {
      this._initials = name[0].substring(0, 1).toLocaleUpperCase();
    }
    if (name.length > 1) {
      this._initials += name[1].substring(0, 1).toLocaleUpperCase();
    } else if (familyName.length > 1) {
      this._initials += familyName.substring(0, 1).toLocaleUpperCase();
    }

    this._color = user.color;
    this._anonymous = user.anonymous;
    this._email = user.email;
    this._avatar = user.avatar;

    this._familyName = user.familyName;
    this._birthDate = user.birthDate ? new Date(user.birthDate) : undefined;
    this._gender = user.gender;
    this._honorificPrefix = user.honorificPrefix;
    this._honorificSuffix = user.honorificSuffix;
    this._nationality = user.nationality;
    this._affiliation = user.affiliation;
    this._jobTitle = user.jobTitle;
    this._telephone = user.telephone;
    this._address = user.address;
    this._description = user.description;

    return this._save();
  }

  private async _save(): Promise<void> {
    await this._state.save(USER, this.toJSON() as ReadonlyPartialJSONObject);
    this._changed.emit();
    return Promise.resolve();
  }

  private async _fetchUser(): Promise<void> {
    const data = (await this._state.fetch(USER)) as JSONObject;
    if (data !== undefined) {
      this._anonymous = (data.anonymous as boolean) || false;
      this._id = data.id as string;
      this._name = data.name as string;
      this._username = (data.username as string) || this._name;

      const name = this._name.split(' ');
      const familyName: string = data.familyName
        ? (data.familyName as string)
        : '';
      if (name.length > 0) {
        this._initials = name[0].substring(0, 1).toLocaleUpperCase();
      }
      if (name.length > 1) {
        this._initials += name[1].substring(0, 1).toLocaleUpperCase();
      } else if (familyName.length > 1) {
        this._initials += familyName.substring(0, 1).toLocaleUpperCase();
      }

      this._color = data.color as string;
      this._email = data.email as string;
      this._avatar = data.avatar as string;

      this._familyName = data.familyName as string;
      this._birthDate = new Date(data.birthDate as string);
      this._gender = data.gender as string;
      this._honorificPrefix = data.honorificPrefix as string;
      this._honorificSuffix = data.honorificSuffix as string;
      this._nationality = data.nationality as string;
      this._affiliation = data.affiliation as string;
      this._jobTitle = data.jobTitle as string;
      this._telephone = data.telephone as string;
      this._address = data.address as string;
      this._description = data.description as string;

      return Promise.resolve();
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

      return this._save();
    }
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
    position?: { cell: number, index: number };

    familyName?: string;
    birthDate?: string;
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
