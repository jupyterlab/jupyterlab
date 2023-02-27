// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { URLExt } from '@jupyterlab/coreutils';

import { ServerConnection } from '../serverconnection';

import { PromiseDelegate } from '@lumino/coreutils';

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
   * Fetch and cache the export formats from the expensive nbconvert handler.
   */
  protected async fetchExportFormats(): Promise<NbConvertManager.IExportFormats> {
    this._requestingFormats = new PromiseDelegate();
    this._exportFormats = null;
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
    keys.forEach(function (key) {
      const mimeType: string = data[key].output_mimetype;
      exportList[key] = { output_mimetype: mimeType };
    });
    this._exportFormats = exportList;
    this._requestingFormats.resolve(exportList);
    return exportList;
  }

  /**
   * Get the list of export formats, preferring pre-cached ones.
   */
  async getExportFormats(
    force: boolean = true
  ): Promise<NbConvertManager.IExportFormats> {
    if (this._requestingFormats) {
      return this._requestingFormats.promise;
    }

    if (force || !this._exportFormats) {
      return await this.fetchExportFormats();
    }

    return this._exportFormats;
  }

  protected _requestingFormats: PromiseDelegate<NbConvertManager.IExportFormats> | null;
  protected _exportFormats: NbConvertManager.IExportFormats | null = null;
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
