// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JSONObject, JSONValue
} from '@phosphor/coreutils';

import {
  RenderMime
} from './rendermime';


/**
 * The default mime model implementation.
 */
export
class MimeModel implements RenderMime.IMimeModel {
  /**
   * Construct a new mime model.
   */
  constructor(options: MimeModel.IOptions = {}) {
    this.trusted = !!options.trusted;
    this.data = new Private.Bundle(options.data || {});
    this.metadata = new Private.Bundle(options.metadata || {});
  }

  /**
   * The data associated with the model.
   */
  readonly data: RenderMime.IBundle;

  /**
   * The metadata associated with the model.
   */
  readonly metadata: RenderMime.IBundle;

  /**
   * Whether the model is trusted.
   */
  readonly trusted: boolean;
}


/**
 * The namespace for MimeModel class statics.
 */
export
namespace MimeModel {
  /**
   * The options used to create a mime model.
   */
  export
  interface IOptions {
    /**
     * The initial mime data.
     */
    data?: JSONObject;

    /**
     * Whether the output is trusted.  The default is false.
     */
    trusted?: boolean;

    /**
     * The initial metadata.
     */
    metadata?: JSONObject;
  }
}


/**
 * A namespace for module private data.
 */
namespace Private {
  /**
   * The default implementation of an ibundle.
   */
  export
  class Bundle implements RenderMime.IBundle {
    /**
     * Create a new bundle.
     */
    constructor(values: JSONObject) {
      this._values = values;
    }

    /**
     * Get a value for a given key.
     *
     * @param key - the key.
     *
     * @returns the value for that key.
     */
    get(key: string): JSONValue {
      return this._values[key];
    }

    /**
     * Check whether the bundle has a key.
     *
     * @param key - the key to check.
     *
     * @returns `true` if the bundle has the key, `false` otherwise.
     */
    has(key: string): boolean {
      return Object.keys(this._values).indexOf(key) !== -1;
    }

    /**
     * Set a key-value pair in the bundle.
     *
     * @param key - The key to set.
     *
     * @param value - The value for the key.
     *
     * @returns the old value for the key, or undefined
     *   if that did not exist.
     */
    set(key: string, value: JSONValue): JSONValue {
      let old = this._values[key];
      this._values[key] = value;
      return old;
    }

    private _values: JSONObject;
  }
}
