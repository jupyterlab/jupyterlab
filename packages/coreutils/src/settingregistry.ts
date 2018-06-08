// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import Ajv from 'ajv';

import * as json from 'comment-json';

import {
  find
} from '@phosphor/algorithm';

import {
  JSONExt, JSONObject, JSONValue, ReadonlyJSONObject, Token
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
   * Validate a plugin's schema and user data; populate the `composite` data.
   *
   * @param plugin - The plugin being validated. Its `composite` data will be
   * populated by reference.
   *
   * @param populate - Whether plugin data should be populated, defaults to
   * `true`.
   *
   * @return A list of errors if either the schema or data fail to validate or
   * `null` if there are no errors.
   */
  validateData(plugin: ISettingRegistry.IPlugin, populate?: boolean): ISchemaValidator.IError[] | null;
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
     * The path in the data where the error occurred.
     */
    dataPath: string;

    /**
     * The keyword whose validation failed.
     */
    keyword: string;

    /**
     * The error message.
     */
    message: string;

    /**
     * Optional parameter metadata that might be included in an error.
     */
    params?: ReadonlyJSONObject;

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
const ISettingRegistry = new Token<ISettingRegistry>('@jupyterlab/coreutils:ISettingRegistry');
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
     * The raw user settings data as a string containing JSON with comments.
     */
    raw: string;

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
     * The plugin settings raw text value.
     */
    readonly raw: string;

    /**
     * Get the plugin settings schema.
     */
    readonly schema: ISettingRegistry.ISchema;

    /**
     * Get the user settings.
     */
    readonly user: JSONObject;

    /**
     * Return the defaults in a commented JSON format.
     */
    annotatedDefaults(): string;

    /**
     * Calculate the default value of a setting by iterating through the schema.
     *
     * @param key - The name of the setting whose default value is calculated.
     *
     * @returns A calculated default JSON value for a specific setting.
     */
    default(key: string): JSONValue | undefined;

    /**
     * Get an individual setting.
     *
     * @param key - The name of the setting being retrieved.
     *
     * @returns The setting value.
     */
    get(key: string): { composite: JSONValue, user: JSONValue };

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
     * Save all of the plugin's user settings at once.
     */
    save(raw: string): Promise<void>;

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

    /**
     * Validates raw settings with comments.
     *
     * @param raw - The JSON with comments string being validated.
     *
     * @returns A list of errors or `null` if valid.
     */
    validate(raw: string): ISchemaValidator.IError[] | null;
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
   * Validate a plugin's schema and user data; populate the `composite` data.
   *
   * @param plugin - The plugin being validated. Its `composite` data will be
   * populated by reference.
   *
   * @param populate - Whether plugin data should be populated, defaults to
   * `true`.
   *
   * @return A list of errors if either the schema or data fail to validate or
   * `null` if there are no errors.
   */
  validateData(plugin: ISettingRegistry.IPlugin, populate = true): ISchemaValidator.IError[] | null {
    const validate = this._validator.getSchema(plugin.id);
    const compose = this._composer.getSchema(plugin.id);

    // If the schemas do not exist, add them to the validator and continue.
    if (!validate || !compose) {
      const errors = this._addSchema(plugin.id, plugin.schema);

      if (errors) {
        return errors;
      }

      return this.validateData(plugin);
    }

    // Parse the raw commented JSON into a user map.
    let user: JSONObject;
    try {
      const strip = true;

      user = json.parse(plugin.raw, null, strip) as JSONObject;
    } catch (error) {
      if (error instanceof SyntaxError) {
        return [{
          dataPath: '', keyword: 'syntax', schemaPath: '',
          message: error.message
        }];
      }

      const { column, description } = error;
      const line = error.lineNumber;

      return [{
        dataPath: '', keyword: 'parse', schemaPath: '',
        message: `${description} (line ${line} column ${column})`
      }];
    }

    if (!validate(user)) {
      return validate.errors as ISchemaValidator.IError[];
    }

    // Copy the user data before merging defaults into composite map.
    const composite = copy(user);

    if (!compose(composite)) {
      return compose.errors as ISchemaValidator.IError[];
    }

    if (populate) {
      plugin.data = { composite, user };
    }

    return null;
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
  private _addSchema(plugin: string, schema: ISettingRegistry.ISchema): ISchemaValidator.IError[] | null {
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
    this.validator = options.validator || new DefaultSchemaValidator();
  }

  /**
   * The schema of the setting registry.
   */
  readonly schema = Private.SCHEMA;

  /**
   * The schema validator used by the setting registry.
   */
  readonly validator: ISchemaValidator;

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
        composite: key in composite ? copy(composite[key]) : undefined,
        user: key in user ? copy(user[key]) : undefined
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
    const registry = this;

    // If the plugin needs to be loaded from the connector, fetch.
    return connector.fetch(plugin).then(data => {
      // Validate the response from the connector; populate `composite` field.
      try {
        this._validate(data);
      } catch (errors) {
        const output = [`Validating ${plugin} failed:`];

        (errors as ISchemaValidator.IError[]).forEach((error, index) => {
          const { dataPath, schemaPath, keyword, message } = error;

          output.push(`${index} - schema @ ${schemaPath}, data @ ${dataPath}`);
          output.push(`\t${keyword} ${message}`);
        });
        console.error(output.join('\n'));

        throw new Error(`Failed validating ${plugin}`);
      }

      // Emit that a plugin has changed.
      this._pluginChanged.emit(plugin);

      return new Settings({ plugin: plugins[plugin], registry });
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
      return Promise.resolve(undefined);
    }

    const raw = json.parse(plugins[plugin].raw);

    // Delete both the value and any associated comment.
    delete raw[key];
    delete raw[`// ${key}`];
    plugins[plugin].raw = json.stringify(raw);

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

    const raw = json.parse(plugins[plugin].raw);

    plugins[plugin].raw = json.stringify({ ...raw, [key]: value });

    return this._save(plugin);
  }

  /**
   * Upload a plugin's settings.
   *
   * @param plugin - The name of the plugin whose settings are being set.
   *
   * @param raw - The raw plugin settings being uploaded.
   *
   * @returns A promise that resolves when the settings have been saved.
   */
  upload(plugin: string, raw: string): Promise<void> {
    const plugins = this._plugins;

    if (!(plugin in plugins)) {
      return this.load(plugin).then(() => this.upload(plugin, raw));
    }

    // Set the local copy.
    plugins[plugin].raw = raw;

    return this._save(plugin);
  }

  /**
   * Save a plugin in the registry.
   */
  private _save(plugin: string): Promise<void> {
    const plugins = this._plugins;

    if (!(plugin in plugins)) {
      const message = `${plugin} does not exist in setting registry.`;

      return Promise.reject(new Error(message));
    }

    try {
      this._validate(plugins[plugin]);
    } catch (errors) {
      const message = `${plugin} failed to validate; check console for errors.`;

      console.warn(`${plugin} validation errors:`, errors);
      return Promise.reject(new Error(message));
    }

    return this._connector.save(plugin, plugins[plugin].raw)
      .then(() => { this._pluginChanged.emit(plugin); });
  }

  /**
   * Validate a plugin's data and schema, compose the `composite` data.
   */
  private _validate(plugin: ISettingRegistry.IPlugin): void {
    // Validate the user data and create the composite data.
    const errors = this.validator.validateData(plugin);

    if (errors) {
      throw errors;
    }

    // Set the local copy.
    this._plugins[plugin.id] = plugin;
  }

  private _connector: IDataConnector<ISettingRegistry.IPlugin, string>;
  private _pluginChanged = new Signal<this, string>(this);
  private _plugins: { [name: string]: ISettingRegistry.IPlugin } = Object.create(null);
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
    this._raw = plugin.raw || '{ }';
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
   * Get the plugin settings raw text value.
   */
  get raw(): string {
    return this._raw;
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
   * Return the defaults in a commented JSON format.
   */
  annotatedDefaults(): string {
    return Private.annotatedDefaults(this._schema, this.plugin);
  }

  /**
   * Calculate the default value of a setting by iterating through the schema.
   *
   * @param key - The name of the setting whose default value is calculated.
   *
   * @returns A calculated default JSON value for a specific setting.
   */
  default(key: string): JSONValue | undefined {
    return Private.reifyDefault(this.schema, key);
  }

  /**
   * Dispose of the plugin settings resources.
   */
  dispose(): void {
    if (this._isDisposed) {
      return;
    }

    this._isDisposed = true;
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
      composite: key in composite ? copy(composite[key]) : undefined,
      user: key in user ? copy(user[key]) : undefined
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
  save(raw: string): Promise<void> {
    return this.registry.upload(this.plugin, raw);
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
   * Validates raw settings with comments.
   *
   * @param raw - The JSON with comments string being validated.
   *
   * @returns A list of errors or `null` if valid.
   */
  validate(raw: string): ISchemaValidator.IError[] | null {
    const data = { composite: { }, user: { } };
    const id = this.plugin;
    const schema = this._schema;
    const validator = this.registry.validator;

    return validator.validateData({ data, id, raw, schema }, false);
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
      const { raw, schema } = found;

      this._composite = composite || { };
      this._raw = raw;
      this._schema = schema || { type: 'object' };
      this._user = user || { };
      this._changed.emit(undefined);
    }
  }

  private _changed = new Signal<this, void>(this);
  private _composite: JSONObject = Object.create(null);
  private _isDisposed = false;
  private _raw = '{ }';
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
    connector: IDataConnector<ISettingRegistry.IPlugin, string>;

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

  /**
   * The default indentation level, uses spaces instead of tabs.
   */
  const indent = '    ';

  /**
   * Replacement text for schema properties missing a `description` field.
   */
  const nondescript = '[missing schema description]';

  /**
   * Replacement text for schema properties missing a `default` field.
   */
  const undefaulted = '[missing schema default]';

  /**
   * Replacement text for schema properties missing a `title` field.
   */
  const untitled = '[missing schema title]';

  /**
   * Returns an annotated (JSON with comments) version of a schema's defaults.
   */
  export
  function annotatedDefaults(schema: ISettingRegistry.ISchema, plugin: string): string {
    const { description, properties, title } = schema;
    const keys = Object.keys(properties).sort((a, b) => a.localeCompare(b));
    const length = Math.max((description || nondescript).length, plugin.length);

    return [
      '{',
      prefix(`${title || untitled}`),
      prefix(plugin),
      prefix(description || nondescript),
      prefix(line(length)),
      '',
      keys.map(key => docstring(schema, key)).join(',\n\n'),
      '}'
    ].join('\n');
  }

  /**
   * Returns a documentation string for a specific schema property.
   */
  function docstring(schema: ISettingRegistry.ISchema, key: string): string {
    const { description, title } = schema.properties[key];
    const reified = reifyDefault(schema, key);
    const defaults = reified === undefined ? prefix(`"${key}": ${undefaulted}`)
      : prefix(`"${key}": ${JSON.stringify(reified, null, 2)}`, indent);

    return [
      prefix(`${title || untitled}`),
      prefix(description || nondescript),
      defaults
    ].join('\n');
  }

  /**
   * Returns a line of a specified length.
   */
  function line(length: number, ch = '*'): string {
    return (new Array(length + 1)).join(ch);
  }

  /**
   * Returns a documentation string with a comment prefix added on every line.
   */
  function prefix(source: string, pre = `${indent}\/\/ `): string {
    return pre + source.split('\n').join(`\n${pre}`);
  }

  /**
   * Create a fully extrapolated default value for a root key in a schema.
   */
  export
  function reifyDefault(schema: ISettingRegistry.ISchema, root?: string): JSONValue | undefined {
    // If the property is at the root level, traverse its schema.
    schema = (root ? schema.properties[root] : schema) || { };

    // If the property has no default or is a primitive, return.
    if (!('default' in schema) || schema.type !== 'object') {
      return schema.default;
    }

    // Make a copy of the default value to populate.
    const result = JSONExt.deepCopy(schema.default);

    // Iterate through and populate each child property.
    for (let property in schema.properties || { }) {
      result[property] = reifyDefault(schema.properties[property]);
    }

    return result;
  }
}
