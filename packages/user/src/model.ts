// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ISignal, Signal } from '@lumino/signaling';
import { UUID } from '@lumino/coreutils';
import * as env from 'lib0/environment';

import { ICurrentUser, IUser, USER } from './tokens';
import { getAnonymousUserName } from './utils';

/**
 * Default user implementation.
 */
export class User implements ICurrentUser {
  private _username: string;
  private _name: string;
  private _displayName: string;
  private _initials: string;
  private _color: string;
  private _anonymous: boolean;
  private _cursor?: IUser.Cursor;

  private _isReady = false;
  private _ready = new Signal<User, boolean>(this);
  private _changed = new Signal<User, void>(this);

  /**
   * Constructor of the User class.
   */
  constructor() {
    this._fetchUser();
    this._isReady = true;
    this._ready.emit(true);
  }

  /**
   * User's Username.
   */
  get username(): string {
    return this._username;
  }

  /**
   * User's name.
   */
  get name(): string {
    return this._name;
  }

  /**
   * User's last name.
   */
  get displayName(): string {
    return this._displayName;
  }

  /**
   * User's name initials.
   */
  get initials(): string {
    return this._initials;
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
  get ready(): ISignal<ICurrentUser, boolean> {
    return this._ready;
  }

  /**
   * Signal emitted when the user's information changes.
   */
  get changed(): ISignal<ICurrentUser, void> {
    return this._changed;
  }

  /**
   * Convenience method to modify the user as a JSON object.
   */
  fromJSON(user: IUser.User): void {
    this._username = user.username;
    this._name = user.name;
    this._displayName = user.displayName;
    this._initials = user.initials;
    this._color = user.color;
    this._anonymous = user.anonymous;
    this._cursor = user.cursor;
    this._save();
  }

  /**
   * Convenience method to export the user as a JSON object.
   */
  toJSON(): IUser.User {
    return {
      username: this._username,
      name: this.name,
      displayName: this._displayName,
      initials: this._initials,
      color: this._color,
      anonymous: this._anonymous,
      cursor: this._cursor
    };
  }

  /**
   * Saves the user information to StateDB.
   */
  private _save(): void {
    const { localStorage } = window;
    localStorage.setItem(USER, JSON.stringify(this.toJSON()));
    this._changed.emit();
  }

  /**
   * Retrieves the user information from StateDB, or initializes
   * the user as anonymous if doesn't exists.
   */
  private _fetchUser(): void {
    // Read username, color and initials from URL
    let name = decodeURIComponent(env.getParam('--username', ''));
    let color = env.getParam('--usercolor', '');
    let initials = decodeURIComponent(env.getParam('--initials', ''));

    const { localStorage } = window;
    const data = localStorage.getItem(USER);
    if (data !== null) {
      const user = JSON.parse(data);

      this._username = user.username as string;
      this._name = name !== '' ? name : (user.name as string);
      this._displayName = name !== '' ? name : (user.displayName as string);
      this._initials = initials !== '' ? initials : (user.initials as string);
      this._color = color !== '' ? '#' + color : (user.color as string);
      this._anonymous = user.anonymous as boolean;
      this._cursor = (user.cursor as IUser.Cursor) || undefined;

      if (name !== '' || color !== '') {
        this._save();
      }
    } else {
      // Get random values
      const anonymousName = getAnonymousUserName();
      this._username = UUID.uuid4();
      this._name = name !== '' ? name : 'Anonymous ' + anonymousName;
      this._displayName = this._name;
      this._initials =
        initials !== ''
          ? initials
          : `A${anonymousName.substring(0, 1).toLocaleUpperCase()}`;
      this._color =
        '#' + (color !== '' ? color : Private.getRandomColor().slice(1));
      this._anonymous = true;
      this._cursor = undefined;
      this._save();
    }
  }
}

/**
 * A namespace for module-private functionality.
 *
 * Note: We do not want to export this function
 * to move it to css variables in the Theme.
 */
namespace Private {
  /**
   * Predefined colors for users
   */
  const userColors = [
    '#12A0D3',
    '#17AB30',
    '#CC8500',
    '#A79011',
    '#ee6352',
    '#609DA9',
    '#4BA749',
    '#00A1B3'
  ];

  /**
   * Get a random color from the list of colors.
   */
  export const getRandomColor = (): string =>
    userColors[Math.floor(Math.random() * userColors.length)];
}
