// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  PageConfig, URLExt
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
   * Test whether the build service is available.
   */
  get isAvailable(): boolean {
    return PageConfig.getOption('buildAvailable').toLowerCase() === 'true';
  }

  /**
   * Test whether to check build status automatically.
   */
  get shouldCheck(): boolean {
    return PageConfig.getOption('buildCheck').toLowerCase() === 'true';
  }

  /**
   * Get whether the application should be built.
   */
  getStatus(): Promise<BuildManager.IStatus> {
    const base = this.serverSettings.baseUrl;
    const url = URLExt.join(base, BUILD_SETTINGS_URL);
    const { serverSettings } = this;
    const promise = ServerConnection.makeRequest(url, {}, serverSettings);

    return promise.then(response => {
      if (response.status !== 200) {
        throw new ServerConnection.ResponseError(response);
      }

      return response.json();
    }).then(data => {
      if (typeof data.status !== 'string') {
        throw new Error('Invalid data');
      }
      if (typeof data.message !== 'string') {
        throw new Error('Invalid data');
      }
      return data;

    });
  }

  /**
   * Build the application.
   */
  build(): Promise<void> {
    const base = this.serverSettings.baseUrl;
    const url = URLExt.join(base, BUILD_SETTINGS_URL);
    const { serverSettings } = this;
    const init = { method: 'POST' };
    const promise = ServerConnection.makeRequest(url, init, serverSettings);

    return promise.then(response => {
      if (response.status === 400) {
        throw new ServerConnection.ResponseError(response, 'Build aborted');
      }
      if (response.status !== 200) {
        let message = `Build failed with ${response.status}, please run 'jupyter lab build' on the server for full output`;
        throw new ServerConnection.ResponseError(response, message);
      }
    });
  }

  /**
   * Cancel an active build.
   */
  cancel(): Promise<void> {
    const base = this.serverSettings.baseUrl;
    const url = URLExt.join(base, BUILD_SETTINGS_URL);
    const { serverSettings } = this;
    const init = { method: 'DELETE' };
    const promise = ServerConnection.makeRequest(url, init, serverSettings);

    return promise.then(response => {
      if (response.status !== 204) {
        throw new ServerConnection.ResponseError(response);
      }
    });
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

  /**
   * The build status response from the server.
   */
  export
  interface IStatus {
    /**
     * Whether a build is needed.
     */
    readonly status: 'stable' | 'needed' | 'building';

    /**
     * The message associated with the build status.
     */
    readonly message: string;
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
