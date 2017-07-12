// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ISettingRegistry, URLExt
} from '@jupyterlab/coreutils';

import {
  JSONObject
} from '@phosphor/coreutils';

import {
  ServerConnection
} from '..';


/**
 * The url for the lab settings service.
 */
const SERVICE_SETTINGS_URL = 'lab/api/settings';


/**
 * The static namespace for `SettingManager`.
 */
export
class SettingManager implements Setting.IManager {
  /**
   * Create a new setting manager.
   */
  constructor(options: SettingManager.IOptions) {
    this.serverSettings = options.serverSettings ||
      ServerConnection.makeSettings();
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
   * @returns A promise that resolves with the plugin settings.
   */
  fetch(id: string): Promise<ISettingRegistry.IPlugin> {
    const base = this.serverSettings.baseUrl;
    const request = { method: 'GET', url: Private.url(base, id) };
    const { serverSettings } = this;
    const promise = ServerConnection.makeRequest(request, serverSettings);

    return promise.then(response => {
      const { status } = response.xhr;

      if (status !== 200) {
        throw ServerConnection.makeError(response);
      }

      return response.data;
    }).catch(reason => { throw ServerConnection.makeError(reason); });
  }

  /**
   * Save a plugin's settings.
   *
   * @param id - The plugin's ID.
   *
   * @param user - The plugin's user setting values.
   *
   * @returns A promise that resolves when saving is complete.
   */
  save(id: string, user: JSONObject): Promise<void> {
    const base = this.serverSettings.baseUrl;
    const request = {
      data: JSON.stringify(user),
      method: 'PATCH',
      url: Private.url(base, id)
    };
    const { serverSettings } = this;
    const promise = ServerConnection.makeRequest(request, serverSettings);

    return promise.then(response => {
      const { status } = response.xhr;

      if (status !== 204) {
        throw ServerConnection.makeError(response);
      }

      return void 0;
    }).catch(reason => { throw ServerConnection.makeError(reason); });
  }
}


/**
 * A namespace for `SettingManager` statics.
 */
export
namespace SettingManager {
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
 * A namespace for setting API interfaces.
 */
export
namespace Setting {
  /**
   * The interface for the setting system manager.
   */
  export
  interface IManager {
    /**
     * Fetch a plugin's settings.
     *
     * @param id - The plugin's ID.
     *
     * @returns A promise that resolves with the plugin settings.
     */
    fetch(id: string): Promise<ISettingRegistry.IPlugin>;

    /**
     * Save a plugin's settings.
     *
     * @param id - The plugin's ID.
     *
     * @param user - The plugin's user setting values.
     *
     * @returns A promise that resolves when saving is complete.
     */
    save(id: string, user: JSONObject): Promise<void>;

    /**
     * The server settings used to make API requests.
     */
    readonly serverSettings: ServerConnection.ISettings;
  }
}


/**
 * A namespace for private data.
 */
namespace Private {
  /**
   * Get the url for a plugin's settings.
   */
  export
  function url(base: string, id: string): string {
    return URLExt.join(base, SERVICE_SETTINGS_URL, id);
  }
}
