// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { JSONExt, ReadonlyJSONObject } from '@lumino/coreutils';
import { Poll } from '@lumino/polling';
import { ISignal, Signal } from '@lumino/signaling';

import { BaseManager } from '../basemanager';
import { ServerConnection } from '../serverconnection';
import * as User from './user';
import { UserAPIClient } from './restapi';

/**
 * The service's ID.
 * Used to uniquely identify the poll, and
 * the item in local storage.
 */
const SERVICE_ID = '@jupyterlab/services:UserManager#user';

/**
 * The user API service manager.
 */
export class UserManager extends BaseManager implements User.IManager {
  /**
   * Create a new user manager.
   */
  constructor(options: UserManager.IOptions = {}) {
    super(options);

    this._userApiClient =
      options.userApiClient ??
      new UserAPIClient({ serverSettings: this.serverSettings });

    // Initialize internal data.
    this._ready = this.requestUser()
      .then(() => {
        if (this.isDisposed) {
          return;
        }
        this._isReady = true;
      })
      .catch(
        _ =>
          // Return a promise that will never resolve, so user service is never ready
          // This typically occurs when the backend has no user service
          new Promise(() => {
            // no-op
          })
      );

    this._pollUser = new Poll({
      auto: false,
      factory: () => this.requestUser(),
      frequency: {
        interval: 61 * 1000,
        backoff: true,
        max: 300 * 1000
      },
      name: SERVICE_ID,
      standby: options.standby ?? 'when-hidden'
    });

    void this.ready.then(() => {
      void this._pollUser.start();
    });
  }

  /**
   * The server settings for the manager.
   */
  readonly serverSettings: ServerConnection.ISettings;

  /**
   * Test whether the manager is ready.
   */
  get isReady(): boolean {
    return this._isReady;
  }

  /**
   * A promise that fulfills when the manager is ready.
   */
  get ready(): Promise<void> {
    return this._ready;
  }

  /**
   * Get the most recently fetched identity.
   */
  get identity(): User.IIdentity | null {
    return this._identity;
  }

  /**
   * Get the most recently fetched permissions.
   */
  get permissions(): ReadonlyJSONObject | null {
    return this._permissions;
  }

  /**
   * A signal emitted when the user changes.
   */
  get userChanged(): ISignal<this, User.IUser> {
    return this._userChanged;
  }

  /**
   * A signal emitted when there is a connection failure.
   */
  get connectionFailure(): ISignal<this, Error> {
    return this._connectionFailure;
  }

  /**
   * Dispose of the resources used by the manager.
   */
  dispose(): void {
    this._pollUser.dispose();
    super.dispose();
  }

  /**
   * Force a refresh of the user data from the server.
   *
   * @returns A promise that resolves when the user info is fetched.
   *
   * #### Notes
   * This is intended to be called only in response to a user action,
   * since the manager maintains its internal state.
   */
  async refreshUser(): Promise<void> {
    await this._pollUser.refresh();
    await this._pollUser.tick;
  }

  /**
   * Execute a request to the server to poll the user and update state.
   */
  protected async requestUser(): Promise<void> {
    if (this.isDisposed) {
      return;
    }

    const oldUser: User.IUser = {
      identity: this._identity,
      permissions: this._permissions
    };
    const newUser = await this._userApiClient.get();
    const identity = newUser.identity as Private.Writable<User.IIdentity>;

    // store the color and initials for the user
    // this info is not provided by the server
    const { localStorage } = window;
    const data = localStorage.getItem(SERVICE_ID);

    if (data && (!identity.initials || !identity.color)) {
      const localUser = JSON.parse(data);
      identity.initials =
        identity.initials ||
        localUser.initials ||
        identity.name.substring(0, 1);
      identity.color =
        identity.color || localUser.color || Private.getRandomColor();
    }

    if (
      !JSONExt.deepEqual(
        newUser as Private.WithStringIndex<User.IUser>,
        oldUser as Private.WithStringIndex<User.IUser>
      )
    ) {
      this._identity = identity;
      this._permissions = newUser.permissions;
      localStorage.setItem(SERVICE_ID, JSON.stringify(identity));
      this._userChanged.emit(newUser);
    }
  }

  private _isReady = false;
  private _ready: Promise<void>;
  private _pollUser: Poll;

  private _identity: User.IIdentity;
  private _permissions: ReadonlyJSONObject;

  private _userChanged = new Signal<this, User.IUser>(this);
  private _connectionFailure = new Signal<this, Error>(this);

  private _userApiClient: User.IUserAPIClient;
}

/**
 * A namespace for `UserManager` statics.
 */
export namespace UserManager {
  /**
   * The instantiation options for a user manager.
   */
  export interface IOptions extends BaseManager.IOptions {
    /**
     * When the manager stops polling the API. Defaults to `when-hidden`.
     */
    standby?: Poll.Standby | (() => boolean | Poll.Standby);

    /**
     * The user API client.
     */
    userApiClient?: User.IUserAPIClient;
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
    'var(--jp-collaborator-color1)',
    'var(--jp-collaborator-color2)',
    'var(--jp-collaborator-color3)',
    'var(--jp-collaborator-color4)',
    'var(--jp-collaborator-color5)',
    'var(--jp-collaborator-color6)',
    'var(--jp-collaborator-color7)'
  ];

  /**
   * Get a random color from the list of colors.
   */
  export const getRandomColor = (): string =>
    userColors[Math.floor(Math.random() * userColors.length)];

  export type Writable<T> = {
    -readonly [K in keyof T]: T[K];
  };

  export type WithStringIndex<T> = T & { [key: string]: T[keyof T] };
}
