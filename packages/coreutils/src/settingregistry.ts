// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JSONObject, PromiseDelegate
} from '@phosphor/coreutils';

import {
  DisposableDelegate, IDisposable
} from '@phosphor/disposable';

import {
  IDatastore
} from '.';


/**
 * A namespace for setting registry interfaces.
 */
export
namespace ISettingRegistry {
  /**
   * A collection of setting data for a specific key.
   */
  export
  interface ISettingBundle extends JSONObject {
    /**
     * The data value for a user-level setting item.
     */
    user?: JSONObject | null;

    /**
     * The data value for a system-level setting item.
     */
    system?: JSONObject | null;
  }


  /**
   */
  export
  interface ISettingFile extends JSONObject {
    /**
     * The identifier key for a setting item.
     */
    id: string;

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
  add(): Promise<IDisposable> {
    if (!this._isReady) {
      return this._ready.promise.then(() => this.add());
    }
    return Promise.resolve(new DisposableDelegate(() => { /* no op */ }));
  }

  /**
   * Set the setting registry data store.
   *
   * @param datastore - The datastore for the setting registry.
   *
   * @throws If a datastore has already been set.
   */
  setDB(datastore: IDatastore<ISettingRegistry.ISettingFile, ISettingRegistry.ISettingFile>) {
    if (this._isReady) {
      throw new Error('Setting registry already has a datastore.');
    }

    this._datastore = datastore;
    this._isReady = true;
    this._ready.resolve(void 0);
  }

  private _datastore: IDatastore<ISettingRegistry.ISettingFile, ISettingRegistry.ISettingFile> | null = null;
  private _isReady = false;
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
