// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ISettingRegistry, URLExt } from '@jupyterlab/coreutils';

import { ServerConnection } from '../serverconnection';

/**
 * The url for the lab settings service.
 */
const SERVICE_SETTINGS_URL = 'api/settings';

/**
 * The settings API service manager.
 */
export class SettingManager {
  /**
   * Create a new setting manager.
   */
  constructor(options: SettingManager.IOptions = {}) {
    this.serverSettings =
      options.serverSettings || ServerConnection.makeSettings();
  }

  /**
   * The server settings used to make API requests.
   */
  readonly serverSettings: ServerConnection.ISettings;

  /**
   * Fetch a plugin's settings.
   *
   * @param id - The plugin's ID.
   *
   * @returns A promise that resolves if successful.
   */
  async fetch(id: string): Promise<ISettingRegistry.IPlugin> {
    const { serverSettings } = this;
    const { baseUrl, pageUrl } = serverSettings;
    const { makeRequest, ResponseError } = ServerConnection;
    const base = baseUrl + pageUrl;
    const url = Private.url(base, id);
    const response = await makeRequest(url, {}, serverSettings);

    if (response.status !== 200) {
      throw new ResponseError(response);
    }

    return response.json();
  }

  /**
   * Save a plugin's settings.
   *
   * @param id - The plugin's ID.
   *
   * @param raw - The user setting values as a raw string of JSON with comments.
   *
   * @returns A promise that resolves if successful.
   */
  async save(id: string, raw: string): Promise<void> {
    const { serverSettings } = this;
    const { baseUrl, pageUrl } = serverSettings;
    const { makeRequest, ResponseError } = ServerConnection;
    const base = baseUrl + pageUrl;
    const url = Private.url(base, id);
    const init = { body: raw, method: 'PUT' };
    const response = await makeRequest(url, init, serverSettings);

    if (response.status !== 204) {
      throw new ResponseError(response);
    }
  }
}

/**
 * A namespace for `SettingManager` statics.
 */
export namespace SettingManager {
  /**
   * The instantiation options for a setting manager.
   */
  export interface IOptions {
    /**
     * The server settings used to make API requests.
     */
    serverSettings?: ServerConnection.ISettings;
  }
}

/**
 * A namespace for setting API interfaces.
 */
export namespace Setting {
  /**
   * The interface for the setting system manager.
   */
  export interface IManager extends SettingManager {}
}

/**
 * A namespace for private data.
 */
namespace Private {
  /**
   * Get the url for a plugin's settings.
   */
  export function url(base: string, id: string): string {
    return URLExt.join(base, SERVICE_SETTINGS_URL, id);
  }
}
