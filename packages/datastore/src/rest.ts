// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { URLExt } from '@jupyterlab/coreutils';

import { ServerConnection } from '@jupyterlab/services';

/**
 *
 */
const DATASTORE_REST_URL = '/lab/api/datastore';

/**
 * Query the server for current, accessible collaborations.
 *
 * @param options - The options to the function.
 */
export async function currentCollaborations(
  options?: currentCollaborations.IOptions
): Promise<currentCollaborations.CollaborationMap> {
  const settings =
    (options && options.serverSettings) || ServerConnection.makeSettings();
  const token = settings.token;
  const queryParams = [];

  let url;
  url = URLExt.join(settings.baseUrl, DATASTORE_REST_URL);

  if (token) {
    queryParams.push(`token=${encodeURIComponent(token)}`);
  }
  if (queryParams) {
    url = url + `?${queryParams.join('&')}`;
  }
  const response = await ServerConnection.makeRequest(url, {}, settings);
  return response.json();
}

/**
 * currentCollaborations type declarations.
 */
export namespace currentCollaborations {
  /**
   * Information about a single collaboration.
   */
  export type CollaborationInfo = {
    /**
     * A unique id of the collaboration.
     */
    id: string;

    /**
     * A user-friendly name for the session (not necessarily unique)
     */
    friendlyName: string;
  };

  /**
   * A map of collaboration infos by their id.
   */
  export type CollaborationMap = {
    collaborations: {
      [id: string]: CollaborationInfo;
    };
  };

  /**
   * Options to currentSessions
   */
  export interface IOptions {
    /**
     * The server settings for the session.
     */
    serverSettings?: ServerConnection.ISettings;
  }
}
