// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

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


/**
 * The default level that is used when level is unspecified in a request.
 */
const LEVEL: ISettingRegistry.Level = 'user';

/**
 * An alias for the JSON deep copy function.
 */
const copy = JSONExt.deepCopy;


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
   * The setting level: user or system.
   */
  export
  type Level = 'system' | 'user';

  /**
   * An annotation for a specific setting or a plugin.
   */
  export
  interface IAnnotation extends JSONObject {
    /**
     * The caption for the setting.
     */
    caption?: string;

    /**
     * The extra class name for the setting.
     */
    className?: string;

    /**
     * The icon class for the setting.
     */
    iconClass?: string;

    /**
     * The icon label for the setting.
     */
    iconLabel?: string;

    /**
     * The label for the setting.
     */
    label?: string;
  }

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
    data: ISettingBundle | null;
  }

  /**
   * The annotations for a plugin.
   */
  export
  interface IPluginAnnotations extends JSONObject {
    annotation: IAnnotation;
    keys?: { [key: string]: IAnnotation };
  }

  /**
   * The collection of user and system preferences for a plugin.
   */
  export
  interface ISettingBundle extends JSONObject {
    system?: { [key: string]: JSONValue };
    user?: { [key: string]: JSONValue };
  }

  /**
   * An interface for manipulating the settings of a specific plugin.
   */
  export
  interface ISettings extends IDisposable {
    /**
     * The annotation hints for a plugin.
     */
    readonly annotations: IPluginAnnotations | null;

    /**
     * A signal that emits when the plugin's settings have changed.
     */
    readonly changed: ISignal<this, void>;

    /*
     * The plugin name.
     */
    readonly plugin: string;

    /**
     * Get the raw plugin settings.
     */
    readonly raw: IPlugin;

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
     * @param level - The setting level. Defaults to `user`.
     *
     * @returns The setting value.
     *
     * #### Notes
     * This method returns synchronously because it uses a cached copy of the
     * plugin settings that is synchronized with the registry.
     */
    get(key: string, level?: Level): JSONValue;

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
 * The default concrete implementation of a setting registry.
 */
export
class SettingRegistry {
  /**
   * Create a new setting registry.
   */
  constructor(options: SettingRegistry.IOptions = { datastore: null }) {
    const namespace = 'jupyter.db.settings';
    this._datastore = options.datastore || new StateDB({ namespace });
  }

  /**
   * Returns a map of annotation hints for plugins in the registry.
   */
  get annotations(): { [plugin: string]: ISettingRegistry.IPluginAnnotations } {
    const annotations = this._annotations;

    return copy(annotations) as {
      [plugin: string]: ISettingRegistry.IPluginAnnotations
    };
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
   * Annotate a plugin or a setting item for places where it might be displayed.
   *
   * @param plugin - The name of the plugin whose setting is being annotated.
   *
   * @param key - The name of the key being annotated. If `null` or empty, the
   * annotation will be applied at the plugin level.
   *
   * @param annotation - The annotation describing a plugin or a setting.
   */
  annotate(plugin: string, key: string, annotation: ISettingRegistry.IAnnotation): void {
    if (!this._annotations[plugin]) {
      this._annotations[plugin] = { annotation: null, keys: { } };
    }

    if (key) {
      this._annotations[plugin].keys[key] = annotation;
    } else {
      this._annotations[plugin].annotation = annotation;
    }

    this._pluginChanged.emit(plugin);
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
  get(plugin: string, key: string, level: ISettingRegistry.Level = LEVEL): Promise<JSONValue> {
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
   * @returns A promise that resolves with a plugin settings object.
   */
  load(plugin: string): Promise<ISettingRegistry.ISettings> {
    const plugins = this._plugins;
    const registry = this;

    // If the plugin exists, resolve.
    if (plugin in plugins) {
      const annotations = this._annotations[plugin] || null;
      const content = plugins[plugin];
      const settings = new Settings({ annotations, content, plugin, registry });

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
   * @returns A promise that resolves with a plugin settings object.
   */
  reload(plugin: string): Promise<ISettingRegistry.ISettings> {
    const datastore = this._datastore;
    const plugins = this._plugins;

    // If the plugin needs to be loaded from the datastore, fetch.
    return datastore.fetch(plugin).then(result => {
      // Set the local copy.
      plugins[plugin] = result || { id: plugin, data: { } };

      // Copy over any annotations that may be available.
      const annotations = copy(this._annotations[plugin]);

      return new Settings({
        annotations: annotations as ISettingRegistry.IPluginAnnotations,
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
    const plugins = this._plugins;

    plugins[raw.id] = copy(raw) as ISettingRegistry.IPlugin;

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

  private _annotations: { [plugin: string]: ISettingRegistry.IPluginAnnotations } = Object.create(null);
  private _datastore: IDatastore<ISettingRegistry.IPlugin, ISettingRegistry.IPlugin> | null = null;
  private _pluginChanged = new Signal<this, string>(this);
  private _plugins: { [name: string]: ISettingRegistry.IPlugin } = Object.create(null);
}


/**
 * A manager for a specific plugin's settings.
 */
class Settings implements ISettingRegistry.ISettings {
  /**
   * Instantiate a new plugin settings manager.
   */
  constructor(options: Settings.IOptions) {
    this._annotations = options.annotations;
    this._content = options.content;
    this.plugin = options.plugin;
    this.registry = options.registry;

    this.registry.pluginChanged.connect(this._onPluginChanged, this);
  }

  /**
   * The annotation hints for the plugin.
   */
  get annotations(): ISettingRegistry.IPluginAnnotations {
    return this._annotations;
  }

  /**
   * A signal that emits when the plugin's settings have changed.
   */
  get changed(): ISignal<this, void> {
    return this._changed;
  }

  /**
   * Test whether the plugin settings manager disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * The plugin name.
   */
  readonly plugin: string;

  /**
   * Get the raw plugin settings.
   */
  get raw(): ISettingRegistry.IPlugin {
    return copy(this._content) as ISettingRegistry.IPlugin;
  }

  /**
   * The system registry instance used by the settings manager.
   */
  readonly registry: SettingRegistry;

  /**
   * Annotate a plugin or a setting item for places where it might be displayed.
   *
   * @param key - The name of the key being annotated. If `null` or empty, the
   * annotation will be applied at the plugin level.
   *
   * @param annotation - The annotation describing a plugin or a setting.
   */
  annotate(key: string, annotation: ISettingRegistry.IAnnotation): void {
    this.registry.annotate(this.plugin, key, annotation);
  }

  /**
   * Dispose of the plugin settings resources.
   */
  dispose(): void {
    if (this._isDisposed) {
      return;
    }

    this._isDisposed = true;
    this._content = null;
    Signal.clearData(this);
  }

  /**
   * Get an individual setting.
   *
   * @param key - The name of the setting being retrieved.
   *
   * @param level - The setting level. Defaults to `user`.
   *
   * @returns The setting value.
   *
   * #### Notes
   * This method returns synchronously because it uses a cached copy of the
   * plugin settings that is synchronized with the registry.
   */
  get(key: string, level: ISettingRegistry.Level = LEVEL): JSONValue {
    const { data } = this._content;

    return data[level] && data[level][key];
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
   * Save all of the plugin's settings at once.
   */
  save(raw: ISettingRegistry.IPlugin): Promise<void> {
    return this.registry.upload({ data: raw, id: this.plugin });
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
      this._content = find(this.registry.plugins, p => p.id === plugin);
      this._changed.emit(void 0);
    }
  }

  private _annotations: ISettingRegistry.IPluginAnnotations | null = null;
  private _changed = new Signal<this, void>(this);
  private _content: ISettingRegistry.IPlugin | null = null;
  private _isDisposed = false;
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
    datastore: IDatastore<ISettingRegistry.IPlugin, ISettingRegistry.IPlugin>;
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
     * The annotation hints for a plugin.
     */
    annotations: ISettingRegistry.IPluginAnnotations | null;

    /**
     * The setting values for a plugin.
     */
    content: ISettingRegistry.IPlugin;

    /**
     * The plugin that the settings object references.
     */
    plugin: string;

    /**
     * The system registry instance used by the settings manager.
     */
    registry: SettingRegistry;
  }
}
