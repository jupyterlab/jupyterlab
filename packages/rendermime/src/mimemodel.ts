/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
import { IRenderMime } from '@jupyterlab/rendermime-interfaces';
import { ReadonlyPartialJSONObject } from '@lumino/coreutils';

/**
 * The default mime model implementation.
 */
export class MimeModel implements IRenderMime.IMimeModel {
  /**
   * Construct a new mime model.
   */
  constructor(options: MimeModel.IOptions = {}) {
    this.trusted = !!options.trusted;
    this._data = options.data || {};
    this._metadata = options.metadata || {};
    this._callback = options.callback || Private.noOp;
  }

  /**
   * Whether the model is trusted.
   */
  readonly trusted: boolean;

  /**
   * The data associated with the model.
   */
  get data(): ReadonlyPartialJSONObject {
    return this._data;
  }

  /**
   * The metadata associated with the model.
   */
  get metadata(): ReadonlyPartialJSONObject {
    return this._metadata;
  }

  /**
   * Set the data associated with the model.
   *
   * #### Notes
   * Depending on the implementation of the mime model,
   * this call may or may not have deferred effects,
   */
  setData(options: IRenderMime.IMimeModel.ISetDataOptions): void {
    this._data = options.data || this._data;
    this._metadata = options.metadata || this._metadata;
    this._callback(options);
  }

  private _callback: (options: IRenderMime.IMimeModel.ISetDataOptions) => void;
  private _data: ReadonlyPartialJSONObject;
  private _metadata: ReadonlyPartialJSONObject;
}

/**
 * The namespace for MimeModel class statics.
 */
export namespace MimeModel {
  /**
   * The options used to create a mime model.
   */
  export interface IOptions {
    /**
     * Whether the model is trusted.  Defaults to `false`.
     */
    trusted?: boolean;

    /**
     * A callback function for when the data changes.
     */
    callback?: (options: IRenderMime.IMimeModel.ISetDataOptions) => void;

    /**
     * The initial mime data.
     */
    data?: ReadonlyPartialJSONObject;

    /**
     * The initial mime metadata.
     */
    metadata?: ReadonlyPartialJSONObject;
  }
}

/**
 * The namespace for module private data.
 */
namespace Private {
  /**
   * A no-op callback function.
   */
  export function noOp(): void {
    /* no-op */
  }
}
