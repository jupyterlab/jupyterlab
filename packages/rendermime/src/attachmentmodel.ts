/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { nbformat } from '@jupyterlab/coreutils';

import { DatastoreExt } from '@jupyterlab/datastore';

import { IRenderMime } from '@jupyterlab/rendermime-interfaces';

import {
  JSONExt,
  JSONObject,
  JSONValue,
  ReadonlyJSONObject
} from '@phosphor/coreutils';

import { Datastore, Fields, RegisterField } from '@phosphor/datastore';

import { ISignal, Signal } from '@phosphor/signaling';

import { MimeModel } from './mimemodel';

/**
 * The namespace for describing how an attachment stores its data.
 */
export namespace IAttachmentData {
  /**
   * A type alias for an attachment schema.
   */
  export type Schema = {
    /**
     * The schema ID.
     */
    id: string;

    /**
     * Attachment model schema fields.
     */
    fields: {
      /**
       * Data stored in the attachment.
       */
      data: RegisterField<ReadonlyJSONObject>;

      /**
       * Raw data which is not in the data field.
       */
      raw: RegisterField<ReadonlyJSONObject>;
    };
  };
}

/**
 * Utilities for working with attachment data.
 */
export namespace AttachmentData {
  /**
   * A concrete realization of the schema, available at runtime.
   */
  export const SCHEMA: IAttachmentData.Schema = {
    id: '@jupyterlab/rendermime:attachmentmodel.v1',
    fields: {
      data: Fields.Register<ReadonlyJSONObject>({ value: {} }),
      raw: Fields.Register<ReadonlyJSONObject>({ value: {} })
    }
  };

  /**
   * Create an in-memory datastore capable of holding the data for an output.
   */
  export function createStore(id: number = 1): Datastore {
    return Datastore.create({
      id,
      schemas: [SCHEMA]
    });
  }
}

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
    value?: nbformat.IMimeBundle;

    /**
     * A record in which to store the data.
     */
    record?: DatastoreExt.RecordLocation<IAttachmentData.Schema>;
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
    if (options.record) {
      this._record = options.record;
    } else {
      const datastore = AttachmentData.createStore();
      this._record = {
        datastore,
        schema: AttachmentData.SCHEMA,
        record: 'data'
      };
      if (options.value) {
        AttachmentModel.fromJSON(this._record, options.value);
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
    // TODO dispose of datastore if created here.
    Signal.clearData(this);
  }

  /**
   * The data associated with the model.
   */
  get data(): ReadonlyJSONObject {
    return DatastoreExt.getField({ ...this._record, field: 'data' });
  }

  /**
   * The metadata associated with the model.
   */
  get metadata(): ReadonlyJSONObject {
    return undefined;
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
      DatastoreExt.withTransaction(this._record.datastore, () => {
        DatastoreExt.updateRecord(this._record, { data: options.data });
      });
    }
    this._changed.emit(void 0);
  }

  /**
   * Serialize the model to JSON.
   */
  toJSON(): nbformat.IMimeBundle {
    return AttachmentModel.toJSON(this._record);
  }

  /**
   * Whether the attachment is trusted. All attachments are untrusted.
   */
  readonly trusted: boolean = false;

  private _changed = new Signal<this, void>(this);
  private _record: DatastoreExt.RecordLocation<IAttachmentData.Schema>;
}

/**
 * The namespace for AttachmentModel statics.
 */
export namespace AttachmentModel {
  /**
   * Get the data for an attachment.
   *
   * @params bundle - A kernel attachment MIME bundle.
   *
   * @returns - The data for the payload.
   */
  export function getData(bundle: nbformat.IMimeBundle): JSONObject {
    return Private.getData(bundle);
  }

  /**
   * Serialize the attachment model to JSON.
   */
  export function toJSON(
    loc: DatastoreExt.RecordLocation<IAttachmentData.Schema>
  ): nbformat.IMimeBundle {
    let attachment: JSONValue = {};
    let raw = DatastoreExt.getField({ ...loc, field: 'raw' });
    for (let key in raw) {
      attachment[key] = Private.extract(raw, key);
    }
    return attachment as nbformat.IMimeBundle;
  }

  /**
   * Deserialize an attachment model from JSON, inserting it into a record.
   */
  export function fromJSON(
    loc: DatastoreExt.RecordLocation<IAttachmentData.Schema>,
    value: nbformat.IMimeBundle
  ): void {
    const data = Private.getData(value);
    let raw: JSONObject = {};

    // Make a copy of the data.
    for (let key in value) {
      // Ignore data and metadata that were stripped.
      switch (key) {
        case 'data':
          break;
        default:
          raw[key] = Private.extract(value, key);
      }

      DatastoreExt.withTransaction(loc.datastore, () => {
        DatastoreExt.updateRecord(loc, { data, raw });
      });
    }
  }
}

/**
 * The namespace for module private data.
 */
namespace Private {
  /**
   * Get the data from a notebook attachment.
   */
  export function getData(bundle: nbformat.IMimeBundle): JSONObject {
    return convertBundle(bundle);
  }

  /**
   * Get the bundle options given attachment model options.
   */
  export function getBundleOptions(
    options: IAttachmentModel.IOptions
  ): MimeModel.IOptions {
    let data = getData(options.value);
    return { data };
  }

  /**
   * Extract a value from a JSONObject.
   */
  export function extract(value: ReadonlyJSONObject, key: string): JSONValue {
    let item = value[key];
    if (JSONExt.isPrimitive(item)) {
      return item;
    }
    return JSONExt.deepCopy(item as JSONValue);
  }

  /**
   * Convert a mime bundle to mime data.
   */
  function convertBundle(bundle: nbformat.IMimeBundle): JSONObject {
    let map: JSONObject = Object.create(null);
    for (let mimeType in bundle) {
      map[mimeType] = extract(bundle, mimeType);
    }
    return map;
  }
}
