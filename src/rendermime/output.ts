// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  nbformat
} from '@jupyterlab/services';

import {
  JSONObject
} from 'phosphor/lib/algorithm/json';

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
  readonly type: nbformat.OutputType;

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
     * The original output.
     */
    output: nbformat.IOutput;

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
class OutputModel extends RenderMime.MimeModel implements IOutputModel {
  /**
   * Construct a new output model.
   */
  constructor(options: IOutputModel.IOptions) {
    super(Private.getBundleOptions(options));
    let output = this._raw = options.output;
    this.type = output.output_type;
    // Remove redundant data.
    switch (output.output_type) {
    case 'display_data':
    case 'execute_result':
      output.data = Object.create(null);
      output.metadata = Object.create(null);
      break;
    default:
      break;
    }
    if (output.output_type === 'execute_result') {
      this.executionCount = output.execution_count;
    } else {
      this.executionCount = null;
    }
  }

  /**
   * The output type.
   */
  readonly type: nbformat.OutputType;

  /**
   * The execution count.
   */
  readonly executionCount: nbformat.ExecutionCount;

  /**
   * Serialize the model to JSON.
   */
  toJSON(): nbformat.IOutput {
    let output = JSON.parse(JSON.stringify(this._raw)) as nbformat.IOutput;
    switch (output.output_type) {
    case 'display_data':
    case 'execute_result':
      for (let key in this.keys()) {
        output.data[key] = this.get(key) as nbformat.MultilineString | JSONObject;
      }
      for (let key in this.metadata.keys()) {
        output.metadata[key] = this.metadata.get(key);
      }
      break;
    default:
      break;
    }
    return output;
  }

  private _raw: nbformat.IOutput;
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
   */
  export
  function getMetadata(output: nbformat.IOutput): JSONObject {
    switch (output.output_type) {
    case 'execute_result':
    case 'display_data':
      return (output as nbformat.IDisplayData).metadata;
    default:
      break;
    }
    return Object.create(null);
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
    switch (output.output_type) {
    case 'execute_result':
    case 'display_data':
      bundle = output.data;
      break;
    case 'stream':
      if (output.name === 'stderr') {
        bundle['application/vnd.jupyter.stderr'] = output.text;
      } else {
        bundle['application/vnd.jupyter.stdout'] = output.text;
      }
      break;
    case 'error':
      let traceback = output.traceback.join('\n');
      bundle['application/vnd.jupyter.stderr'] = (
        traceback || `${output.ename}: ${output.evalue}`
      );
      break;
    default:
      break;
    }
    return convertBundle(bundle);
  }

  /**
   * Get the bundle options given output model options.
   */
  export
  function getBundleOptions(options: IOutputModel.IOptions): RenderMime.IMimeModelOptions {
    let data = OutputModel.getData(options.output);
    let metadata = OutputModel.getMetadata(options.output);
    let trusted = !!options.trusted;
    return { data, trusted, metadata };
  }

  /**
   * Convert a mime bundle to mime data.
   */
  function convertBundle(bundle: nbformat.IMimeBundle): JSONObject {
    let map: JSONObject = Object.create(null);
    for (let mimeType in bundle) {
      let value = bundle[mimeType];
      if (Array.isArray(value)) {
        map[mimeType] = (value as string[]).join('\n');
      } else {
        map[mimeType] = value as string;
      }
    }
    return map;
  }
}
