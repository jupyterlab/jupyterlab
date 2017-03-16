// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JSONExt, JSONObject, JSONValue
} from '@phosphor/coreutils';

import {
  nbformat
} from '@jupyterlab/coreutils';

import {
  MimeModel
} from './mimemodel';

import {
  RenderMime
} from './rendermime';


/**
 * The interface for an output model.
 */
export
interface IOutputModel extends RenderMime.IMimeModel {
  /**
   * The output type.
   */
  readonly type: string;

  /**
   * The execution count of the model.
   */
  readonly executionCount: nbformat.ExecutionCount;

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
class OutputModel extends MimeModel implements IOutputModel {
  /**
   * Construct a new output model.
   */
  constructor(options: IOutputModel.IOptions) {
    super(Private.getBundleOptions(options));
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
   * The output type.
   */
  readonly type: string;

  /**
   * The execution count.
   */
  readonly executionCount: nbformat.ExecutionCount;

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
      output['data'] = this.data.toJSON();
      output['metadata'] = this.metadata.toJSON();
      break;
    default:
      break;
    }
    // Remove transient data.
    delete output['transient'];
    return output as nbformat.IOutput;
  }

  private _raw: JSONObject = {};
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
    if (nbformat.isExecuteResult(output) || nbformat.isDisplayData(output)) {
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
    return { data, trusted, metadata };
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
      let item = bundle[mimeType];
      // Convert multi-line strings to strings.
      if (JSONExt.isArray(item)) {
        item = (item as string[]).join('\n');
      } else if (!JSONExt.isPrimitive(item)) {
        item = JSON.parse(JSON.stringify(item));
      }
      map[mimeType] = item;
    }
    return map;
  }
}
