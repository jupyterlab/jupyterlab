/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
import {
  JSONExt, JSONObject, JSONValue, ReadonlyJSONObject
} from '@phosphor/coreutils';

import {
  ISignal, Signal
} from '@phosphor/signaling';

import {
  nbformat
} from '@jupyterlab/coreutils';

import {
  IObservableJSON, ObservableJSON
} from '@jupyterlab/observables';

import {
  IRenderMime
} from '@jupyterlab/rendermime-interfaces';

import {
  MimeModel
} from './mimemodel';


/**
 * The interface for an output model.
 */
export
interface IOutputModel extends IRenderMime.IMimeModel {
  /**
   * A signal emitted when the output model changes.
   */
  readonly changed: ISignal<this, void>;

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
export
namespace IOutputModel {
  /**
   * The options used to create a notebook output model.
   */
  export
  interface IOptions {
    /**
     * The raw output value.
     */
    value: nbformat.IOutput;

    /**
     * Whether the output is trusted.  The default is false.
     */
    trusted?: boolean;
  }
}


/**
 * The default implementation of a notebook output model.
 */
export
class OutputModel implements IOutputModel {
  /**
   * Construct a new output model.
   */
  constructor(options: IOutputModel.IOptions) {
    let { data, metadata, trusted } = Private.getBundleOptions(options);
    this._data = new ObservableJSON({ values: data as JSONObject });
    this._rawData = data;
    this._metadata = new ObservableJSON({ values: metadata as JSONObject });
    this._rawMetadata = metadata;
    this.trusted = trusted;
    // Make a copy of the data.
    let value = options.value;
    for (let key in value) {
      // Ignore data and metadata that were stripped.
      switch (key) {
      case 'data':
      case 'metadata':
        break;
      default:
        this._raw[key] = Private.extract(value, key);
      }
    }
    this.type = value.output_type;
    if (nbformat.isExecuteResult(value)) {
      this.executionCount = value.execution_count;
    } else {
      this.executionCount = null;
    }
  }

  /**
   * A signal emitted when the output model changes.
   */
  get changed(): ISignal<this, void> {
    return this._changed;
  }

  /**
   * The output type.
   */
  readonly type: string;

  /**
   * The execution count.
   */
  readonly executionCount: nbformat.ExecutionCount;

  /**
   * Whether the model is trusted.
   */
  readonly trusted: boolean;

  /**
   * Dispose of the resources used by the output model.
   */
  dispose(): void {
    this._data.dispose();
    this._metadata.dispose();
    Signal.clearData(this);
  }

  /**
   * The data associated with the model.
   */
  get data(): ReadonlyJSONObject {
    return this._rawData;
  }

  /**
   * The metadata associated with the model.
   */
  get metadata(): ReadonlyJSONObject {
    return this._rawMetadata;
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
    if (options.metadata) {
      this._updateObservable(this._metadata, options.metadata);
      this._rawMetadata = options.metadata;
    }
    this._changed.emit(void 0);
  }

  /**
   * Serialize the model to JSON.
   */
  toJSON(): nbformat.IOutput {
    let output: JSONValue = {};
    for (let key in this._raw) {
      output[key] = Private.extract(this._raw, key);
    }
    switch (this.type) {
    case 'display_data':
    case 'execute_result':
    case 'update_display_data':
      output['data'] = this.data as JSONObject;
      output['metadata'] = this.metadata as JSONObject;
      break;
    default:
      break;
    }
    // Remove transient data.
    delete output['transient'];
    return output as nbformat.IOutput;
  }

  /**
   * Update an observable JSON object using a readonly JSON object.
   */
  private _updateObservable(observable: IObservableJSON, data: ReadonlyJSONObject) {
    let oldKeys = observable.keys();
    let newKeys = Object.keys(data);

    // Handle removed keys.
    for (let key of oldKeys) {
      if (newKeys.indexOf(key) === -1) {
        observable.delete(key);
      }
    }

    // Handle changed data.
    for (let key of newKeys) {
      let oldValue = observable.get(key);
      let newValue = data[key];
      if (oldValue !== newValue) {
        observable.set(key, newValue as JSONValue);
      }
    }
  }

  private _changed = new Signal<this, void>(this);
  private _raw: JSONObject = {};
  private _rawMetadata: ReadonlyJSONObject;
  private _rawData: ReadonlyJSONObject;
  private _data: IObservableJSON;
  private _metadata: IObservableJSON;
}


/**
 * The namespace for OutputModel statics.
 */
export
namespace OutputModel {
  /**
   * Get the data for an output.
   *
   * @params output - A kernel output message payload.
   *
   * @returns - The data for the payload.
   */
  export
  function getData(output: nbformat.IOutput): JSONObject {
    return Private.getData(output);
  }

  /**
   * Get the metadata from an output message.
   *
   * @params output - A kernel output message payload.
   *
   * @returns - The metadata for the payload.
   */
  export
  function getMetadata(output: nbformat.IOutput): JSONObject {
    return Private.getMetadata(output);
  }
}


/**
 * The namespace for module private data.
 */
namespace Private {
  /**
   * Get the data from a notebook output.
   */
  export
  function getData(output: nbformat.IOutput): JSONObject {
    let bundle: nbformat.IMimeBundle = {};
    if (nbformat.isExecuteResult(output) || nbformat.isDisplayData(output) || nbformat.isDisplayUpdate(output)) {
      bundle = (output as nbformat.IExecuteResult).data;
    } else if (nbformat.isStream(output)) {
      if (output.name === 'stderr') {
        bundle['application/vnd.jupyter.stderr'] = output.text;
      } else {
        bundle['application/vnd.jupyter.stdout'] = output.text;
      }
    } else if (nbformat.isError(output)) {
      let traceback = output.traceback.join('\n');
      bundle['application/vnd.jupyter.stderr'] = (
        traceback || `${output.ename}: ${output.evalue}`
      );
    }
    return convertBundle(bundle);
  }

  /**
   * Get the metadata from an output message.
   */
  export
  function getMetadata(output: nbformat.IOutput): JSONObject {
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
  export
  function getBundleOptions(options: IOutputModel.IOptions): MimeModel.IOptions {
    let data = getData(options.value);
    let metadata = getMetadata(options.value);
    let trusted = !!options.trusted;
    return { data, metadata, trusted };
  }

  /**
   * Extract a value from a JSONObject.
   */
  export
  function extract(value: JSONObject, key: string): JSONValue {
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
