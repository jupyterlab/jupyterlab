// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ServerConnection } from '../serverconnection';
import { IUser, IUserAPIClient } from './user';

import { URLExt } from '@jupyterlab/coreutils';

/**
 * The url for the user service.
 */
const SERVICE_USER_URL = 'api/me';

/**
 * The User API client.
 *
 * #### Notes
 * Use this class to interact with the Jupyter Server User API.
 * This class adheres to the Jupyter Server API endpoints.
 */
export class UserAPIClient implements IUserAPIClient {
  /**
   * Create a new User API client.
   *
   * @param options - The options used to create the client.
   */
  constructor(options: { serverSettings?: ServerConnection.ISettings } = {}) {
    this.serverSettings =
      options.serverSettings ?? ServerConnection.makeSettings();
  }

  /**
   * The server settings for the client.
   */
  readonly serverSettings: ServerConnection.ISettings;

  /**
   * Fetch the user data.
   *
   * @returns A promise that resolves with the user data.
   *
   * #### Notes
   * Uses the [Jupyter Server API](https://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter-server/jupyter_server/main/jupyter_server/services/api/api.yaml#/identity).
   */
  async get(): Promise<IUser> {
    const { baseUrl } = this.serverSettings;
    const { makeRequest, ResponseError } = ServerConnection;
    const url = URLExt.join(baseUrl, SERVICE_USER_URL);
    const response: Response = await makeRequest(url, {}, this.serverSettings);

    if (response.status !== 200) {
      const err = await ResponseError.create(response);
      throw err;
    }
    // TODO: add validation
    return await response.json();
  }
}
