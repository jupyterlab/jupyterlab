/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  StateDB
} from '@jupyterlab/coreutils';

import {
  JSONObject
} from '@phosphor/coreutils';


/**
 * The default concrete implementation of a state database.
 */
export
class SettingClientDatastore extends StateDB {
  /**
   * Create a new state database.
   *
   * @param options - The instantiation options for a state database.
   */
  constructor() {
    super({ namespace: 'setting-client-datastore' });
  }

  /**
   * Retrieve a saved bundle from the database.
   */
  fetch(id: string): Promise<JSONObject | null> {
    return super.fetch(id);
  }

  /**
   * Remove a value from the database.
   */
  remove(id: string): Promise<void> {
    return super.remove(id);
  }

  /**
   * Save a value in the database.
   */
  save(id: string, value: JSONObject): Promise<void> {
    return super.save(id, value);
  }
}
