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
 * The url for the nbconvert export service.
 */
const NBCONVERT_EXPORT_URL = 'nbconvert';

/**
 * The nbconvert API service manager.
 */
export class NbConvertManager implements NbConvert.IManager {
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
  protected async fetchExportFormats(): Promise<NbConvert.IExportFormats> {
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
    const exportList: NbConvert.IExportFormats = {};
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
  ): Promise<NbConvert.IExportFormats> {
    if (this._requestingFormats) {
      return this._requestingFormats.promise;
    }

    if (force || !this._exportFormats) {
      return await this.fetchExportFormats();
    }

    return this._exportFormats;
  }

  /**
   * Export a notebook to a given format.
   *
   * @param options - The export options.
   * @param options.format - The export format (e.g., 'html', 'pdf').
   * @param options.path - The path to the notebook to export.
   * @param options.exporterOptions.download - Whether to download the file or open it in a new tab. Defaults to false.
   */
  async exportAs(options: NbConvert.IExportOptions): Promise<void> {
    const { format, path } = options;
    const { download = false } = options.exporterOptions || {};

    const baseUrl = this.serverSettings.baseUrl;
    const notebookPath = URLExt.encodeParts(path);
    let url = URLExt.join(baseUrl, NBCONVERT_EXPORT_URL, format, notebookPath);
    if (download) {
      url += '?download=true';
    }

    // Open the URL in a new tab if in a browser environment.
    window?.open(url, '_blank', 'noopener');
  }

  protected _requestingFormats: PromiseDelegate<NbConvert.IExportFormats> | null;
  protected _exportFormats: NbConvert.IExportFormats | null = null;
}

/**
 * A namespace for `NbConvertManager` statics.
 */
export namespace NbConvertManager {
  /**
   * The instantiation options for a nbconvert manager.
   */
  export interface IOptions {
    /**
     * The server settings used to make API requests.
     */
    serverSettings?: ServerConnection.ISettings;
  }

  /**
   * The interface for the export formats.
   *
   * @deprecated Kept for backward compatibility, use `NbConvert.IExportFormats` instead.
   */
  export interface IExportFormats extends NbConvert.IExportFormats {}
}

/**
 * A namespace for nbconvert API interfaces.
 */
export namespace NbConvert {
  /**
   * The interface for the export formats.
   */
  export interface IExportFormats {
    /**
     * The list of supported export formats.
     */
    [key: string]: { output_mimetype: string };
  }

  /**
   * The interface for the nbconvert export options.
   */
  export interface IExportOptions {
    /**
     * The export format (e.g., 'html', 'pdf').
     */
    format: string;

    /**
     * The path to the notebook to export.
     */
    path: string;

    /**
     * Additional options for the exporter.
     */
    exporterOptions?: { [key: string]: any };
  }

  /**
   * The interface for the nbconvert manager.
   */
  export interface IManager {
    /**
     * The server settings used to make API requests.
     */
    readonly serverSettings: ServerConnection.ISettings;

    /**
     * Get the list of export formats.
     *
     * @param force - Whether to force a refresh or use cached formats if available.
     * @returns A promise that resolves with the list of export formats.
     */
    getExportFormats(force?: boolean): Promise<NbConvert.IExportFormats>;

    /**
     * Export a notebook to a given format.
     *
     * @param options - The export options.
     * @param options.format - The export format (e.g., 'html', 'pdf').
     * @param options.path - The path to the notebook to export.
     * @param exporterOptions.download - Whether to download the file or open it in a new tab. Defaults to false.
     */
    exportAs?(options: NbConvert.IExportOptions): Promise<void>;
  }
}
