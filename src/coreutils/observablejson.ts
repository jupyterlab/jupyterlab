// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JSONExt, JSONObject, JSONValue
} from '@phosphor/coreutils';

import {
  Message
} from '@phosphor/messaging';

import {
  IObservableMap, ObservableMap
} from './observablemap';


/**
 * An observable JSON value.
 */
export
interface IObservableJSON extends IObservableMap<JSONValue> {
  /**
   * Serialize the model to JSON.
   */
  toJSON(): JSONObject;
}


/**
 * The namespace for IObservableJSON related interfaces.
 */
export
namespace IObservableJSON {
  /**
   * A type alias for observable JSON changed args.
   */
  export
  type IChangedArgs = ObservableMap.IChangedArgs<JSONValue>;
}


/**
 * A concrete Observable map for JSON data.
 */
export
class ObservableJSON extends ObservableMap<JSONValue> {
  /**
   * Construct a new observable JSON object.
   */
  constructor(options: ObservableJSON.IOptions = {}) {
    super({
      itemCmp: JSONExt.deepEqual,
      values: options.values
    });
  }

  /**
   * Serialize the model to JSON.
   */
  toJSON(): JSONObject {
    let out: JSONObject = Object.create(null);
    for (let key of this.keys()) {
      let value = this.get(key);
      if (JSONExt.isPrimitive(value)) {
        out[key] = value;
      } else {
        out[key] = JSON.parse(JSON.stringify(value));
      }
    }
    return out;
  }
}


/**
 * The namespace for ObservableJSON static data.
 */
export
namespace ObservableJSON {
  /**
   * The options use to initialize an observable JSON object.
   */
  export
  interface IOptions {
    /**
     * The optional intitial value for the object.
     */
    values?: JSONObject;
  }

  /**
   * An observable JSON change message.
   */
  export
  class ChangeMessage extends Message {
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
