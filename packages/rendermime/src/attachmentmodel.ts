/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import * as nbformat from '@jupyterlab/nbformat';
import { IObservableJSON, ObservableJSON } from '@jupyterlab/observables';
import { IRenderMime } from '@jupyterlab/rendermime-interfaces';
import {
  JSONExt,
  JSONObject,
  PartialJSONObject,
  PartialJSONValue,
  ReadonlyPartialJSONObject
} from '@lumino/coreutils';
import { ISignal, Signal } from '@lumino/signaling';
import { MimeModel } from './mimemodel';

/**
 * The interface for an attachment model.
 */
export interface IAttachmentModel extends IRenderMime.IMimeModel {
  /**
   * A signal emitted when the attachment model changes.
   */
  readonly changed: ISignal<this, void>;

  /**
   * Dispose of the resources used by the attachment model.
   */
  dispose(): void;

  /**
   * Serialize the model to JSON.
   */
  toJSON(): nbformat.IMimeBundle;
}

/**
 * The namespace for IAttachmentModel sub-interfaces.
 */
export namespace IAttachmentModel {
  /**
   * The options used to create a notebook attachment model.
   */
  export interface IOptions {
    /**
     * The raw attachment value.
     */
    value: nbformat.IMimeBundle;
  }
}

/**
 * The default implementation of a notebook attachment model.
 */
export class AttachmentModel implements IAttachmentModel {
  /**
   * Construct a new attachment model.
   */
  constructor(options: IAttachmentModel.IOptions) {
    const data = Private.getData(options.value);
    this._data = new ObservableJSON({ values: data as JSONObject });
    this._rawData = data;
    // Make a copy of the data.
    const value = options.value;
    for (const key in value) {
      // Ignore data and metadata that were stripped.
      switch (key) {
        case 'data':
          break;
        default:
          this._raw[key] = Private.extract(value, key);
      }
    }
  }

  /**
   * A signal emitted when the attachment model changes.
   */
  get changed(): ISignal<this, void> {
    return this._changed;
  }

  /**
   * Dispose of the resources used by the attachment model.
   */
  dispose(): void {
    this._data.dispose();
    Signal.clearData(this);
  }

  /**
   * The data associated with the model.
   */
  get data(): ReadonlyPartialJSONObject {
    return this._rawData;
  }

  /**
   * The metadata associated with the model.
   */
  get metadata(): ReadonlyPartialJSONObject {
    return {};
  }

  /**
   * Set the data associated with the model.
   *
   * #### Notes
   * Depending on the implementation of the mime model,
   * this call may or may not have deferred effects,
   */
  setData(options: IRenderMime.IMimeModel.ISetDataOptions): void {
    if (options.data) {
      this._updateObservable(this._data, options.data);
      this._rawData = options.data;
    }
    this._changed.emit(void 0);
  }

  /**
   * Serialize the model to JSON.
   */
  toJSON(): nbformat.IMimeBundle {
    const attachment: PartialJSONObject = {};
    for (const key in this._raw) {
      attachment[key] = Private.extract(this._raw, key);
    }
    return attachment as nbformat.IMimeBundle;
  }

  // All attachments are untrusted
  readonly trusted: boolean = false;

  /**
   * Update an observable JSON object using a readonly JSON object.
   */
  private _updateObservable(
    observable: IObservableJSON,
    data: ReadonlyPartialJSONObject
  ) {
    const oldKeys = observable.keys();
    const newKeys = Object.keys(data);

    // Handle removed keys.
    for (const key of oldKeys) {
      if (newKeys.indexOf(key) === -1) {
        observable.delete(key);
      }
    }

    // Handle changed data.
    for (const key of newKeys) {
      const oldValue = observable.get(key);
      const newValue = data[key];
      if (oldValue !== newValue) {
        observable.set(key, newValue);
      }
    }
  }

  private _changed = new Signal<this, void>(this);
  private _raw: PartialJSONObject = {};
  private _rawData: ReadonlyPartialJSONObject;
  private _data: IObservableJSON;
}

/**
 * The namespace for AttachmentModel statics.
 */
export namespace AttachmentModel {
  /**
   * Get the data for an attachment.
   *
   * @param bundle - A kernel attachment MIME bundle.
   *
   * @returns - The data for the payload.
   */
  export function getData(bundle: nbformat.IMimeBundle): PartialJSONObject {
    return Private.getData(bundle);
  }
}

/**
 * The namespace for module private data.
 */
namespace Private {
  /**
   * Get the data from a notebook attachment.
   */
  export function getData(bundle: nbformat.IMimeBundle): PartialJSONObject {
    return convertBundle(bundle);
  }

  /**
   * Get the bundle options given attachment model options.
   */
  export function getBundleOptions(
    options: IAttachmentModel.IOptions
  ): MimeModel.IOptions {
    const data = getData(options.value);
    return { data };
  }

  /**
   * Extract a value from a JSONObject.
   */
  export function extract(
    value: PartialJSONObject,
    key: string
  ): PartialJSONValue | undefined {
    const item = value[key];
    if (item === undefined || JSONExt.isPrimitive(item)) {
      return item;
    }
    return JSONExt.deepCopy(item);
  }

  /**
   * Convert a mime bundle to mime data.
   */
  function convertBundle(bundle: nbformat.IMimeBundle): PartialJSONObject {
    const map: PartialJSONObject = Object.create(null);
    for (const mimeType in bundle) {
      map[mimeType] = extract(bundle, mimeType);
    }
    return map;
  }
}
