// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { PartialJSONObject, ReadonlyJSONObject } from '@lumino/coreutils';
import type { ISignal } from '@lumino/signaling';
import type { ServerConnection } from '../serverconnection';
import type { IManager as IBaseManager } from '../basemanager';

/**
 * Interface for making requests to the User API.
 */
export interface IUserAPIClient {
  /**
   * The server settings for the client.
   */
  readonly serverSettings: ServerConnection.ISettings;

  /**
   * Fetch the user data.
   *
   * @returns A promise that resolves with the user model.
   */
  get(): Promise<IUser>;
}

/**
 * The interface describing a user identity.
 */
export interface IUser {
  readonly identity: IIdentity;

  readonly permissions: ReadonlyJSONObject;
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
  userChanged: ISignal<this, IUser>;

  /**
   * User's identity.
   *
   * #### Notes
   * The value will be null until the manager is ready.
   */
  readonly identity: IIdentity | null;

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
