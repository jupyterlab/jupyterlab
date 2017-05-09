// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JSONObject, Token
} from '@phosphor/coreutils';

import {
  IDatastore
} from '.';

/* tslint:disable */
/**
 * The default setting database token.
 */
export
const ISettingDB = new Token<ISettingDB>('jupyter.services.settingdb');
/* tslint:enable */


/**
 * A namespace for setting database interfaces.
 */
export
namespace ISettingDB {
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
  interface ISettingItem extends JSONObject {
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
 * The description of a setting database.
 */
export
interface ISettingDB extends IDatastore {
  /**
   * Retrieve a saved setting from the database.
   *
   * @param id - The identifier used to specify a setting bundle.
   *
   * @returns A promise that bears a data payload if available.
   *
   * #### Notes
   *
   * The promise returned by this method may be rejected if an error occurs in
   * retrieving the data. Non-existence of an `id` will succeed, however.
   */
  fetch(id: string): Promise<ISettingDB.ISettingItem>;

  /**
   * Remove a value from the setting database.
   *
   * @param id - The identifier used to specify a setting bundle.
   *
   * @returns A promise that is rejected if remove fails and succeeds otherwise.
   */
  remove(id: string): Promise<void>;

  /**
   * Save a value in the database.
   *
   * @param id - The identifier used to specify a setting bundle.
   *
   * @param value - The data being saved.
   *
   * @returns A promise that is rejected if saving fails and succeeds otherwise.
   */
  save(id: string, value: ISettingDB.ISettingBundle): Promise<void>;
}


/**
 * The default concrete implementation of a setting database.
 */
export
class SettingDB implements ISettingDB {
  /**
   * Instantiate a setting database.
   */
  constructor(options: SettingDB.IOptions) {
    this.datastore = options.datastore;
  }

  /**
   * The underlying datastore of the setting database.
   */
  readonly datastore: IDatastore;

  /**
   * Retrieve a saved setting from the database.
   *
   * @param id - The identifier used to specify a setting bundle.
   *
   * @returns A promise that bears a data payload if available.
   *
   * #### Notes
   *
   * The promise returned by this method may be rejected if an error occurs in
   * retrieving the data. Non-existence of an `id` will succeed, however.
   */
  fetch(id: string): Promise<ISettingDB.ISettingItem> {
    return Promise.reject(new Error('SettingDB#fetch is not implemented.'));
  }

  /**
   * Remove a value from the setting database.
   *
   * @param id - The identifier used to specify a setting bundle.
   *
   * @returns A promise that is rejected if remove fails and succeeds otherwise.
   */
  remove(id: string): Promise<void> {
    return Promise.reject(new Error('SettingDB#remove is not implemented.'));
  }

  /**
   * Save a value in the database.
   *
   * @param id - The identifier used to specify a setting bundle.
   *
   * @param value - The data being saved.
   *
   * @returns A promise that is rejected if saving fails and succeeds otherwise.
   */
  save(id: string, value: ISettingDB.ISettingBundle): Promise<void> {
    return Promise.reject(new Error('SettingDB#save is not implemented.'));
  }
}

/**
 * A namespace for SettingDB statics.
 */
export
namespace SettingDB {
  /**
   * The instantiation options for a state database.
   */
  export
  interface IOptions {
    /**
     * The underlying datastore of the setting database.
     */
    datastore: IDatastore;
  }
}
