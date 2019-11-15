// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { URLExt } from '@jupyterlab/coreutils';

import { ServerConnection } from '../serverconnection';

/**
 * The url for the lab nbconvert service.
 */
const NBCONVERT_SETTINGS_URL = 'api/nbconvert';

/**
 * The nbconvert API service manager.
 */
export class NbConvertManager {
  /**
   * Create a new nbconvert manager.
   */
  constructor(options: NbConvertManager.IOptions = {}) {
    this.serverSettings =
      options.serverSettings ?? ServerConnection.makeSettings();
  }

  /**
   * The server settings used to make API requests.
   */
  readonly serverSettings: ServerConnection.ISettings;

  /**
   * Get whether the application should be built.
   */
  getExportFormats(): Promise<NbConvertManager.IExportFormats> {
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
        let exportList: NbConvertManager.IExportFormats = {};
        let keys = Object.keys(data);
        keys.forEach(function(key) {
          let mimeType: string = data[key].output_mimetype;
          exportList[key] = { output_mimetype: mimeType };
        });
        return exportList;
      });
  }
}

/**
 * A namespace for `BuildManager` statics.
 */
export namespace NbConvertManager {
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
   * A namespace for nbconvert API interfaces.
   */
  export interface IExportFormats {
    /**
     * The list of supported export formats.
     */
    [key: string]: { output_mimetype: string };
  }
}

/**
 * A namespace for builder API interfaces.
 */
export namespace NbConvert {
  /**
   * The interface for the build manager.
   */
  export interface IManager extends NbConvertManager {}
}
