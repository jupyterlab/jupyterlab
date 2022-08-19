// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JSONExt,
  JSONObject,
  PartialJSONObject,
  ReadonlyPartialJSONValue
} from '@lumino/coreutils';
import { Message } from '@lumino/messaging';
import { IObservableMap, ObservableMap } from './observablemap';

/**
 * An observable JSON value.
 */
export interface IObservableJSON
  extends IObservableMap<ReadonlyPartialJSONValue | undefined> {
  /**
   * Serialize the model to JSON.
   */
  toJSON(): PartialJSONObject;
}

/**
 * The namespace for IObservableJSON related interfaces.
 */
export namespace IObservableJSON {
  /**
   * A type alias for observable JSON changed args.
   */
  export type IChangedArgs =
    IObservableMap.IChangedArgs<ReadonlyPartialJSONValue>;
}

/**
 * A concrete Observable map for JSON data.
 */
export class ObservableJSON extends ObservableMap<ReadonlyPartialJSONValue> {
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
  toJSON(): PartialJSONObject {
    const out: PartialJSONObject = Object.create(null);
    const keys = this.keys();

    for (const key of keys) {
      const value = this.get(key);

      if (value !== undefined) {
        out[key] = JSONExt.deepCopy(value) as PartialJSONObject;
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
  export interface IOptions {
    /**
     * The optional initial value for the object.
     */
    values?: JSONObject;
  }

  /**
   * An observable JSON change message.
   */
  export class ChangeMessage extends Message {
    /**
     * Create a new metadata changed message.
     */
    constructor(type: string, args: IObservableJSON.IChangedArgs) {
      super(type);
      this.args = args;
    }

    /**
     * The arguments of the change.
     */
    readonly args: IObservableJSON.IChangedArgs;
  }
}
