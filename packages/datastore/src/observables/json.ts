// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IObservableJSON } from '@jupyterlab/observables';

import { JSONExt, JSONObject, JSONValue } from '@phosphor/coreutils';

import { Schema } from '@phosphor/datastore';

import { Message } from '@phosphor/messaging';

import { ObservableMap } from './map';

import { DatastoreManager } from '../manager';

/**
 * A concrete Observable map for JSON data.
 */
export class ObservableJSON extends ObservableMap<JSONValue> {
  /**
   * Construct a new observable JSON object.
   */
  constructor(
    manager: DatastoreManager,
    schema: Schema,
    recordId: string,
    fieldId: string,
    options: ObservableJSON.IOptions = {}
  ) {
    super(manager, schema, recordId, fieldId, {
      itemCmp: JSONExt.deepEqual
    });
  }

  /**
   * Serialize the model to JSON.
   */
  toJSON(): JSONObject {
    const out: JSONObject = Object.create(null);
    const keys = this.keys();

    for (let key of keys) {
      const value = this.get(key);

      if (value !== undefined) {
        out[key] = JSONExt.deepCopy(value);
      }
    }
    return out;
  }
}

/**
 * The namespace for ObservableJSON static data.
 */
export namespace ObservableJSON {
  /**
   * The options use to initialize an observable JSON object.
   */
  export interface IOptions {}

  /**
   * An observable JSON change message.
   */
  export class ChangeMessage extends Message {
    /**
     * Create a new metadata changed message.
     */
    constructor(args: IObservableJSON.IChangedArgs) {
      super('jsonvalue-changed');
      this.args = args;
    }

    /**
     * The arguments of the change.
     */
    readonly args: IObservableJSON.IChangedArgs;
  }
}
