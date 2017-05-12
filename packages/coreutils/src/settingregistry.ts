// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JSONObject, JSONValue, PromiseDelegate
} from '@phosphor/coreutils';

import {
  ISignal, Signal
} from '@phosphor/signaling';

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
   * The value specification for a setting item.
   */
  export
  interface IItem {
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
  interface IFile extends JSONObject {
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
   * A signal that emits name of a setting file when one changes.
   */
  get fileChanged(): ISignal<this, string> {
    return this._fileChanged;
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
  load(file: string, reload = false): Promise<ISettingRegistry.IFile> {
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
   * Set a single setting in the registry.
   *
   * @param item - The setting item being set.
   *
   * @returns A promise that resolves when the setting has been saved.
   *
   */
  set(item: ISettingRegistry.IItem): Promise<void> {
    const { file } = item;

    if (!(file in this._files)) {
      return this.load(file).then(() => this.set(item));
    }

    const { key, level, value } = item;
    const bundle = this._files[file] && this._files[file].data;

    // Overwrite the relevant key.
    if (!bundle[level]) {
      bundle[level] = {};
    }
    bundle[level][key] = value;

    // Save the file.
    return this._save(file);
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
  setDB(datastore: IDatastore<ISettingRegistry.IFile, ISettingRegistry.IFile>) {
    if (this._datastore) {
      throw new Error('Setting registry already has a datastore.');
    }

    this._datastore = datastore;
    this._ready.resolve(void 0);
  }

  /**
   * Upload a setting file for an extension.
   *
   * @param file - The file being uploaded.
   *
   * @returns A promise that resolves when the file has been saved.
   */
  upload(file: ISettingRegistry.IFile): Promise<void> {
    this._files[file.name] = file;
    return this._save(file.name);
  }

  /**
   * Save a file that is known to exist in the registry.
   */
  private _save(file: string): Promise<void> {
    return this._datastore.save(file, this._files[file])
      .then(() => { this._fileChanged.emit(file); });
  }

  private _datastore: IDatastore<ISettingRegistry.IFile, ISettingRegistry.IFile> | null = null;
  private _fileChanged = new Signal<this, string>(this);
  private _files: { [name: string]: ISettingRegistry.IFile } = Object.create(null);
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
    datastore?: IDatastore<ISettingRegistry.IFile, ISettingRegistry.IFile>;
  }
}
