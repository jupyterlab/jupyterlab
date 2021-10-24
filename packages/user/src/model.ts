// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IStateDB } from '@jupyterlab/statedb';
import { ISignal, Signal } from '@lumino/signaling';
import { JSONObject, ReadonlyPartialJSONObject, UUID } from '@lumino/coreutils';

import { IUser, USER } from './tokens';
import { getAnonymousUserName, getRandomColor } from './utils';

export class User implements IUser {
  private _id: string;
  private _username: string;
  private _color: string;
  private _anonymous: boolean;
  private _role: IUser.ROLE;
  private _cursor?: IUser.Cursor;

  private _isReady = false;
  private _state: IStateDB;
  private _ready = new Signal<User, boolean>(this);
  private _changed = new Signal<User, void>(this);

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
  get username(): string {
    return this._username;
  }
  get color(): string {
    return this._color;
  }
  get anonymous(): boolean {
    return this._anonymous;
  }
  get role(): IUser.ROLE {
    return this._role;
  }
  get cursor(): IUser.Cursor | undefined {
    return this._cursor;
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

  fromJSON(user: IUser.User): void {
    this._id = user.id;
    this._username = user.username;
    this._color = user.color;
    this._anonymous = user.anonymous;
    this._role = user.role;
    this._cursor = user.cursor;
    this._save();
  }

  toJSON(): IUser.User {
    return {
      id: this._id,
      username: this._username,
      color: this._color,
      anonymous: this._anonymous,
      role: this._role,
      cursor: this._cursor
    };
  }

  private async _save(): Promise<void> {
    await this._state.save(USER, this.toJSON() as ReadonlyPartialJSONObject);
    this._changed.emit();
    return Promise.resolve();
  }

  private async _fetchUser(): Promise<void> {
    const data = (await this._state.fetch(USER)) as JSONObject;
    if (data !== undefined) {
      this._id = data.id as string;
      this._username = data.username as string;
      this._color = data.color as string;
      this._anonymous = data.anonymous as boolean;
      this._role = data.role as IUser.ROLE;
      this._cursor = (data.cursor as IUser.Cursor) || undefined;
      return Promise.resolve();

    } else {
      // Get random values
      this._id = UUID.uuid4();
      this._username = getAnonymousUserName();
      this._color = '#' + getRandomColor().slice(1);
      this._anonymous = true;
      this._role = IUser.ROLE.execute;
      this._cursor = undefined;
      return this._save();
    }
  }
}
