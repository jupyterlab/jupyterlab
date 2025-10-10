// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { URLExt } from '@jupyterlab/coreutils';

import { JSONObject, JSONValue } from '@lumino/coreutils';

import { ServerConnection } from '..';

/**
 * The url for the config service.
 */
const SERVICE_CONFIG_URL = 'api/config';

/**
 * A Configurable data section.
 */
export interface IConfigSection {
  /**
   * The data for this section.
   */
  readonly data: JSONObject;

  /**
   * Modify the stored config values.
   *
   * #### Notes
   * Updates the local data immediately, sends the change to the server,
   * and updates the local data with the response, and fulfils the promise
   * with that data.
   */
  update(newdata: JSONObject): Promise<JSONObject>;

  /**
   * The server settings for the section.
   */
  readonly serverSettings: ServerConnection.ISettings;
}

/**
 * A manager for config sections.
 */
export class ConfigSectionManager implements ConfigSection.IManager {
  /**
   * Create a config section manager.
   */
  constructor(options: ConfigSectionManager.IOptions) {
    this.serverSettings =
      options.serverSettings ?? ServerConnection.makeSettings();
  }

  /**
   * Create a config section.
   */
  async create(
    options: ConfigSectionManager.ICreateOptions
  ): Promise<IConfigSection> {
    const section = new DefaultConfigSection({
      ...options,
      serverSettings: this.serverSettings
    });
    await section.load();
    return section;
  }

  /**
   * The server settings used to make API requests.
   */
  readonly serverSettings: ServerConnection.ISettings;
}

/**
 * The namespace for ConfigSection statics.
 */
export namespace ConfigSection {
  /**
   * Create a config section.
   *
   * @returns A Promise that is fulfilled with the config section is loaded.
   *
   * @deprecated Creating a config section via the `ConfigSection.create()` global has been deprecated and may be removed in a future version.
   * Instead, require the config section manager via the `IConfigSectionManager` token in a plugin.
   */
  export async function create(
    options: ConfigSection.IOptions
  ): Promise<IConfigSection> {
    if (!_configSectionManager) {
      const section = new DefaultConfigSection(options);
      await section.load();
      return section;
    }
    const section = await _configSectionManager.create(options);
    return section;
  }

  let _configSectionManager: ConfigSectionManager | undefined;

  /**
   * Internal function to set the config section manager.
   *
   * @deprecated This function is an internal helper kept for backward compatiblity.
   * It is not part of the public API and may be removed in a future version.
   */
  export function _setConfigSectionManager(manager: ConfigSectionManager) {
    if (_configSectionManager) {
      throw new Error(
        'ConfigSectionManager already set. If you would like to create a config section, use the `IConfigSectionManager` token in a plugin.'
      );
    }
    _configSectionManager = manager;
  }

  /**
   * The options used to create a config section.
   */
  export interface IOptions extends ConfigSectionManager.ICreateOptions {
    /**
     * The optional server settings.
     */
    serverSettings?: ServerConnection.ISettings;
  }

  /**
   * The interface for the build manager.
   */
  export interface IManager extends ConfigSectionManager {}
}

/**
 * Implementation of the Configurable data section.
 */
class DefaultConfigSection implements IConfigSection {
  /**
   * Construct a new config section.
   */
  constructor(options: ConfigSection.IOptions) {
    this.serverSettings =
      options.serverSettings ?? ServerConnection.makeSettings();
    this._name = options.name;
  }

  /**
   * The server settings for the section.
   */
  readonly serverSettings: ServerConnection.ISettings;

  /**
   * Get the data for this section.
   */
  get data(): JSONObject {
    return this._data;
  }

  /**
   * Load the initial data for this section.
   *
   * #### Notes
   * Uses the [Jupyter Server API](https://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter-server/jupyter_server/main/jupyter_server/services/api/api.yaml#!/config).
   *
   * The promise is fulfilled on a valid response and rejected otherwise.
   */
  async load(): Promise<void> {
    const response = await ServerConnection.makeRequest(
      this._url,
      {},
      this.serverSettings
    );
    if (response.status !== 200) {
      const err = await ServerConnection.ResponseError.create(response);
      throw err;
    }
    this._data = await response.json();
  }

  /**
   * Modify the stored config values.
   *
   * #### Notes
   * Uses the [Jupyter Server API](https://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter-server/jupyter_server/main/jupyter_server/services/api/api.yaml#!/config).
   *
   * The promise is fulfilled on a valid response and rejected otherwise.
   *
   * Updates the local data immediately, sends the change to the server,
   * and updates the local data with the response, and fulfils the promise
   * with that data.
   */
  async update(newdata: JSONObject): Promise<JSONObject> {
    this._data = { ...this._data, ...newdata };
    const init = {
      method: 'PATCH',
      body: JSON.stringify(newdata)
    };
    const response = await ServerConnection.makeRequest(
      this._url,
      init,
      this.serverSettings
    );
    if (response.status !== 200) {
      const err = await ServerConnection.ResponseError.create(response);
      throw err;
    }
    this._data = await response.json();
    return this._data;
  }

  /**
   * Get the URL for this config section.
   */
  private get _url(): string {
    return URLExt.join(
      this.serverSettings.baseUrl,
      SERVICE_CONFIG_URL,
      encodeURIComponent(this._name)
    );
  }

  private _name: string;
  private _data: JSONObject;
}

/**
 * Configurable object with defaults.
 */
export class ConfigWithDefaults {
  /**
   * Create a new config with defaults.
   */
  constructor(options: ConfigWithDefaults.IOptions) {
    this._section = options.section;
    this._defaults = options.defaults ?? {};
    this._className = options.className ?? '';
  }

  /**
   * Get data from the config section or fall back to defaults.
   */
  get(key: string): JSONValue {
    const data = this._classData();
    return key in data ? data[key] : this._defaults[key];
  }

  /**
   * Set a config value.
   *
   * #### Notes
   * Uses the [Jupyter Server API](https://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter-server/jupyter_server/main/jupyter_server/services/api/api.yaml#!/config).
   *
   * The promise is fulfilled on a valid response and rejected otherwise.
   *
   * Sends the update to the server, and changes our local copy of the data
   * immediately.
   */
  set(key: string, value: JSONValue): Promise<JSONValue> {
    const d: JSONObject = {};
    d[key] = value;
    if (this._className) {
      const d2: JSONObject = {};
      d2[this._className] = d;
      return this._section.update(d2);
    } else {
      return this._section.update(d);
    }
  }

  /**
   * Get data from the Section with our classname, if available.
   *
   * #### Notes
   * If we have no classname, get all of the data in the Section
   */
  private _classData(): JSONObject {
    const data = this._section.data;
    if (this._className && this._className in data) {
      return data[this._className] as JSONObject;
    }
    return data;
  }

  private _section: IConfigSection;
  private _defaults: JSONObject;
  private _className = '';
}

/**
 * A namespace for ConfigWithDefaults statics.
 */
export namespace ConfigWithDefaults {
  /**
   * The options used to initialize a ConfigWithDefaults object.
   */
  export interface IOptions {
    /**
     * The configuration section.
     */
    section: IConfigSection;

    /**
     * The default values.
     */
    defaults?: JSONObject;

    /**
     * The optional classname namespace.
     */
    className?: string;
  }
}

/**
 * A namespace for config section API interfaces.
 */
export namespace ConfigSectionManager {
  /**
   * The instantiation options for a config section manager.
   */
  export interface IOptions {
    /**
     * The server settings used to make API requests.
     */
    serverSettings?: ServerConnection.ISettings;
  }

  /**
   * The config section create options
   */
  export interface ICreateOptions {
    /**
     * The section name.
     */
    name: string;
  }
}
