// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JSONObject
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
  constructor(options: SettingRegistry.IOptions) {
    this.datastore = options.datastore;
  }

  /**
   * The underlying datastore of the setting registry.
   */
  readonly datastore: IDatastore<ISettingRegistry.ISettingItem, ISettingRegistry.ISettingBundle>;
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
    datastore: IDatastore<ISettingRegistry.ISettingItem, ISettingRegistry.ISettingBundle>;
  }
}
