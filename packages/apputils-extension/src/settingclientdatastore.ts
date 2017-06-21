/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  ISettingRegistry, StateDB
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
  fetch(id: string): Promise<ISettingRegistry.IPlugin | null> {
    return super.fetch(id).then(result => {
      const schema = Private.schemas[id] || { };

      result = result || { data: { composite: { }, user: { } }, id };
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
  const schemas: JSONObject = {
    "jupyter.services.codemirror-commands": {
      "jupyter.lab.icon-class": "jp-ImageTextEditor",
      "jupyter.lab.icon-label": "CodeMirror",
      "properties": {
        "keyMap": { type: "string", "title": "Key Map" },
        "matchBrackets": { type: "boolean", "title": "Match Brackets" },
        "theme": { type: "string", "title": "Theme" }
      }
    },
    "jupyter.services.editor-tracker": {
      "jupyter.lab.icon-class": "jp-ImageTextEditor",
      "jupyter.lab.icon-label": "Editor",
      "properties": {
        "autoClosingBrackets": { type: "boolean", "title": "Auto-closing Brackets" },
        "lineNumbers": { type: "boolean", "title": "Line Numbers" },
        "lineWrap": { type: "boolean", "title": "Line Wrap" },
        "matchBrackets": { type: "boolean", "title": "Match Brackets" }
      }
    }
  };
  /* tslint:enable */
}
