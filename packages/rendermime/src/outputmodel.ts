/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import * as Y from 'yjs';

import {
  JSONExt,
  JSONValue,
  PartialJSONValue,
  ReadonlyPartialJSONObject,
  PartialJSONObject
} from '@lumino/coreutils';

import { ISignal, Signal } from '@lumino/signaling';

import * as nbformat from '@jupyterlab/nbformat';

import { IRenderMime } from '@jupyterlab/rendermime-interfaces';

import { MimeModel } from './mimemodel';

/**
 * The interface for an output model.
 */
export interface IOutputModel extends IRenderMime.IMimeModel {
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

  reinitialize(options: nbformat.IOutput, trusted: boolean): void;
}

/**
 * The namespace for IOutputModel sub-interfaces.
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
    ymodel: Y.Map<any>;
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
    this._ymodel = options.ymodel;
    if (options.value) {
      // need to initialize
      const trusted = !!options.trusted;

      for (let key in options.value) {
        this._ymodel.set(key, options.value[key]);
      }
      this._ymodel.set('trusted', !!trusted);
    }
    this._changedHandler = this._changedHandler.bind(this);
    this._ymodel.observeDeep(this._changedHandler);
  }

  private _changedHandler() {
    this._changed.emit(void 0);
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
  get type(): string {
    return this._ymodel.get('output_type');
  }

  /**
   * The execution count.
   */
  get executionCount(): nbformat.ExecutionCount {
    return this._ymodel.get('execution_count') || null;
  }

  /**
   * Whether the model is trusted.
   */
  get trusted(): boolean {
    return !!this._ymodel.get('trusted');
  }

  set trusted(value: boolean) {
    if (this.trusted !== value) {
      this._ymodel.set('trusted', value);
    }
  }

  /**
   * Dispose of the resources used by the output model.
   */
  dispose(): void {
    this._ymodel.unobserveDeep(this._changedHandler);
    Signal.clearData(this);
  }

  /**
   * The data associated with the model.
   */
  get data(): ReadonlyPartialJSONObject {
    return Private.getData(this._ymodel.toJSON());
  }

  /**
   * The metadata associated with the model.
   */
  get metadata(): ReadonlyPartialJSONObject {
    return Private.getMetadata(this._ymodel.toJSON());
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
      this._ymodel.set('data', options.data);
    }
    if (options.metadata) {
      this._ymodel.set('metadata', options.metadata);
    }
  }

  reinitialize(options: nbformat.IOutput, trusted: boolean): void {
    this._updateYMap(this._ymodel, options);
    this.trusted = trusted;
  }

  /**
   * Serialize the model to JSON.
   */
  toJSON(): nbformat.IOutput {
    const output: PartialJSONValue = {};
    this._ymodel.forEach((value, key) => {
      if (key !== 'trusted') {
        output[key] = value;
      }
    });
    switch (this.type) {
      case 'display_data':
      case 'execute_result':
      case 'update_display_data':
        output['data'] = this.data as PartialJSONObject;
        output['metadata'] = this.metadata as PartialJSONObject;
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
  private _updateYMap(ymap: Y.Map<any>, data: ReadonlyPartialJSONObject) {
    ymap.doc!.transact(() => {
      const oldKeys = Array.from(ymap.keys());
      const newKeys = Object.keys(data);

      // Handle removed keys.
      for (const key of oldKeys) {
        if (newKeys.indexOf(key) === -1) {
          ymap.delete(key);
        }
      }

      // Handle changed data.
      for (const key of newKeys) {
        const oldValue = ymap.get(key);
        const newValue = data[key];
        if (oldValue !== newValue) {
          ymap.set(key, newValue as JSONValue);
        }
      }
    });
  }

  private _ymodel: Y.Map<any>;
  private _changed = new Signal<this, void>(this);
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
  export function getData(output: nbformat.IOutput): PartialJSONObject {
    return Private.getData(output);
  }

  /**
   * Get the metadata from an output message.
   *
   * @params output - A kernel output message payload.
   *
   * @returns - The metadata for the payload.
   */
  export function getMetadata(output: nbformat.IOutput): PartialJSONObject {
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
  export function getData(output: nbformat.IOutput): PartialJSONObject {
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
      bundle['application/vnd.jupyter.error'] = output;
      const traceback = output.traceback.join('\n');
      bundle['application/vnd.jupyter.stderr'] =
        traceback || `${output.ename}: ${output.evalue}`;
    }
    return convertBundle(bundle);
  }

  /**
   * Get the metadata from an output message.
   */
  export function getMetadata(output: nbformat.IOutput): PartialJSONObject {
    const value: PartialJSONObject = Object.create(null);
    if (nbformat.isExecuteResult(output) || nbformat.isDisplayData(output)) {
      for (const key in output.metadata) {
        value[key] = extract(output.metadata, key);
      }
    }
    return value;
  }

  /**
   * Get the bundle options given output model options.
   */
  export function getBundleOptions(
    value: nbformat.IOutput
  ): Required<Omit<Omit<MimeModel.IOptions, 'callback'>, 'trusted'>> {
    const data = getData(value!);
    const metadata = getMetadata(value!);
    return { data, metadata };
  }

  /**
   * Extract a value from a JSONObject.
   */
  export function extract(
    value: ReadonlyPartialJSONObject,
    key: string
  ): PartialJSONValue | undefined {
    const item = value[key];
    if (item === undefined || JSONExt.isPrimitive(item)) {
      return item;
    }
    return JSON.parse(JSON.stringify(item));
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
