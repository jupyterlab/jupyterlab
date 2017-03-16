// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JSONObject
} from '@phosphor/coreutils';

import {
  IObservableJSON, ObservableJSON
} from '@jupyterlab/coreutils';

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
    this.data = new ObservableJSON({ values: options.data });
    this.metadata = new ObservableJSON({ values: options.metadata });
  }

  /**
   * The data associated with the model.
   */
  readonly data: IObservableJSON;

  /**
   * The metadata associated with the model.
   */
  readonly metadata: IObservableJSON;

  /**
   * Whether the model is trusted.
   */
  readonly trusted: boolean;

  /**
   * Test whether the model is disposed.
   */
  get isDisposed(): boolean {
    return this.data.isDisposed;
  }

  /**
   * Dispose of the resources used by the mime model.
   */
  dispose(): void {
    this.data.dispose();
    this.metadata.dispose();
  }

  /**
   * Serialize the model as JSON data.
   */
  toJSON(): JSONObject {
    return {
      trusted: this.trusted,
      data: this.data.toJSON(),
      metadata: this.metadata.toJSON()
    };
  }
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

