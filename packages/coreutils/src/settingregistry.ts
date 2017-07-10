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
  IDataConnector
} from './interfaces';


/**
 * The key in the schema for setting editor icon class hints.
 */
export
const ICON_CLASS_KEY ='jupyter.lab.setting-icon-class';

/**
 * The key in the schema for setting editor icon label hints.
 */
export
const ICON_LABEL_KEY = 'jupyter.lab.setting-icon-label';

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
   * Add a schema to the validator.
   *
   * @param plugin - The plugin ID.
   *
   * @param schema - The schema being added.
   *
   * @return A list of errors if the schema fails to validate or `null` if there
   * are no errors.
   *
   * #### Notes
   * It is safe to call this function multiple times with the same plugin name.
   */
  addSchema(plugin: string, schema: ISettingRegistry.ISchema): ISchemaValidator.IError[] | null;

  /**
   * Validate a plugin's schema and user data; populate the `composite` data.
   *
   * @param plugin - The plugin being validated. Its `composite` data will be
   * populated by reference.
   *
   * @return A list of errors if either the schema or data fail to validate or
   * `null` if there are no errors.
   */
  validateData(plugin: ISettingRegistry.IPlugin): ISchemaValidator.IError[] | null;
}


/**
 * A namespace for schema validator interfaces.
 */
export
namespace ISchemaValidator {
  /**
   * A schema validation error definition.
   */
  export
  interface IError {
    /**
     * The keyword whose validation failed.
     */
    keyword: string;

    /**
     * The error message.
     */
    message: string;

    /**
     * The path in the schema where the error occurred.
     */
    schemaPath: string;
  }
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
    schema: ISchema;
  }

  /**
   * A schema type that is a minimal subset of the formal JSON Schema along with
   * optional JupyterLab rendering hints.
   */
  export
  interface ISchema extends JSONObject {
    /**
     * The JupyterLab icon class hint for a plugin can be overridden by user
     * settings. It can also be root level and therefore "private".
     */
    'jupyter.lab.setting-icon-class'?: string;

    /**
     * The JupyterLab icon label hint for a plugin can be overridden by user
     * settings. It can also be root level and therefore "private".
     */
    'jupyter.lab.setting-icon-label'?: string;

    /**
     * The default value, if any.
     */
    default?: any;

    /**
     * The schema description.
     */
    description?: string;

    /**
     * The schema's child properties.
     */
    properties?: {
      /**
       * The JupyterLab icon class hint for a plugin can be overridden by user
       * settings. It can also be root level and therefore "private".
       */
      'jupyter.lab.setting-icon-class'?: ISchema;

      /**
       * The JupyterLab icon label hint for a plugin can be overridden by user
       * settings. It can also be root level and therefore "private".
       */
      'jupyter.lab.setting-icon-label'?: ISchema;

      /**
       * Arbitrary setting keys can be added.
       */
      [key: string]: ISchema;
    };

    /**
     * The title of the schema.
     */
    title?: string;

    /**
     * The type or types of the data.
     */
    type?: string | string[];
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
    composite: JSONObject;

    /**
     * The user setting values.
     */
    user: JSONObject;
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
    readonly schema: ISettingRegistry.ISchema;

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
     */
    get(key: string): { composite: JSONValue, user: JSONValue };

    /**
     * Save all of the plugin's user settings at once.
     */
    save(user: JSONObject): Promise<void>;

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
export
class DefaultSchemaValidator implements ISchemaValidator {
  /**
   * Instantiate a schema validator.
   */
  constructor() {
    this._composer.addSchema(Private.SCHEMA, 'main');
    this._validator.addSchema(Private.SCHEMA, 'main');
  }

  /**
   * Add a schema to the validator.
   *
   * @param plugin - The plugin ID.
   *
   * @param schema - The schema being added.
   *
   * @return A list of errors if the schema fails to validate or `null` if there
   * are no errors.
   *
   * #### Notes
   * It is safe to call this function multiple times with the same plugin name.
   */
  addSchema(plugin: string, schema: ISettingRegistry.ISchema): ISchemaValidator.IError[] | null {
    const composer = this._composer;
    const validator = this._validator;
    const validate = validator.getSchema('main');

    // Validate against the main schema.
    if (!(validate(schema) as boolean)) {
      return validate.errors as ISchemaValidator.IError[];
    }

    // Validate against the JSON schema meta-schema.
    if (!(validator.validateSchema(schema) as boolean)) {
      return validator.errors as ISchemaValidator.IError[];
    }

    // Remove if schema already exists.
    composer.removeSchema(plugin);
    validator.removeSchema(plugin);

    // Add schema to the validator and composer.
    composer.addSchema(schema, plugin);
    validator.addSchema(schema, plugin);

    return null;

  }

  /**
   * Validate a plugin's schema and user data; populate the `composite` data.
   *
   * @param plugin - The plugin being validated. Its `composite` data will be
   * populated by reference.
   *
   * @return A list of errors if either the schema or data fail to validate or
   * `null` if there are no errors.
   */
  validateData(plugin: ISettingRegistry.IPlugin): ISchemaValidator.IError[] | null {
    const validate = this._validator.getSchema(plugin.id);
    const compose = this._composer.getSchema(plugin.id);

    if (!validate || !compose) {
      const errors = this.addSchema(plugin.id, plugin.schema);

      if (errors) {
        return errors;
      }
    }

    if (!validate(plugin.data.user)) {
      return validate.errors as ISchemaValidator.IError[];
    }

    // Copy the user data before validating (and merging defaults).
    plugin.data.composite = copy(plugin.data.user);

    if (!compose(plugin.data.composite)) {
      return compose.errors as ISchemaValidator.IError[];
    }

    return null;
  }

  private _composer = new Ajv({ useDefaults: true });
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
  constructor(options: SettingRegistry.IOptions) {
    this._connector = options.connector;
    this._validator = options.validator || new DefaultSchemaValidator();
    this._preload = options.preload || (() => { /* no op */ });
  }

  /**
   * The schema of the setting registry.
   */
  readonly schema = Private.SCHEMA;

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
   * @returns A promise that resolves when the setting is retrieved.
   */
  get(plugin: string, key: string): Promise<{ composite: JSONValue, user: JSONValue }> {
    const plugins = this._plugins;

    if (plugin in plugins) {
      const { composite, user } = plugins[plugin].data;
      const result = {
        composite: key in composite ? copy(composite[key]) : void 0,
        user: key in user ? copy(user[key]) : void 0
      };

      return Promise.resolve(result);
    }

    return this.load(plugin).then(() => this.get(plugin, key));
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
      const settings = new Settings({ plugin: plugins[plugin], registry });

      return Promise.resolve(settings);
    }

    // If the plugin needs to be loaded from the data connector, fetch.
    return this.reload(plugin);
  }

  /**
   * Preload the schema for a plugin.
   *
   * @param plugin - The plugin ID.
   *
   * @param schema - The schema being added.
   *
   * #### Notes
   * This method is deprecated and is only intented for use until there is a
   * server-side API for storing setting data.
   */
  preload(plugin: string, schema: ISettingRegistry.ISchema): void {
    this._preload(plugin, schema);
  }

  /**
   * Reload a plugin's settings into the registry even if they already exist.
   *
   * @param plugin - The name of the plugin whose settings are being reloaded.
   *
   * @returns A promise that resolves with a plugin settings object or rejects
   * with a list of `ISchemaValidator.IError` objects if it fails.
   */
  reload(plugin: string): Promise<ISettingRegistry.ISettings> {
    const connector = this._connector;
    const plugins = this._plugins;

    // If the plugin needs to be loaded from the connector, fetch.
    return connector.fetch(plugin).then(data => {
      if (!data) {
        const message = `Setting data for ${plugin} does not exist.`;
        throw [{ keyword: '', message, schemaPath: '' }];
      }

      this._validate(data);

      return new Settings({
        plugin: copy(plugins[plugin]) as ISettingRegistry.IPlugin,
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

    delete plugins[plugin].data.user[key];

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

    plugins[plugin].data.user[key] = value;

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
   * Only the `user` data will be saved.
   */
  upload(raw: ISettingRegistry.IPlugin): Promise<void> {
    const plugins = this._plugins;
    const plugin = raw.id;
    let errors: ISchemaValidator.IError[] | null = null;

    // Validate the user data and create the composite data.
    raw.data.user = raw.data.user || { };
    delete raw.data.composite;
    errors = this._validator.validateData(raw);
    if (errors) {
      return Promise.reject(errors);
    }

    // Set the local copy.
    plugins[plugin] = raw;

    return this._save(plugin);
  }

  /**
   * Save a plugin in the registry.
   */
  private _save(plugin: string): Promise<void> {
    const plugins = this._plugins;

    if (!(plugin in plugins)) {
      return Promise.reject(`${plugin} does not exist in setting registry.`);
    }

    this._validate(plugins[plugin]);

    return this._connector.save(plugin, plugins[plugin].data.user)
      .then(() => { this._pluginChanged.emit(plugin); });
  }

  /**
   * Validate a plugin's data and schema, compose the `composite` data.
   */
  private _validate(plugin: ISettingRegistry.IPlugin): void {
    let errors: ISchemaValidator.IError[] | null = null;

    // Add the schema to the registry.
    errors = this._validator.addSchema(plugin.id, plugin.schema);
    if (errors) {
      throw errors;
    }

    // Validate the user data and create the composite data.
    plugin.data.user = plugin.data.user || { };
    delete plugin.data.composite;
    errors = this._validator.validateData(plugin);
    if (errors) {
      throw errors;
    }

    // Set the local copy.
    this._plugins[plugin.id] = plugin;
  }

  private _connector: IDataConnector<ISettingRegistry.IPlugin, JSONObject>;
  private _pluginChanged = new Signal<this, string>(this);
  private _plugins: { [name: string]: ISettingRegistry.IPlugin } = Object.create(null);
  private _preload: (plugin: string, schema: ISettingRegistry.ISchema) => void;
  private _validator: ISchemaValidator | null = null;
}


/**
 * A manager for a specific plugin's settings.
 */
export
class Settings implements ISettingRegistry.ISettings {
  /**
   * Instantiate a new plugin settings manager.
   */
  constructor(options: Settings.IOptions) {
    const { plugin } = options;

    this.plugin = plugin.id;
    this.registry = options.registry;

    this._composite = plugin.data.composite || { };
    this._schema = plugin.schema || { type: 'object' };
    this._user = plugin.data.user || { };

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
  get schema(): ISettingRegistry.ISchema {
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
    const { composite, user } = this;

    return {
      composite: key in composite ? copy(composite[key]) : void 0,
      user: key in user ? copy(user[key]) : void 0
    };
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

      this._composite = composite || { };
      this._schema = schema || { type: 'object' };
      this._user = user || { };
      this._changed.emit(void 0);
    }
  }

  private _changed = new Signal<this, void>(this);
  private _composite: JSONObject = Object.create(null);
  private _isDisposed = false;
  private _schema: ISettingRegistry.ISchema = Object.create(null);
  private _user: JSONObject = Object.create(null);
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
     * The data connector used by the setting registry.
     */
    connector: IDataConnector<ISettingRegistry.IPlugin, JSONObject>;

    /**
     * A function that preloads a plugin's schema in the client-side cache.
     *
     * #### Notes
     * This param is deprecated and is only intented for use until there is a
     * server-side API for storing setting data.
     */
    preload?: (plugin: string, schema: ISettingRegistry.ISchema) => void;

    /**
     * The validator used to enforce the settings JSON schema.
     */
    validator?: ISchemaValidator;
  }
}


/**
 * A namespace for `Settings` statics.
 */
export
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


/**
 * A namespace for private module data.
 */
export
namespace Private {
  /* tslint:disable */
  /**
   * The schema for settings.
   */
  export
  const SCHEMA: ISettingRegistry.ISchema = {
    "$schema": "http://json-schema.org/draft-06/schema",
    "title": "Jupyter Settings/Preferences Schema",
    "description": "Jupyter settings/preferences schema v0.1.0",
    "type": "object",
    "additionalProperties": true,
    "properties": {
      [ICON_CLASS_KEY]: { "type": "string", "default": "jp-FileIcon" },
      [ICON_LABEL_KEY]: { "type": "string", "default": "Plugin" }
    }
  };
  /* tslint:enable */
}
