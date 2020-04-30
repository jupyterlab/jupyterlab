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
  async getExportFormats(): Promise<NbConvertManager.IExportFormats> {
    const base = this.serverSettings.baseUrl;
    const url = URLExt.join(base, NBCONVERT_SETTINGS_URL);
    const { serverSettings } = this;
    const response = await ServerConnection.makeRequest(
      url,
      {},
      serverSettings
    );
    if (response.status !== 200) {
      const err = await ServerConnection.ResponseError.create(response);
      throw err;
    }
    const data = await response.json();
    const exportList: NbConvertManager.IExportFormats = {};
    const keys = Object.keys(data);
    keys.forEach(function(key) {
      const mimeType: string = data[key].output_mimetype;
      exportList[key] = { output_mimetype: mimeType };
    });
    return exportList;
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
