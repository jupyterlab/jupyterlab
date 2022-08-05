// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { URLExt } from '@jupyterlab/coreutils';

import { DataConnector } from '@jupyterlab/statedb';

import { ServerConnection } from '../serverconnection';

/**
 * The url for the lab workspaces service.
 */
const SERVICE_USER_URL = 'api/me';

/**
 * The user API service manager.
 */
export class UserManager extends DataConnector<User.IUser> {
  /**
   * Create a new user manager.
   */
  constructor(options: UserManager.IOptions = {}) {
    super();
    this.serverSettings =
      options.serverSettings ?? ServerConnection.makeSettings();
  }

  /**
   * The server settings used to make API requests.
   */
  readonly serverSettings: ServerConnection.ISettings;

	async fetch(id: string): Promise<User.IUser> {
    const { baseUrl } = this.serverSettings;
    const { makeRequest, ResponseError } = ServerConnection;
    const url = URLExt.join(baseUrl, SERVICE_USER_URL);
    const response = await makeRequest(url, {}, this.serverSettings);

    if (response.status !== 200) {
      const err = await ResponseError.create(response);
      throw err;
    }

    return response.json();
	}
}

/**
 * A namespace for `UserManager` statics.
 */
export namespace UserManager {
  /**
   * The instantiation options for a user manager.
   */
  export interface IOptions {
    /**
     * The server settings used to make API requests.
     */
    serverSettings?: ServerConnection.ISettings;
  }
}

/**
 * A namespace for user API interfaces.
 */
export namespace User {

	/**
   * The interface for the user API manager.
   */
	export interface IManager extends UserManager {}

  /**
   * The interface describing a user API response.
   */
  export interface IUser {
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
    readonly displayName: string;

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
     * Whether the user is anonymous or not.
     *
     * NOTE: Jupyter server doesn't handle user's identity so, by default every user
     * is anonymous unless a third-party extension provides the ICurrentUser token retrieving
     * the user identity from a third-party identity provider as GitHub, Google, etc.
     */
    readonly anonymous: boolean;

    /**
     * User's cursor position on the document.
     *
     * If undefined, the user is not on a document.
     */
    readonly cursor?: User.Cursor;

    /**
     * User's avatar url.
     * The url to the user's image for the icon.
     */
    readonly avatar_url?: string;
  }

	export type Cursor = {
    /**
     * Document where the user is currently focused.
     */
    document: string;

    /**
     * Cell where the user is focused.
     *
     * NOTE: 0 for plain text files.
     */
    cell: number;

    /**
     * Position of the cursor in the cell.
     */
    index: number;
  };
}
