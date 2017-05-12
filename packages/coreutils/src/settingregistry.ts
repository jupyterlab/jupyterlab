// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JSONObject, JSONValue, PromiseDelegate
} from '@phosphor/coreutils';

import {
  IDatastore
} from '.';


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
   * The options for adding a new setting value.
   */
  export
  interface IAddOptions {
    /**
     * The extension name where this setting resides.
     */
    file: string;

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
  interface ISettingFile extends JSONObject {
    /**
     * The name of an extension whose settings are saved.
     */
    name: string;

    /**
     * The collection of values for a specified setting.
     */
    data: Bundle | null;
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
   * Instantiate a setting registry.
   */
  constructor(options?: SettingRegistry.IOptions) {
    if (options.datastore) {
      this.setDB(options.datastore);
    }
  }

  /**
   * Add a setting to the registry.
   */
  add(options: ISettingRegistry.IAddOptions): Promise<void> {
    if (this._datastore) {
      return Promise.resolve(void 0);
    }

    return this._ready.promise.then(() => this.add(options));
  }

  /**
   * Get an individual setting.
   *
   * @param file - The name of the extension whose setting is being retrieved.
   *
   * @param key - The name of the setting being retrieved.
   *
   * @param level - The setting level.
   *
   * @returns A promise that resolves when the setting is retrieved.
   */
  get(file: string, key: string, level: ISettingRegistry.Level = 'user'): Promise<JSONValue> {
    if (file in this._files) {
      const bundle = this._files[file] && this._files[file].data;
      const value = bundle && bundle[level] && bundle[level][key];

      return Promise.resolve(value);
    }

    return this.load(file).then(() => this.get(file, key, level));
  }

  /**
   * Load an extension's settings into the setting registry.
   *
   * @param file - The name of the extension whose settings are being loaded.
   *
   * @param reload - Reload from server, ignoring cache. Defaults to false.
   *
   * @returns A promise that resolves with the setting file after loading.
   */
  load(file: string, reload = false): Promise<ISettingRegistry.ISettingFile> {
    const files = this._files;

    if (!reload && file in files) {
      return Promise.resolve(files[file]);
    }

    if (this._datastore) {
      return this._datastore.fetch(file)
        .then(contents => files[contents.name] = contents);
    }

    return this._ready.promise.then(() => this.load(file));
  }

  /**
   * Set an individual setting.
   *
   * @param file - The name of the extension whose settings are being set.
   *
   * @param key - The name of the setting being set.
   *
   * @param value - The value of the setting being set.
   *
   * @param level - The setting level.
   *
   * @returns A promise that resolves when the setting is saved.
   */
  set(file: string, key: string, value: JSONValue, level: ISettingRegistry.Level = 'user'): Promise<void> {
    if (file in this._files) {
      const bundle = this._files[file] && this._files[file].data;

      if (!bundle[level]) {
        bundle[level] = {};
      }
      bundle[level][key] = value;

      return Promise.resolve(void 0);
    }

    return this.load(file).then(() => this.set(file, key, value, level));
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
  setDB(datastore: IDatastore<ISettingRegistry.ISettingFile, ISettingRegistry.ISettingFile>) {
    if (this._datastore) {
      throw new Error('Setting registry already has a datastore.');
    }

    this._datastore = datastore;
    this._ready.resolve(void 0);
  }

  private _datastore: IDatastore<ISettingRegistry.ISettingFile, ISettingRegistry.ISettingFile> | null = null;
  private _files: { [name: string]: ISettingRegistry.ISettingFile } = Object.create(null);
  private _ready = new PromiseDelegate<void>();
}

/**
 * A namespace for SettingRegistry statics.
 */
export
namespace SettingRegistry {
  /**
   * The instantiation options for a setting registry.
   */
  export
  interface IOptions {
    /**
     * The underlying datastore of a setting registry.
     */
    datastore?: IDatastore<ISettingRegistry.ISettingFile, ISettingRegistry.ISettingFile>;
  }
}
