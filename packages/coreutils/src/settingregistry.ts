// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JSONExt, JSONObject, JSONValue, PromiseDelegate
} from '@phosphor/coreutils';

import {
  IDisposable
} from '@phosphor/disposable';

import {
  ISignal, Signal
} from '@phosphor/signaling';

import {
  IDatastore
} from '.';


/**
 * The default level that is used when level is unspecified in a request.
 */
const LEVEL: ISettingRegistry.Level = 'user';


/**
 * A namespace for setting registry interfaces.
 */
export
namespace ISettingRegistry {
  /**
   * The setting level: user or system.
   */
  export
  type Level = 'user' | 'system';

  /**
   * A collection of setting data for a specific key.
   */
  export
  type Bundle = {
    [level in Level]?: { [key: string]: JSONValue } | null;
  };

  /**
   * The value specification for a setting item.
   */
  export
  interface IItem {
    /**
     * The plugin name where this setting resides.
     */
    plugin: string;

    /**
     * The name of the setting being added.
     */
    key: string;

    /**
     * The setting level.
     */
    level: Level;

    /**
     * The value of the setting being added.
     */
    value: JSONValue;
  }

  /**
   */
  export
  interface IPlugin extends JSONObject {
    /**
     * The name of an extension whose settings are saved.
     */
    id: string;

    /**
     * The collection of values for a specified setting.
     */
    data: Bundle | null;
  }

  /**
   * An interface for manipulating the settings of a specific plugin.
   */
  export
  interface ISettings extends IDisposable {
    /**
     * The plugin name.
     */
    readonly plugin: string;

    /**
     * Get an individual setting.
     *
     * @param key - The name of the setting being retrieved.
     *
     * @param level - The setting level. Defaults to `user`.
     *
     * @returns A promise that resolves when the setting is retrieved.
     */
    get(key: string, level?: ISettingRegistry.Level): Promise<JSONValue>;

    /**
     * Remove a single setting.
     *
     * @param key - The name of the setting being removed.
     *
     * @param level - The setting level. Defaults to `user`.
     *
     * @returns A promise that resolves when the setting is removed.
     */
    remove(key: string, level?: ISettingRegistry.Level): Promise<void>;

    /**
     * Set a single setting.
     *
     * @param key - The name of the setting being set.
     *
     * @param value - The value of the setting.
     *
     * @param level - The setting level. Defaults to `user`.
     *
     * @returns A promise that resolves when the setting has been saved.
     *
     */
    set(key: string, value: JSONValue, level?: ISettingRegistry.Level): Promise<void>;
  };
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
   * A signal that emits name of a plugin when its settings change.
   */
  get pluginChanged(): ISignal<this, string> {
    return this._pluginChanged;
  }

  /**
   * Returns a list of plugin settings held in the registry.
   */
  plugins(): ISettingRegistry.IPlugin[] {
    const plugins = this._plugins;
    return Object.keys(plugins).map(key => {
      const plugin = plugins[key];
      return JSONExt.deepCopy(plugin) as ISettingRegistry.IPlugin;
    });
  }

  /**
   * Get an individual setting.
   *
   * @param plugin - The name of the plugin whose settings are being retrieved.
   *
   * @param key - The name of the setting being retrieved.
   *
   * @param level - The setting level.
   *
   * @returns A promise that resolves when the setting is retrieved.
   */
  get(plugin: string, key: string, level: ISettingRegistry.Level = LEVEL): Promise<JSONValue> {
    if (plugin in this._plugins) {
      const bundle = this._plugins[plugin] && this._plugins[plugin].data;
      const value = bundle && bundle[level] && bundle[level][key] || null;

      return Promise.resolve(JSONExt.deepCopy(value));
    }

    return this.load(plugin).then(() => this.get(plugin, key, level));
  }

  /**
   * Load a plugin's settings into the setting registry.
   *
   * @param plugin - The name of the plugin whose settings are being loaded.
   *
   * @param reload - Reload from server, ignoring cache. Defaults to false.
   *
   * @returns A promise that resolves with a plugin settings object.
   */
  load(plugin: string, reload = false): Promise<ISettingRegistry.ISettings> {
    const plugins = this._plugins;

    if (!reload && plugin in plugins) {
      const content = plugins[plugin];

      return Promise.resolve(new Settings({ content, plugin }));
    }

    if (this._datastore) {
      return this._datastore.fetch(plugin).then(result => {
        const content = plugins[result.id] = result;

        return new Settings({ content, plugin });
      });
    }

    return this._ready.promise.then(() => this.load(plugin));
  }

  /**
   * Remove a single setting in the registry.
   *
   * @param plugin - The name of the plugin whose setting is being removed.
   *
   * @param key - The name of the setting being removed.
   *
   * @param level - The setting level.
   *
   * @returns A promise that resolves when the setting is removed.
   */
  remove(plugin: string, key: string, level: ISettingRegistry.Level = LEVEL): Promise<void> {
    if (!(plugin in this._plugins)) {
      return Promise.resolve(void 0);
    }

    const bundle =  this._plugins[plugin].data;
    if (!bundle[level]) {
      return Promise.resolve(void 0);
    }

    delete bundle[level][key];

    return this._save(plugin);
  }

  /**
   * Set a single setting in the registry.
   *
   * @param item - The setting item being set.
   *
   * @returns A promise that resolves when the setting has been saved.
   *
   */
  set(item: ISettingRegistry.IItem): Promise<void> {
    const { plugin } = item;

    if (!(plugin in this._plugins)) {
      return this.load(plugin).then(() => this.set(item));
    }

    const { key, level, value } = item;
    const bundle = this._plugins[plugin].data;

    if (!bundle[level]) {
      bundle[level] = {};
    }
    bundle[level][key] = value;

    return this._save(plugin);
  }

  /**
   * Set the setting registry datastore.
   *
   * @param datastore - The datastore for the setting registry.
   *
   * @throws If a datastore has already been set.
   *
   * #### Notes
   * The setting registry datastore must read, write, and delete settings for an
   * entire extension at a time. It is comparable to a single file written to
   * disk on a file system.
   */
  setDB(datastore: IDatastore<ISettingRegistry.IPlugin, ISettingRegistry.IPlugin>) {
    if (this._datastore) {
      throw new Error('Setting registry already has a datastore.');
    }

    this._datastore = datastore;
    this._ready.resolve(void 0);
  }

  /**
   * Upload a plugin's settings.
   *
   * @param plugin - The plugin settings being uploaded.
   *
   * @returns A promise that resolves when the settings have been saved.
   */
  upload(plugin: ISettingRegistry.IPlugin): Promise<void> {
    this._plugins[plugin.id] = plugin;
    return this._save(plugin.id);
  }

  /**
   * Save a plugin in the registry.
   */
  private _save(plugin: string): Promise<void> {
    return this._datastore.save(plugin, this._plugins[plugin])
      .then(() => { this._pluginChanged.emit(plugin); });
  }

  private _datastore: IDatastore<ISettingRegistry.IPlugin, ISettingRegistry.IPlugin> | null = null;
  private _pluginChanged = new Signal<this, string>(this);
  private _plugins: { [name: string]: ISettingRegistry.IPlugin } = Object.create(null);
  private _ready = new PromiseDelegate<void>();
}


/**
 * A manager for a specific plugin's settings.
 */
class Settings implements ISettingRegistry.ISettings {
  /**
   * Instantiate a new plugin settings manager.
   */
  constructor(options: Settings.IOptions) {
    this._content = options.content;
    this.plugin = options.plugin;
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
   * Dispose of the plugin settings resources.
   */
  dispose(): void {
    if (this._isDisposed) {
      return;
    }
    this._content = null;
  }

  /**
   * Get an individual setting.
   *
   * @param key - The name of the setting being retrieved.
   *
   * @param level - The setting level. Defaults to `user`.
   *
   * @returns A promise that resolves when the setting is retrieved.
   */
  get(key: string, level?: ISettingRegistry.Level): Promise<JSONValue> {
    return Promise.reject(new Error('Settings#get not implemented yet.'));
  }

  /**
   * Remove a single setting.
   *
   * @param key - The name of the setting being removed.
   *
   * @param level - The setting level. Defaults to `user`.
   *
   * @returns A promise that resolves when the setting is removed.
   */
  remove(key: string, level?: ISettingRegistry.Level): Promise<void> {
    return Promise.reject(new Error('Settings#remove not implemented yet.'));
  }

  /**
   * Set a single setting.
   *
   * @param key - The name of the setting being set.
   *
   * @param value - The value of the setting.
   *
   * @param level - The setting level. Defaults to `user`.
   *
   * @returns A promise that resolves when the setting has been saved.
   *
   */
  set(key: string, value: JSONValue, level?: ISettingRegistry.Level): Promise<void> {
    return Promise.reject(new Error('Settings#set not implemented yet.'));
  }

  private _content: ISettingRegistry.IPlugin | null = null;
  private _isDisposed = false;
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
     * The actual setting values for a plugin.
     */
    content?: ISettingRegistry.IPlugin;

    /**
     * The plugin that the settings object references.
     */
    plugin: string;
  }
}
