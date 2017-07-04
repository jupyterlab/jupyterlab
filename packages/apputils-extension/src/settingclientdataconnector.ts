/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  IDataConnector, ISettingRegistry, StateDB
} from '@jupyterlab/coreutils';

import {
  JSONObject
} from '@phosphor/coreutils';


/**
 * A client-side data connector for setting schemas.
 *
 * #### Notes
 * This class is deprecated. Its use is only as a storage mechanism of settings
 * data while an API for server-side persistence is being implemented.
 */
export
class SettingClientDataConnector extends StateDB implements IDataConnector<ISettingRegistry.IPlugin, JSONObject> {
  /**
   * Create a new setting client data connector.
   */
  constructor() {
    super({ namespace: 'setting-client-data-connector' });
  }

  /**
   * Retrieve a saved bundle from the data connector.
   */
  fetch(id: string): Promise<ISettingRegistry.IPlugin | null> {
    return super.fetch(id).then(user => {
      if (!user && !Private.schemas[id]) {
        return null;
      }

      user = user || { };

      const schema = Private.schemas[id] || { type: 'object' };
      const result = { data: { composite: { }, user }, id, schema };

      return result;
    });
  }

  /**
   * Remove a value from the data connector.
   */
  remove(id: string): Promise<void> {
    return super.remove(id);
  }

  /**
   * Save the user setting data in the data connector.
   */
  save(id: string, user: JSONObject): Promise<void> {
    return super.save(id, user);
  }
}


/**
 * A namespace for `SettingClientDataConnector` statics.
 */
export
namespace SettingClientDataConnector {
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
