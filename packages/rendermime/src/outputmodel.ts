/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
import { nbformat } from '@jupyterlab/coreutils';

import { DatastoreExt, SchemaFields } from '@jupyterlab/datastore';

import { IRenderMime } from '@jupyterlab/rendermime-interfaces';

import {
  JSONExt,
  JSONObject,
  JSONValue,
  ReadonlyJSONObject
} from '@phosphor/coreutils';

import {
  Datastore,
  Fields,
  Record,
  RegisterField,
  Schema
} from '@phosphor/datastore';

import { MimeModel } from './mimemodel';

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
 * The namespace for IOutputModel sub-interfaces.
 */
export namespace IOutputModel {
  /**
   * Fields for use in the output model schema.
   */
  export interface IFields extends SchemaFields {
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
  }

  /**
   * An interface for the ouput model schema.
   */
  export interface ISchema extends Schema {
    fields: IFields;
  }

  /**
   * A concrete realization of the schema, available at runtime.
   */
  export const SCHEMA: ISchema = {
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
     * A record in which to store the data.
     */
    record?: DatastoreExt.RecordLocation<ISchema>;
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
    if (options.record) {
      this._record = options.record;
    } else {
      const datastore = Datastore.create({
        id: 1,
        schemas: [IOutputModel.SCHEMA]
      });
      this._record = {
        datastore,
        schema: IOutputModel.SCHEMA,
        record: 'data'
      };
      if (options.value) {
        OutputModel.fromJSON(this._record, options.value, options.trusted);
      }
    }
  }

  /**
   * The output type.
   */
  get type(): string {
    return DatastoreExt.getField({ ...this._record, field: 'type' });
  }

  /**
   * The execution count.
   */
  get executionCount(): nbformat.ExecutionCount {
    return DatastoreExt.getField({ ...this._record, field: 'executionCount' });
  }

  /**
   * Whether the model is trusted.
   */
  get trusted(): boolean {
    return DatastoreExt.getField({ ...this._record, field: 'trusted' });
  }

  /**
   * Dispose of the resources used by the output model.
   */
  dispose(): void {
    // TODO dispose of datastore if created here.
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
    return DatastoreExt.getField({ ...this._record, field: 'metadata' });
  }

  /**
   * Set the data associated with the model.
   *
   * #### Notes
   * Depending on the implementation of the mime model,
   * this call may or may not have deferred effects,
   */
  setData(options: IRenderMime.IMimeModel.ISetDataOptions): void {
    let metadataUpdate: Record.Update<IOutputModel.ISchema> = {};
    let dataUpdate: Record.Update<IOutputModel.ISchema> = {};
    if (options.data) {
      dataUpdate = { data: options.data };
    }
    if (options.metadata) {
      metadataUpdate = { metadata: options.metadata };
    }
    DatastoreExt.withTransaction(this._record.datastore, () => {
      DatastoreExt.updateRecord(this._record, {
        ...dataUpdate,
        ...metadataUpdate
      });
    });
  }

  /**
   * Serialize the model to JSON.
   */
  toJSON(): nbformat.IOutput {
    return OutputModel.toJSON(this._record);
  }

  /**
   * The record in which the output model is stored.
   */
  private readonly _record: DatastoreExt.RecordLocation<IOutputModel.ISchema>;
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
  export function toJSON(
    loc: DatastoreExt.RecordLocation<IOutputModel.ISchema>
  ): nbformat.IOutput {
    let output: JSONObject = DatastoreExt.getField({
      ...loc,
      field: 'raw'
    }) as JSONObject;
    const type = DatastoreExt.getField({ ...loc, field: 'type' });
    const data = DatastoreExt.getField({ ...loc, field: 'data' });
    const metadata = DatastoreExt.getField({ ...loc, field: 'metadata' });
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
    loc: DatastoreExt.RecordLocation<IOutputModel.ISchema>,
    value: nbformat.IOutput,
    trusted: boolean = false
  ): void {
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

    DatastoreExt.withTransaction(loc.datastore, () => {
      DatastoreExt.updateRecord(loc, {
        data,
        executionCount,
        metadata,
        raw,
        trusted,
        type
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
