// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { URLExt } from '@jupyterlab/coreutils';

import { ServerConnection } from '../serverconnection';

/**
 * The url for the lab nbconvert service.
 */
const NBCONVERT_SETTINGS_URL = 'api/nbconvert';

/**
 * The static namespace for `NbconvertManager`.
 */
export class NbconvertManager {
  /**
   * Create a new nbconvert manager.
   */
  constructor(options: NbconvertManager.IOptions = {}) {
    this.serverSettings =
      options.serverSettings || ServerConnection.makeSettings();
  }

  /**
   * The server settings used to make API requests.
   */
  readonly serverSettings: ServerConnection.ISettings;

  /**
   * Get whether the application should be built.
   */
  getExportFormats(): Promise<NbconvertManager.IExportFormats> {
    const base = this.serverSettings.baseUrl;
    const url = URLExt.join(base, NBCONVERT_SETTINGS_URL);
    const { serverSettings } = this;
    const promise = ServerConnection.makeRequest(url, {}, serverSettings);

    return promise
      .then(response => {
        if (response.status !== 200) {
          throw new ServerConnection.ResponseError(response);
        }

        return response.json();
      })
      .then(data => {
        /* TODO: should we add a type check here?
            or just return the export list object unmodified:
         {
            "custom": {
              "output_mimetype": ""
            },
            "html": {
              "output_mimetype": "text/html"
            },
            "slides": {
              "output_mimetype": "text/html"
           },

            ...
          }
       */
        return { exportList: data };
      });
  }

  /**
   * Build the application.
   */
  build(): Promise<void> {
    const base = this.serverSettings.baseUrl;
    const url = URLExt.join(base, NBCONVERT_SETTINGS_URL);
    const { serverSettings } = this;
    const init = { method: 'POST' };
    const promise = ServerConnection.makeRequest(url, init, serverSettings);

    return promise.then(response => {
      if (response.status === 400) {
        throw new ServerConnection.ResponseError(response, 'Build aborted');
      }
      if (response.status !== 200) {
        let message = `Build failed with ${
          response.status
        }, please run 'jupyter lab build' on the server for full output`;
        throw new ServerConnection.ResponseError(response, message);
      }
    });
  }

  /**
   * Cancel an active build.
   */
  cancel(): Promise<void> {
    const base = this.serverSettings.baseUrl;
    const url = URLExt.join(base, NBCONVERT_SETTINGS_URL);
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
export namespace NbconvertManager {
  /**
   * The instantiation options for a setting manager.
   */
  export interface IOptions {
    /**
     * The server settings used to make API requests.
     */
    serverSettings?: ServerConnection.ISettings;
  }

  /**
   * The build status response from the server.
   */
  export interface IExportFormats {
    /**
     * The list of supported export formats.
     */
    // TODO: should this stay a string, or a typed object
    // that includes an 'output_mimetype' string?
    readonly exportList: string;
  }
}

/**
 * A namespace for builder API interfaces.
 */
export namespace Nbconvert {
  /**
   * The interface for the build manager.
   */
  export interface IManager extends NbconvertManager {}
}
