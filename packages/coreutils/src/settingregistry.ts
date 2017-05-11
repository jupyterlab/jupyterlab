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
     level: 'user' | 'system';

     /**
      * The value of the setting being added.
      */
     value: JSONValue;
  }

  /**
   * A collection of setting data for a specific key.
   */
  export
  interface ISettingBundle extends JSONObject {
    /**
     * The data value for a user-level setting items.
     */
    user?: { [key: string]: JSONValue } | null;

    /**
     * The data value for a system-level setting items.
     */
    system?: { [key: string]: JSONValue } | null;
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
    data: ISettingBundle | null;
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
    if (!this._datastore) {
      return this._ready.promise.then(() => this.add(options));
    }
    return Promise.resolve(void 0);
  }

  /**
   * Load an extension's settings into the setting registry.
   */
  load(file: string): Promise<ISettingRegistry.ISettingFile> {
    if (!this._datastore) {
      return this._ready.promise.then(() => this.load(file));
    }
    return this._datastore.fetch(file).then(contents => {
      this._files[contents.name] = contents;
      return contents;
    });
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
