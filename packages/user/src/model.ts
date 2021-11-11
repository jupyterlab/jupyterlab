// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IStateDB } from '@jupyterlab/statedb';
import { ISignal, Signal } from '@lumino/signaling';
import { JSONObject, ReadonlyPartialJSONObject, UUID } from '@lumino/coreutils';

import { IUser, USER } from './tokens';
import { getAnonymousUserName, getRandomColor } from './utils';

/**
 * Default user implementation.
 */
export class User implements IUser {
  private _id: string;
  private _name: string;
  private _username: string;
  private _color: string;
  private _anonymous: boolean;
  private _role: IUser.ROLE;
  private _cursor?: IUser.Cursor;

  private _isReady = false;
  private _state: IStateDB;
  private _ready = new Signal<User, boolean>(this);
  private _changed = new Signal<User, void>(this);

  /**
   * Constructor of the User class.
   *
   * @argument state: IStateDB to store users information.
   */
  constructor(state: IStateDB) {
    this._state = state;
    this._fetchUser().then(() => {
      this._isReady = true;
      this._ready.emit(true);
    });
  }

  /**
   * User's ID.
   */
  get id(): string {
    return this._id;
  }

  /**
   * User's name.
   */
  get name(): string {
    return this._name;
  }

  /**
   * User's Username.
   */
  get username(): string {
    return this._username;
  }

  /**
   * User's cursor color and icon color if avatar_url is undefined
   * (there is no image).
   */
  get color(): string {
    return this._color;
  }

  /**
   * Whether the user is anonymous or not.
   *
   * NOTE: Jupyter server doesn't handle user's identity so, by default every user
   * is anonymous unless a third-party extension provides the ICurrentUser token retrieving
   * the user identity from a third-party identity provider as GitHub, Google, etc.
   */
  get anonymous(): boolean {
    return this._anonymous;
  }

  /**
   * User's role.
   *
   * NOTE: Jupyter Server and JupyterLab doesn't implement a role-base access control (RBAC) yet.
   * This attribute is here to start introducing RBAC to JupyterLab's interface. At the moment every
   * user has the role ADMIN.
   */
  get role(): IUser.ROLE {
    return this._role;
  }

  /**
   * User's cursor position on the document.
   *
   * If undefined, the user is not on a document.
   */
  get cursor(): IUser.Cursor | undefined {
    return this._cursor;
  }

  /**
   * Whether the user information is loaded or not.
   */
  get isReady(): boolean {
    return this._isReady;
  }

  /**
   * Signal emitted when the user's information is ready.
   */
  get ready(): ISignal<IUser, boolean> {
    return this._ready;
  }

  /**
   * Signal emitted when the user's information changes.
   */
  get changed(): ISignal<IUser, void> {
    return this._changed;
  }

  /**
   * Convenience method to modify the user as a JSON object.
   */
  fromJSON(user: IUser.User): void {
    this._name = user.name;
    this._username = user.username;
    this._color = user.color;
    this._anonymous = user.anonymous;
    this._role = user.role;
    this._cursor = user.cursor;
    this._save();
  }

  /**
   * Convenience method to export the user as a JSON object.
   */
  toJSON(): IUser.User {
    return {
      name: this._name,
      username: this._username,
      color: this._color,
      anonymous: this._anonymous,
      role: this._role,
      cursor: this._cursor
    };
  }

  /**
   * Saves the user information to StateDB.
   */
  private async _save(): Promise<void> {
    await this._state.save(USER, this.toJSON() as ReadonlyPartialJSONObject);
    this._changed.emit();
    return Promise.resolve();
  }

  /**
   * Retrieves the user information from StateDB, or initializes
   * the user as anonymous if doesn't exists.
   */
  private async _fetchUser(): Promise<void> {
    const data = (await this._state.fetch(USER)) as JSONObject;
    if (data !== undefined) {
      this._id = data.id as string;

      this._name = data.name as string;
      this._username = data.username as string;
      this._color = data.color as string;
      this._anonymous = data.anonymous as boolean;
      this._role = data.role as IUser.ROLE;
      this._cursor = (data.cursor as IUser.Cursor) || undefined;
      return Promise.resolve();
    } else {
      // Get random values
      this._id = UUID.uuid4();
      this._name = getAnonymousUserName();
      this._username = this._name;
      this._color = '#' + getRandomColor().slice(1);
      this._anonymous = true;
      this._role = IUser.ROLE.ADMIN;
      this._cursor = undefined;
      return this._save();
    }
  }
}
