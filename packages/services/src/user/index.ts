// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { URLExt } from '@jupyterlab/coreutils';

import {
  JSONExt,
  PartialJSONObject,
  ReadonlyJSONObject
} from '@lumino/coreutils';

import { Poll } from '@lumino/polling';

import { ISignal, Signal } from '@lumino/signaling';

import { ServerConnection } from '../serverconnection';

import { BaseManager, IManager as IBaseManager } from '../basemanager';

/**
 * The url for the lab workspaces service.
 */
const SERVICE_USER_URL = 'api/me';

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
  private _isReady = false;
  private _ready: Promise<void>;
  private _pollSpecs: Poll;

  private _identity: User.IIdentity;
  private _permissions: ReadonlyJSONObject;

  private _userChanged = new Signal<this, User.IUser>(this);
  private _connectionFailure = new Signal<this, Error>(this);

  /**
   * Create a new user manager.
   */
  constructor(options: UserManager.IOptions = {}) {
    super(options);

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

    this._pollSpecs = new Poll({
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
      void this._pollSpecs.start();
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
    this._pollSpecs.dispose();
    super.dispose();
  }

  /**
   * Force a refresh of the specs from the server.
   *
   * @returns A promise that resolves when the specs are fetched.
   *
   * #### Notes
   * This is intended to be called only in response to a user action,
   * since the manager maintains its internal state.
   */
  async refreshUser(): Promise<void> {
    await this._pollSpecs.refresh();
    await this._pollSpecs.tick;
  }

  /**
   * Execute a request to the server to poll the user and update state.
   */
  protected async requestUser(): Promise<void> {
    if (this.isDisposed) {
      return;
    }

    const { baseUrl } = this.serverSettings;
    const { makeRequest, ResponseError } = ServerConnection;
    const url = URLExt.join(baseUrl, SERVICE_USER_URL);
    const response: Response = await makeRequest(url, {}, this.serverSettings);

    if (response.status !== 200) {
      const err = await ResponseError.create(response);
      throw err;
    }

    const oldUser = {
      identity: this._identity,
      permissions: this._permissions
    };
    const newUser = await response.json();
    const identity = newUser.identity;

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

    if (!JSONExt.deepEqual(newUser, oldUser)) {
      this._identity = identity;
      this._permissions = newUser.permissions;
      localStorage.setItem(SERVICE_ID, JSON.stringify(identity));
      this._userChanged.emit(newUser);
    }
  }
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
  }
}

/**
 * A namespace for user API interfaces.
 */
export namespace User {
  /**
   * The interface describing a user identity.
   */
  export interface IUser {
    readonly identity: IIdentity;

    readonly permissions: PartialJSONObject;
  }

  /**
   * The interface describing a user identity.
   */
  export interface IIdentity extends PartialJSONObject {
    /**
     * User's unique identifier.
     */
    readonly username: string;

    /**
     * User's full name.
     */
    readonly name: string;

    /**
     * Shorter version of the name for displaying it on the UI.
     */
    readonly display_name: string;

    /**
     * User's name initials.
     */
    readonly initials: string;

    /**
     * User's cursor color and icon color if avatar_url is undefined
     * (there is no image).
     */
    readonly color: string;

    /**
     * User's avatar url.
     * The url to the user's image for the icon.
     */
    readonly avatar_url?: string;
  }

  /**
   * Object which manages user's identity.
   *
   * #### Notes
   * The manager is responsible for maintaining the state of the user.
   */
  export interface IManager extends IBaseManager {
    /**
     * A signal emitted when the user changes.
     */
    userChanged: ISignal<this, User.IUser>;

    /**
     * User's identity.
     *
     * #### Notes
     * The value will be null until the manager is ready.
     */
    readonly identity: User.IIdentity | null;

    /**
     * User's permissions.
     *
     * #### Notes
     * The value will be null until the manager is ready.
     */
    readonly permissions: ReadonlyJSONObject | null;

    /**
     * Force a refresh of user's identity from the server.
     *
     * @returns A promise that resolves when the identity is fetched.
     *
     * #### Notes
     * This is intended to be called only in response to a user action,
     * since the manager maintains its internal state.
     */
    refreshUser(): Promise<void>;
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
}
