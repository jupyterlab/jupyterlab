// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  URLExt
} from '@jupyterlab/coreutils';

import {
  ReadonlyJSONObject
} from '@phosphor/coreutils';

import {
  ServerConnection
} from '../serverconnection';


/**
 * The url for the lab workspaces service.
 */
const SERVICE_WORKSPACES_URL = 'api/workspaces';


/**
 * The workspaces API service manager.
 */
export
class WorkspaceManager {
  /**
   * Create a new workspace manager.
   */
  constructor(options: WorkspaceManager.IOptions = { }) {
    this.serverSettings = options.serverSettings ||
      ServerConnection.makeSettings();
  }

  /**
   * The server settings used to make API requests.
   */
  readonly serverSettings: ServerConnection.ISettings;

  /**
   * Fetch a workspace.
   *
   * @param id - The workspaces's ID.
   *
   * @returns A promise that resolves with the workspace or rejects with a
   * `ServerConnection.IError`.
   */
  fetch(id: string): Promise<Workspace.IWorkspace> {
    const { serverSettings } = this;
    const { baseUrl, pageUrl } = serverSettings;
    const base = baseUrl + pageUrl;
    const url = Private.url(base, id);
    const promise = ServerConnection.makeRequest(url, { }, serverSettings);

    return promise.then(response => {
      if (response.status !== 200) {
        throw new ServerConnection.ResponseError(response);
      }

      return response.json();
    });
  }

  /**
   * Save a workspace.
   *
   * @param id - The workspace's ID.
   *
   * @param workspace - The workspace being saved.
   *
   * @returns A promise that resolves when saving is complete or rejects with
   * a `ServerConnection.IError`.
   */
  save(id: string, workspace: Workspace.IWorkspace): Promise<void> {
    const { serverSettings } = this;
    const { baseUrl, pageUrl } = serverSettings;
    const base = baseUrl + pageUrl;
    const url = Private.url(base, id);
    const init = { body: JSON.stringify(workspace), method: 'PUT' };
    const promise = ServerConnection.makeRequest(url, init, serverSettings);

    return promise.then(response => {
      if (response.status !== 204) {
        throw new ServerConnection.ResponseError(response);
      }

      return undefined;
    });
  }
}


/**
 * A namespace for `WorkspaceManager` statics.
 */
export
namespace WorkspaceManager {
  /**
   * The instantiation options for a workspace manager.
   */
  export
  interface IOptions {
    /**
     * The server settings used to make API requests.
     */
    serverSettings?: ServerConnection.ISettings;
  }
}


/**
 * A namespace for workspace API interfaces.
 */
export
namespace Workspace {
  /**
   * The interface for the workspace API manager.
   */
  export
  interface IManager extends WorkspaceManager { }

  /**
   * The interface describing a workspace API response.
   */
  export
  interface IWorkspace {
    /**
     * The workspace data.
     */
    data: ReadonlyJSONObject;

    /**
     * The metadata for a workspace.
     */
    metadata: {
      /**
       * The workspace ID.
       */
      id: string;
    };
  }
}


/**
 * A namespace for private data.
 */
namespace Private {
  /**
   * Get the url for a workspace.
   */
  export
  function url(base: string, id: string): string {
    return URLExt.join(base, SERVICE_WORKSPACES_URL, id);
  }
}
