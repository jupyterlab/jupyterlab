// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as Ajv from 'ajv';

import {
  find
} from '@phosphor/algorithm';

import {
  JSONExt, JSONObject, JSONValue, Token
} from '@phosphor/coreutils';

import {
  IDisposable
} from '@phosphor/disposable';

import {
  ISignal, Signal
} from '@phosphor/signaling';

import {
  IDatastore, StateDB
} from '.';


/* tslint:disable */
/**
 * The schema for settings.
 */
const SCHEMA = {
  "$schema": "http://json-schema.org/draft-06/schema",
  "title": "Jupyter Settings/Preferences Schema",
  "description": "Jupyter settings/preferences schema v0.1.0",
  "type": "object",
  "additionalProperties": true,
  "properties": {
    "jupyter.lab.icon-class": { "type": "string", "default": "jp-FileIcon" },
    "jupyter.lab.icon-label": { "type": "string", "default": "Plugin" }
  }
};
/* tslint:enable */

/**
 * An alias for the JSON deep copy function.
 */
const copy = JSONExt.deepCopy;


/**
 * An implementation of a schema validator.
 */
export
interface ISchemaValidator {
  /**
   * Validate a data object against a plugin's JSON schema.
   *
   * @param plugin - The plugin ID.
   *
   * @param data - The data being validated.
   *
   * @returns A promise that resolves with void if successful and rejects with a
   * list of errors if either the schema or data fails to validate.
   */
  validateData(plugin: string, data: JSONObject): Promise<void | Ajv.ErrorObject[]>;
}


/* tslint:disable */
/**
 * The setting registry token.
 */
export
const ISettingRegistry = new Token<ISettingRegistry>('jupyter.services.settings');
/* tslint:enable */


/**
 * A namespace for setting registry interfaces.
 */
export
namespace ISettingRegistry {
  /**
   * The settings for a specific plugin.
   */
  export
  interface IPlugin extends JSONObject {
    /**
     * The name of the plugin.
     */
    id: string;

    /**
     * The collection of values for a specified setting.
     */
    data: ISettingBundle;

    /**
     * The JSON schema for the plugin.
     */
    schema: JSONObject;
  }

  /**
   * The setting values for a plugin.
   */
  export
  interface ISettingBundle extends JSONObject {
    /**
     * A composite of the user setting values and the plugin schema defaults.
     *
     * #### Notes
     * The `composite` values will always be a superset of the `user` values.
     */
    composite: { [key: string]: JSONValue };

    /**
     * The user setting values.
     */
    user: { [key: string]: JSONValue };
  }

  /**
   * An interface for manipulating the settings of a specific plugin.
   */
  export
  interface ISettings extends IDisposable {
    /**
     * A signal that emits when the plugin's settings have changed.
     */
    readonly changed: ISignal<this, void>;

    /**
     * Get the composite of user settings and extension defaults.
     */
    readonly composite: JSONObject;

    /*
     * The plugin name.
     */
    readonly plugin: string;

    /**
     * Get the plugin settings schema.
     */
    readonly schema: JSONObject;

    /**
     * Get the user settings.
     */
    readonly user: JSONObject;

    /**
     * Remove a single setting.
     *
     * @param key - The name of the setting being removed.
     *
     * @returns A promise that resolves when the setting is removed.
     *
     * #### Notes
     * This function is asynchronous because it writes to the setting registry.
     */
    remove(key: string): Promise<void>;

    /**
     * Get an individual setting.
     *
     * @param key - The name of the setting being retrieved.
     *
     * @returns The setting value.
     *
     * #### Notes
     * This method returns synchronously because it uses a cached copy of the
     * plugin settings that is synchronized with the registry.
     */
    get(key: string): { composite: JSONValue, user: JSONValue };

    /**
     * Save all of the plugin's settings at once.
     */
    save(raw: IPlugin): Promise<void>;

    /**
     * Set a single setting.
     *
     * @param key - The name of the setting being set.
     *
     * @param value - The value of the setting.
     *
     * @returns A promise that resolves when the setting has been saved.
     *
     * #### Notes
     * This function is asynchronous because it writes to the setting registry.
     */
    set(key: string, value: JSONValue): Promise<void>;
  }
}


/**
 * An implementation of a setting registry.
 */
export
interface ISettingRegistry extends SettingRegistry {}


/**
 * The default implementation of a schema validator.
 */
class DefaultSchemaValidator implements ISchemaValidator {
  /**
   * Instantiate a schema validator.
   */
  constructor() {
    console.log('main schema', SCHEMA);
    this._merger.addSchema(SCHEMA, 'main');
    this._validator.addSchema(SCHEMA, 'main');
  }

  /**
   * Validate a data object against a plugin's JSON schema.
   *
   * @param plugin - The plugin ID.
   *
   * @param data - The data being validated.
   *
   * @returns A promise that resolves with void if successful and rejects with a
   * list of errors if either the schema or data fails to validate.
   */
  validateData(plugin: string, data: JSONObject): Promise<void | Ajv.ErrorObject[]> {
    try {
      const validate = this._validator.getSchema(plugin);

      if (!validate) {
        throw new Error(`Schema ${plugin} is unknown.`);
      }

      const result = validate(data);
      const { errors } = validate;

      if (typeof result === 'boolean') {
        return result ? Promise.resolve(void 0) : Promise.resolve(errors);
      }

      // The Ajv promise implementation uses `Thenable` instead of `Promise`,
      // so it needs to be wrapped in a true `Promise` instance here.
      return new Promise<void | Ajv.ErrorObject[]>((resolve, reject) => {
        result.then(resolve, reject);
      });
    } catch (error) {
      console.error('Schema validation failed.', error);
      return Promise.reject([error]);
    }
  }

  private _merger = new Ajv({ useDefaults: true });
  private _validator = new Ajv();
}

/**
 * The default concrete implementation of a setting registry.
 */
export
class SettingRegistry {
  /**
   * Create a new setting registry.
   */
  constructor(options: SettingRegistry.IOptions = { }) {
    const namespace = 'jupyter.db.settings';
    this._datastore = options.datastore || new StateDB({ namespace });
    this._validator = options.validator || new DefaultSchemaValidator();
  }

  /**
   * A signal that emits the name of a plugin when its settings change.
   */
  get pluginChanged(): ISignal<this, string> {
    return this._pluginChanged;
  }

  /**
   * Returns a list of plugin settings held in the registry.
   */
  get plugins(): ISettingRegistry.IPlugin[] {
    const plugins = this._plugins;

    return Object.keys(plugins)
      .map(p => copy(plugins[p]) as ISettingRegistry.IPlugin);
  }

  /**
   * Get an individual setting.
   *
   * @param plugin - The name of the plugin whose settings are being retrieved.
   *
   * @param key - The name of the setting being retrieved.
   *
   * @param level - The setting level. Defaults to `user`.
   *
   * @returns A promise that resolves when the setting is retrieved.
   */
  get(plugin: string, key: string): Promise<JSONValue> {
    const plugins = this._plugins;

    if (plugin in plugins) {
      const bundle = plugins[plugin] && plugins[plugin].data;
      const value = bundle && bundle[level] && bundle[level][key] || null;

      return Promise.resolve(copy(value));
    }

    return this.load(plugin).then(() => this.get(plugin, key, level));
  }

  /**
   * Load a plugin's settings into the setting registry.
   *
   * @param plugin - The name of the plugin whose settings are being loaded.
   *
   * @returns A promise that resolves with a plugin settings object or rejects
   * if the plugin is not found.
   */
  load(plugin: string): Promise<ISettingRegistry.ISettings> {
    const plugins = this._plugins;
    const registry = this;

    // If the plugin exists, resolve.
    if (plugin in plugins) {
      const content = plugins[plugin];
      const settings = new Settings({ content, plugin, registry });

      return Promise.resolve(settings);
    }

    // If the plugin needs to be loaded from the datastore, fetch.
    return this.reload(plugin);
  }

  /**
   * Reload a plugin's settings into the registry even if they already exist.
   *
   * @param plugin - The name of the plugin whose settings are being reloaded.
   *
   * @returns A promise that resolves with a plugin settings object or rejects
   * if the plugin is not found.
   */
  reload(plugin: string): Promise<ISettingRegistry.ISettings> {
    const datastore = this._datastore;
    const plugins = this._plugins;

    // If the plugin needs to be loaded from the datastore, fetch.
    return datastore.fetch(plugin).then(result => {
      if (!result) {
        throw new Error(`Setting data for ${plugin} does not exist.`);
      }

      // Set the local copy.
      plugins[plugin] = result;

      return new Settings({
        content: copy(plugins[plugin]) as ISettingRegistry.IPlugin,
        plugin,
        registry: this
      });
    });
  }

  /**
   * Remove a single setting in the registry.
   *
   * @param plugin - The name of the plugin whose setting is being removed.
   *
   * @param key - The name of the setting being removed.
   *
   * @returns A promise that resolves when the setting is removed.
   */
  remove(plugin: string, key: string): Promise<void> {
    const plugins = this._plugins;

    if (!(plugin in plugins)) {
      return Promise.resolve(void 0);
    }

    const bundle =  plugins[plugin].data;
    const level = 'user';

    if (!bundle[level]) {
      return Promise.resolve(void 0);
    }

    delete bundle[level][key];

    return this._save(plugin);
  }

  /**
   * Set a single setting in the registry.
   *
   * @param plugin - The name of the plugin whose setting is being set.
   *
   * @param key - The name of the setting being set.
   *
   * @param value - The value of the setting being set.
   *
   * @returns A promise that resolves when the setting has been saved.
   *
   */
  set(plugin: string, key: string, value: JSONValue): Promise<void> {
    const plugins = this._plugins;

    if (!(plugin in plugins)) {
      return this.load(plugin).then(() => this.set(plugin, key, value));
    }

    const bundle = plugins[plugin].data;
    const level = 'user';

    if (!bundle[level]) {
      bundle[level] = Object.create(null);
    }
    bundle[level][key] = value;

    return this._save(plugin);
  }

  /**
   * Upload a plugin's settings.
   *
   * @param raw - The raw plugin settings being uploaded.
   *
   * @returns A promise that resolves when the settings have been saved.
   *
   * #### Notes
   * Only the `user` level data will be saved.
   */
  upload(raw: ISettingRegistry.IPlugin): Promise<void> {
    this._plugins[raw.id] = copy(raw) as ISettingRegistry.IPlugin;
    return this._save(raw.id);
  }

  /**
   * Save a plugin in the registry.
   */
  private _save(plugin: string): Promise<void> {
    const plugins = this._plugins;

    if (!(plugin in plugins)) {
      return Promise.reject(`${plugin} does not exist in setting registry.`);
    }

    return this._datastore.save(plugin, plugins[plugin])
      .then(() => { this._pluginChanged.emit(plugin); });
  }

  private _datastore: IDatastore<ISettingRegistry.IPlugin, ISettingRegistry.IPlugin> | null = null;
  private _pluginChanged = new Signal<this, string>(this);
  private _plugins: { [name: string]: ISettingRegistry.IPlugin } = Object.create(null);
  private _validator: ISchemaValidator | null = null;
}


/**
 * A manager for a specific plugin's settings.
 */
class Settings implements ISettingRegistry.ISettings {
  /**
   * Instantiate a new plugin settings manager.
   */
  constructor(options: Settings.IOptions) {
    const { plugin } = options;

    this.plugin = plugin.id;
    this.registry = options.registry;

    this._composite = plugin.data.composite;
    this._schema = plugin.schema;
    this._user = plugin.data.user;

    this.registry.pluginChanged.connect(this._onPluginChanged, this);
  }

  /**
   * A signal that emits when the plugin's settings have changed.
   */
  get changed(): ISignal<this, void> {
    return this._changed;
  }

  /**
   * Get the composite of user settings and extension defaults.
   */
  get composite(): JSONObject {
    return this._composite;
  }

  /**
   * Test whether the plugin settings manager disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Get the plugin settings schema.
   */
  get schema(): JSONObject {
    return this._schema;
  }

  /**
   * Get the user settings.
   */
  get user(): JSONObject {
    return this._user;
  }

  /*
   * The plugin name.
   */
  readonly plugin: string;

  /**
   * The system registry instance used by the settings manager.
   */
  readonly registry: SettingRegistry;

  /**
   * Dispose of the plugin settings resources.
   */
  dispose(): void {
    if (this._isDisposed) {
      return;
    }

    this._isDisposed = true;

    this._composite = null;
    this._schema = null;
    this._user = null;

    Signal.clearData(this);
  }

  /**
   * Get an individual setting.
   *
   * @param key - The name of the setting being retrieved.
   *
   * @returns The setting value.
   *
   * #### Notes
   * This method returns synchronously because it uses a cached copy of the
   * plugin settings that is synchronized with the registry.
   */
  get(key: string): { composite: JSONValue, user: JSONValue } {
    return { composite: this._composite[key], user: this._user[key] };
  }

  /**
   * Remove a single setting.
   *
   * @param key - The name of the setting being removed.
   *
   * @returns A promise that resolves when the setting is removed.
   *
   * #### Notes
   * This function is asynchronous because it writes to the setting registry.
   */
  remove(key: string): Promise<void> {
    return this.registry.remove(this.plugin, key);
  }

  /**
   * Save all of the plugin's user settings at once.
   */
  save(user: JSONObject): Promise<void> {
    return this.registry.upload({
      id: this.plugin,
      data: { composite: this._composite, user },
      schema: this._schema
    });
  }

  /**
   * Set a single setting.
   *
   * @param key - The name of the setting being set.
   *
   * @param value - The value of the setting.
   *
   * @returns A promise that resolves when the setting has been saved.
   *
   * #### Notes
   * This function is asynchronous because it writes to the setting registry.
   */
  set(key: string, value: JSONValue): Promise<void> {
    return this.registry.set(this.plugin, key, value);
  }

  /**
   * Handle plugin changes in the setting registry.
   */
  private _onPluginChanged(sender: any, plugin: string): void {
    if (plugin === this.plugin) {
      const found = find(this.registry.plugins, p => p.id === plugin);

      if (!found) {
        return;
      }

      const { composite, user } = found.data;
      const schema = found.schema;

      this._composite = composite;
      this._schema = schema;
      this._user = user;
      this._changed.emit(void 0);
    }
  }

  private _changed = new Signal<this, void>(this);
  private _composite: JSONObject;
  private _isDisposed = false;
  private _schema: JSONObject;
  private _user: JSONObject;
}


/**
 * A namespace for `SettingRegistry` statics.
 */
export
namespace SettingRegistry {
  /**
   * The instantiation options for a setting registry
   */
  export
  interface IOptions {
    /**
     * The datastore used by the setting registry.
     */
    datastore?: IDatastore<ISettingRegistry.IPlugin, ISettingRegistry.IPlugin>;

    /**
     * The validator used to enforce the settings JSON schema.
     */
    validator?: ISchemaValidator;
  }
}


/**
 * A namespace for `Settings` statics.
 */
namespace Settings {
  /**
   * The instantiation options for a `Settings` object.
   */
  export
  interface IOptions {
    /**
     * The setting values for a plugin.
     */
    plugin: ISettingRegistry.IPlugin;

    /**
     * The system registry instance used by the settings manager.
     */
    registry: SettingRegistry;
  }
}
