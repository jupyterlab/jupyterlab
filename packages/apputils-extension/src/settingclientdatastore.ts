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
 * A client-side datastore for setting schemas.
 *
 * #### Notes
 * This class is deprecated. Its use is only as a storage mechanism of settings
 * data while an API for server-side persistence is being implemented.
 */
export
class SettingClientDatastore extends StateDB {
  /**
   * Create a new setting client datastore.
   */
  constructor() {
    super({ namespace: 'setting-client-datastore' });
  }

  /**
   * Retrieve a saved bundle from the datastore.
   */
  fetch(id: string): Promise<JSONObject | null> {
    return super.fetch(id).then(result => {
      const schema = Private.schemas[id] || null;

      result.schema = schema;
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
   * Save a value in the datastore.
   */
  save(id: string, value: JSONObject): Promise<void> {
    return super.save(id, value);
  }
}


/**
 * A namespace for private module data.
 */
namespace Private {
  /* tslint:disable */
  export
  const schemas: JSONObject = {
    "jupyter.services.codemirror-commands": {
      "jupyter.lab": {
        "iconClass": "jp-ImageTextEditor",
        "iconLabel": "CodeMirror"
      },
      "properties": {
        "jupyter.lab": { type: "object" },
        "keyMap": { type: "string", "title": "Key Map" },
        "matchBrackets": { type: "boolean", "title": "Match Brackets" },
        "theme": { type: "boolean", "title": "Theme" }
      }
    }
  };
  /* tslint:enable */
}
