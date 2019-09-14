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

import { Datastore, Fields, Record, RegisterField } from '@phosphor/datastore';

import { MimeModel } from './mimemodel';

/**
 * A namespace for interfaces describing where an IOutputModel
 * holds its data.
 */
export namespace IOutputData {
  /**
   * A type alias for the ouput model schema.
   */
  export type Schema = {
    /**
     * The id for the schema.
     */
    id: string;

    /**
     * The fields for a single output.
     */
    fields: {
      /**
       * Whether the output model is trusted.
       */
      trusted: RegisterField<boolean>;

      /**
       * The type of the output model.
       */
      type: RegisterField<string>;

      /**
       * The execution count of the model.
       */
      executionCount: RegisterField<nbformat.ExecutionCount>;

      /**
       * The data for the model.
       */
      data: RegisterField<ReadonlyJSONObject>;

      /**
       * The metadata for the model.
       */
      metadata: RegisterField<ReadonlyJSONObject>;

      /**
       * Raw data passed in that is not in the data or metadata fields.
       */
      raw: RegisterField<ReadonlyJSONObject>;
    };
  };

  /**
   * A description of where data is stored in a code editor.
   */
  export type DataLocation = DatastoreExt.DataLocation & {
    /**
     * The record in which the data is located.
     */
    record: DatastoreExt.RecordLocation<Schema>;
  };
}

/**
 * A namespace for default implementation of the IOutputData functionality.
 */
export namespace OutputData {
  /**
   * A concrete realization of the schema, available at runtime.
   */
  export const SCHEMA: IOutputData.Schema = {
    id: '@jupyterlab/rendermime:outputmodel.v1',
    fields: {
      trusted: Fields.Boolean(),
      type: Fields.String(),
      executionCount: Fields.Register<nbformat.ExecutionCount>({ value: null }),
      data: Fields.Register<ReadonlyJSONObject>({ value: {} }),
      metadata: Fields.Register<ReadonlyJSONObject>({ value: {} }),
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
 * The interface for an output model.
 */
export interface IOutputModel extends IRenderMime.IMimeModel {
  /**
   * The output type.
   */
  readonly type: string;

  /**
   * The execution count of the model.
   */
  readonly executionCount: nbformat.ExecutionCount;

  /**
   * Whether the output is trusted.
   */
  trusted: boolean;

  /**
   * Dispose of the resources used by the output model.
   */
  dispose(): void;

  /**
   * Serialize the model to JSON.
   */
  toJSON(): nbformat.IOutput;
}

/**
 * A namespace for IOutputModel statics.
 */
export namespace IOutputModel {
  /**
   * The options used to create a notebook output model.
   */
  export interface IOptions {
    /**
     * The raw output value.
     */
    value?: nbformat.IOutput;

    /**
     * Whether the output is trusted.  The default is false.
     */
    trusted?: boolean;

    /**
     * A location in which to store the data.
     */
    data?: IOutputData.DataLocation;
  }
}

/**
 * The default implementation of a notebook output model.
 */
export class OutputModel implements IOutputModel {
  /**
   * Construct a new output model.
   */
  constructor(options: IOutputModel.IOptions) {
    if (options.data) {
      this._data = options.data;
    } else {
      this._datastore = OutputData.createStore();
      this._data = {
        datastore: this._datastore,
        record: {
          schema: OutputData.SCHEMA,
          record: 'data'
        }
      };
      if (options.value) {
        OutputModel.fromJSON(this._data, options.value, options.trusted);
      }
    }
  }

  /**
   * The output type.
   */
  get type(): string {
    return DatastoreExt.getField(this._data.datastore, {
      ...this._data.record,
      field: 'type'
    });
  }

  /**
   * The execution count.
   */
  get executionCount(): nbformat.ExecutionCount {
    return DatastoreExt.getField(this._data.datastore, {
      ...this._data.record,
      field: 'executionCount'
    });
  }

  /**
   * Whether the model is trusted.
   */
  get trusted(): boolean {
    return DatastoreExt.getField(this._data.datastore, {
      ...this._data.record,
      field: 'trusted'
    });
  }

  /**
   * Dispose of the resources used by the output model.
   */
  dispose(): void {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    if (this._datastore) {
      this._datastore.dispose();
      this._datastore = null;
    }
  }

  /**
   * The data associated with the model.
   */
  get data(): ReadonlyJSONObject {
    return DatastoreExt.getField(this._data.datastore, {
      ...this._data.record,
      field: 'data'
    });
  }

  /**
   * The metadata associated with the model.
   */
  get metadata(): ReadonlyJSONObject {
    return DatastoreExt.getField(this._data.datastore, {
      ...this._data.record,
      field: 'metadata'
    });
  }

  /**
   * Set the data associated with the model.
   *
   * #### Notes
   * Depending on the implementation of the mime model,
   * this call may or may not have deferred effects,
   */
  setData(options: IRenderMime.IMimeModel.ISetDataOptions): void {
    let metadataUpdate: Record.Update<IOutputData.Schema> = {};
    let dataUpdate: Record.Update<IOutputData.Schema> = {};
    if (options.data) {
      dataUpdate = { data: options.data };
    }
    if (options.metadata) {
      metadataUpdate = { metadata: options.metadata };
    }
    const { datastore, record } = this._data;
    DatastoreExt.withTransaction(datastore, () => {
      DatastoreExt.updateRecord(datastore, record, {
        ...dataUpdate,
        ...metadataUpdate
      });
    });
  }

  /**
   * Serialize the model to JSON.
   */
  toJSON(): nbformat.IOutput {
    return OutputModel.toJSON(this._data);
  }

  /**
   * The record in which the output model is stored.
   */
  private readonly _data: IOutputData.DataLocation;
  private _datastore: Datastore | null = null;
  private _isDisposed = false;
}

/**
 * The namespace for OutputModel statics.
 */
export namespace OutputModel {
  /**
   * Get the data for an output.
   *
   * @params output - A kernel output message payload.
   *
   * @returns - The data for the payload.
   */
  export function getData(output: nbformat.IOutput): JSONObject {
    return Private.getData(output);
  }

  /**
   * Get the metadata from an output message.
   *
   * @params output - A kernel output message payload.
   *
   * @returns - The metadata for the payload.
   */
  export function getMetadata(output: nbformat.IOutput): JSONObject {
    return Private.getMetadata(output);
  }

  /**
   * Serialize an output record to JSON.
   */
  export function toJSON(loc: IOutputData.DataLocation): nbformat.IOutput {
    let { datastore, record } = loc;
    let output: JSONObject = DatastoreExt.getField(datastore, {
      ...record,
      field: 'raw'
    }) as JSONObject;
    const type = DatastoreExt.getField(datastore, { ...record, field: 'type' });
    const data = DatastoreExt.getField(datastore, { ...record, field: 'data' });
    const metadata = DatastoreExt.getField(datastore, {
      ...record,
      field: 'metadata'
    });
    switch (type) {
      case 'display_data':
      case 'execute_result':
      case 'update_display_data':
        output['data'] = data as JSONValue;
        output['metadata'] = metadata as JSONValue;
        break;
      default:
        break;
    }
    // Remove transient data.
    delete output['transient'];
    return output as nbformat.IOutput;
  }

  export function fromJSON(
    loc: IOutputData.DataLocation,
    value: nbformat.IOutput,
    trusted: boolean = false
  ): void {
    const { datastore, record } = loc;
    let data = Private.getData(value);
    let metadata = Private.getData(value);
    trusted = !!trusted;

    let raw: { [x: string]: JSONValue } = {};
    for (let key in value) {
      // Ignore data and metadata that were stripped.
      switch (key) {
        case 'data':
        case 'metadata':
          break;
        default:
          raw[key] = Private.extract(value, key);
      }
    }
    const type = value.output_type;
    const executionCount = nbformat.isExecuteResult(value)
      ? value.execution_count
      : null;

    DatastoreExt.withTransaction(datastore, () => {
      DatastoreExt.updateRecord(datastore, record, {
        data,
        executionCount,
        metadata,
        raw,
        trusted,
        type
      });
    });
  }

  /**
   * Clear an output record from a table.
   */
  export function clear(loc: IOutputData.DataLocation): void {
    const { datastore, record } = loc;
    DatastoreExt.withTransaction(datastore, () => {
      DatastoreExt.updateRecord(datastore, record, {
        data: {},
        executionCount: null,
        metadata: {},
        raw: {},
        trusted: false,
        type: ''
      });
    });
  }
}

/**
 * The namespace for module private data.
 */
namespace Private {
  /**
   * Get the data from a notebook output.
   */
  export function getData(output: nbformat.IOutput): JSONObject {
    let bundle: nbformat.IMimeBundle = {};
    if (
      nbformat.isExecuteResult(output) ||
      nbformat.isDisplayData(output) ||
      nbformat.isDisplayUpdate(output)
    ) {
      bundle = (output as nbformat.IExecuteResult).data;
    } else if (nbformat.isStream(output)) {
      if (output.name === 'stderr') {
        bundle['application/vnd.jupyter.stderr'] = output.text;
      } else {
        bundle['application/vnd.jupyter.stdout'] = output.text;
      }
    } else if (nbformat.isError(output)) {
      let traceback = output.traceback.join('\n');
      bundle['application/vnd.jupyter.stderr'] =
        traceback || `${output.ename}: ${output.evalue}`;
    }
    return convertBundle(bundle);
  }

  /**
   * Get the metadata from an output message.
   */
  export function getMetadata(output: nbformat.IOutput): JSONObject {
    let value: JSONObject = Object.create(null);
    if (nbformat.isExecuteResult(output) || nbformat.isDisplayData(output)) {
      for (let key in output.metadata) {
        value[key] = extract(output.metadata, key);
      }
    }
    return value;
  }

  /**
   * Get the bundle options given output model options.
   */
  export function getBundleOptions(
    options: IOutputModel.IOptions
  ): MimeModel.IOptions {
    let data = getData(options.value);
    let metadata = getMetadata(options.value);
    let trusted = !!options.trusted;
    return { data, metadata, trusted };
  }

  /**
   * Extract a value from a JSONObject.
   */
  export function extract(value: JSONObject, key: string): JSONValue {
    let item = value[key];
    if (JSONExt.isPrimitive(item)) {
      return item;
    }
    return JSON.parse(JSON.stringify(item));
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
