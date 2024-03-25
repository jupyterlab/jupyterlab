// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { URLExt } from '@jupyterlab/coreutils';

import { ISettingRegistry } from '@jupyterlab/settingregistry';

import { DataConnector } from '@jupyterlab/statedb';

import { ServerConnection } from '../serverconnection';

/**
 * The url for the lab settings service.
 */
const SERVICE_SETTINGS_URL = 'api/settings';

/**
 * The settings API service manager.
 */
export class SettingManager extends DataConnector<
  ISettingRegistry.IPlugin,
  string
> {
  /**
   * Create a new setting manager.
   */
  constructor(options: SettingManager.IOptions = {}) {
    super();
    this.serverSettings =
      options.serverSettings ?? ServerConnection.makeSettings();
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
    if (!id) {
      throw new Error('Plugin `id` parameter is required for settings fetch.');
    }

    const { serverSettings } = this;
    const { baseUrl, appUrl } = serverSettings;
    const { makeRequest, ResponseError } = ServerConnection;
    const base = baseUrl + appUrl;
    const url = Private.url(base, id);
    const response = await makeRequest(url, {}, serverSettings);

    if (response.status !== 200) {
      const err = await ResponseError.create(response);
      throw err;
    }

    // Assert what type the server response is returning.
    return response.json() as Promise<ISettingRegistry.IPlugin>;
  }

  /**
   * Fetch the list of all plugin setting bundles.
   *
   * @returns A promise that resolves if successful.
   */
  async list(
    query?: 'ids'
  ): Promise<{ ids: string[]; values: ISettingRegistry.IPlugin[] }> {
    const { serverSettings } = this;
    const { baseUrl, appUrl } = serverSettings;
    const { makeRequest, ResponseError } = ServerConnection;
    const base = baseUrl + appUrl;
    const url = Private.url(base, '', query === 'ids');
    const response = await makeRequest(url, {}, serverSettings);

    if (response.status !== 200) {
      throw new ResponseError(response);
    }

    const json = await response.json();
    const ids =
      json?.['settings']?.map(
        (plugin: ISettingRegistry.IPlugin) => plugin.id
      ) ?? [];

    let values: ISettingRegistry.IPlugin[] = [];
    if (!query) {
      values =
        json?.['settings']?.map((plugin: ISettingRegistry.IPlugin) => {
          plugin.data = { composite: {}, user: {} };
          return plugin;
        }) ?? [];
    }

    return { ids, values };
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
    const { baseUrl, appUrl } = serverSettings;
    const { makeRequest, ResponseError } = ServerConnection;
    const base = baseUrl + appUrl;
    const url = Private.url(base, id);
    // NOTE: 'raw' is JSON5 (not valid JSON), so we encode it as a string in a valid JSON body
    const init = { body: JSON.stringify({ raw }), method: 'PUT' };
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
  export function url(base: string, id: string, idsOnly?: boolean): string {
    const idsOnlyParam = idsOnly
      ? URLExt.objectToQueryString({ ids_only: true })
      : '';
    const settingsBase = URLExt.join(base, SERVICE_SETTINGS_URL);
    const result = URLExt.join(settingsBase, id);
    if (!result.startsWith(settingsBase)) {
      throw new Error('Can only be used for workspaces requests');
    }
    return `${result}${idsOnlyParam}`;
  }
}
