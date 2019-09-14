// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { nbformat } from '@jupyterlab/coreutils';

import { DatastoreExt } from '@jupyterlab/datastore';

import { imageRendererFactory } from '@jupyterlab/rendermime';

import { IRenderMime } from '@jupyterlab/rendermime-interfaces';

import {
  JSONExt,
  JSONObject,
  JSONValue,
  ReadonlyJSONObject
} from '@phosphor/coreutils';

import { MapField } from '@phosphor/datastore';

/**
 * The namespace for IAttachmentsData interfaces.
 */
export namespace IAttachmentsData {
  /**
   * An interface for schema fields for an attachments model.
   */
  export type Fields = {
    /**
     * A map storing attachments.
     */
    attachments: MapField<nbformat.IMimeBundle>;
  };

  /**
   * The attachments data schema.
   */
  export type Schema = {
    /**
     * The id for the schema.
     */
    id: string;

    /**
     * The fields storing attachment model data.
     */
    fields: {
      /**
       * A map storing attachments.
       */
      attachments: MapField<nbformat.IMimeBundle>;
    };
  };

  /**
   * The location of data in a datastore for attachments.
   */
  export type DataLocation = DatastoreExt.DataLocation & {
    /**
     * A record for storing an attachment.
     */
    record: DatastoreExt.RecordLocation<Schema>;
  };
}

/**
 * A namespace for AttachmentsData functionality.
 */
export namespace AttachmentsData {
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
    loc: IAttachmentsData.DataLocation
  ): nbformat.IAttachments {
    return DatastoreExt.getField(loc.datastore, {
      ...loc.record,
      field: 'attachments'
    });
  }

  /**
   * Deserialize an attachment model from JSON, inserting it into a record.
   */
  export function fromJSON(
    loc: IAttachmentsData.DataLocation,
    value: nbformat.IAttachments
  ): void {
    // Construct an update, removing any old data from the bundle.
    const old = toJSON(loc);
    Object.keys(old).forEach(key => {
      old[key] = null;
    });
    const update = { ...old, ...value };
    DatastoreExt.withTransaction(loc.datastore, () => {
      DatastoreExt.updateField(
        loc.datastore,
        { ...loc.record, field: 'attachments' },
        update
      );
    });
  }
}

/**
 * A resolver for cell attachments 'attchment:filename'.
 *
 * Will resolve to a data: url.
 */
export class AttachmentsResolver implements IRenderMime.IResolver {
  /**
   * Create an attachments resolver object.
   */
  constructor(options: AttachmentsResolver.IOptions) {
    this._parent = options.parent || null;
    this._data = options.data;
  }
  /**
   * Resolve a relative url to a correct server path.
   */
  resolveUrl(url: string): Promise<string> {
    if (this._parent && !url.startsWith('attachment:')) {
      return this._parent.resolveUrl(url);
    }
    return Promise.resolve(url);
  }

  /**
   * Get the download url of a given absolute server path.
   */
  getDownloadUrl(path: string): Promise<string> {
    if (this._parent && !path.startsWith('attachment:')) {
      return this._parent.getDownloadUrl(path);
    }
    // Return a data URL with the data of the url
    const key = path.slice('attachment:'.length);
    const attachment = DatastoreExt.getField(this._data.datastore, {
      ...this._data.record,
      field: 'attachments'
    });
    if (!attachment || !attachment[key]) {
      // Resolve with unprocessed path, to show as broken image
      return Promise.resolve(path);
    }
    const data = AttachmentsData.getData(attachment[key]);
    const mimeType = Object.keys(data)[0];
    // Only support known safe types:
    if (imageRendererFactory.mimeTypes.indexOf(mimeType) === -1) {
      return Promise.reject(
        `Cannot render unknown image mime type "${mimeType}".`
      );
    }
    const dataUrl = `data:${mimeType};base64,${data[mimeType]}`;
    return Promise.resolve(dataUrl);
  }

  /**
   * Whether the URL should be handled by the resolver
   * or not.
   */
  isLocal(url: string): boolean {
    if (this._parent && !url.startsWith('attachment:')) {
      return this._parent.isLocal(url);
    }
    return true;
  }

  private _data: IAttachmentsData.DataLocation;
  private _parent: IRenderMime.IResolver | null;
}

/**
 * The namespace for `AttachmentsResolver` class statics.
 */
export namespace AttachmentsResolver {
  /**
   * The options used to create an AttachmentsResolver.
   */
  export interface IOptions {
    /**
     * The attachments model to resolve against.
     */
    data: IAttachmentsData.DataLocation;

    /**
     * A parent resolver to use if the URL/path is not for an attachment.
     */
    parent?: IRenderMime.IResolver;
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
