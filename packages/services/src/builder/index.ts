// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  URLExt
} from '@jupyterlab/coreutils';

import {
  ServerConnection
} from '../serverconnection';


/**
 * The url for the lab build service.
 */
const BUILD_SETTINGS_URL = 'lab/api/build';


/**
 * The static namespace for `BuildManager`.
 */
export
class BuildManager {
  /**
   * Create a new setting manager.
   */
  constructor(options: BuildManager.IOptions = { }) {
    this.serverSettings = options.serverSettings ||
      ServerConnection.makeSettings();
  }

  /**
   * The server settings used to make API requests.
   */
  readonly serverSettings: ServerConnection.ISettings;

  /**
   * Build the application.
   */
  build(): Promise<void> {
    const base = this.serverSettings.baseUrl;
    const url = URLExt.join(base, BUILD_SETTINGS_URL);
    const request = { method: 'POST', url };
    const { serverSettings } = this;
    const promise = ServerConnection.makeRequest(request, serverSettings);

    return promise.then(response => {
      const { status } = response.xhr;

      if (status !== 200) {
        throw ServerConnection.makeError(response);
      }

    }).catch(reason => { throw ServerConnection.makeError(reason); });
  }
}


/**
 * A namespace for `BuildManager` statics.
 */
export
namespace BuildManager {
  /**
   * The instantiation options for a setting manager.
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
 * A namespace for builder API interfaces.
 */
export
namespace Builder {
  /**
   * The interface for the build manager.
   */
  export
  interface IManager extends BuildManager { }
}
