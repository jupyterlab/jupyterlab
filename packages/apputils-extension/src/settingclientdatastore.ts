/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  IDatastore, ISettingRegistry, StateDB
} from '@jupyterlab/coreutils';

import {
  JSONObject
} from '@phosphor/coreutils';


/**
 * A client-side datastore for setting schemas.
 *
 * #### Notes
 * This class is deprecated. Its use is only as a storage mechanism of settings
 * data while an API for server-side persistence is being implemented.
 */
export
class SettingClientDatastore extends StateDB implements IDatastore<ISettingRegistry.IPlugin, JSONObject> {
  /**
   * Create a new setting client datastore.
   */
  constructor() {
    super({ namespace: 'setting-client-datastore' });
  }

  /**
   * Retrieve a saved bundle from the datastore.
   */
  fetch(id: string): Promise<ISettingRegistry.IPlugin | null> {
    return super.fetch(id).then(user => {
      const schema = Private.schemas[id] || { };
      const result = { data: { composite: { }, user }, id, schema };

      return result;
    });
  }

  /**
   * Remove a value from the datastore.
   */
  remove(id: string): Promise<void> {
    return super.remove(id);
  }

  /**
   * Save the user setting data in the datastore.
   */
  save(id: string, user: JSONObject): Promise<void> {
    return super.save(id, user);
  }
}


/**
 * A namespace for `SettingClientDatastore` statics.
 */
export
namespace SettingClientDatastore {
  /**
   * Preload the schema for a plugin.
   */
  export
  function preload(plugin: string, schema: ISettingRegistry.ISchema): void {
    Private.schemas[plugin] = schema;
  }
}


/**
 * A namespace for private module data.
 */
namespace Private {
  /* tslint:disable */
  export
  const schemas: { [key: string]: ISettingRegistry.ISchema } = { };
  /* tslint:enable */
}
