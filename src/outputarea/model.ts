// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  nbformat
} from '@jupyterlab/services';

import {
  each, map, toArray
} from 'phosphor/lib/algorithm/iteration';

import {
  JSONObject
} from 'phosphor/lib/algorithm/json';

import {
  IDisposable
} from 'phosphor/lib/core/disposable';

import {
  clearSignalData, defineSignal, ISignal
} from 'phosphor/lib/core/signaling';

import {
  IObservableVector, ObservableVector
} from '../common/observablevector';

import {
  RenderMime
} from '../rendermime';


/**
 * A model that maintains a list of output data.
 */
export
interface IOutputAreaModel extends IDisposable {
  /**
   * A signal emitted when the model changes.
   */
  readonly changed: ISignal<IOutputAreaModel, ObservableVector.IChangedArgs<OutputModel.IModel>>;

  /**
   * A signal emitted when a value in one of the outputs changes.
   */
  readonly itemChanged: ISignal<IOutputAreaModel, void>;

  /**
   * A signal emitted when the model is disposed.
   */
  readonly disposed: ISignal<IOutputAreaModel, void>;

  /**
   * The length of the items in the model.
   */
  readonly length: number;

  /**
   * Whether the output area is trusted.
   */
  trusted: boolean;

  /**
   * Get an item at the specified index.
   */
  get(index: number): OutputModel.IModel;

  /**
   * Add an output, which may be combined with previous output.
   *
   * #### Notes
   * The output bundle is copied.
   * Contiguous stream outputs of the same `name` are combined.
   */
  add(output: nbformat.IOutput): number;

  /**
   * Clear all of the output.
   *
   * @param wait - Delay clearing the output until the next message is added.
   */
  clear(wait?: boolean): void;

  /**
   * Serialize the model to JSON.
   */
  toJSON(): nbformat.IOutput[];
}


/**
 * An model that maintains a list of output data.
 */
export
class OutputAreaModel implements IOutputAreaModel {
  /**
   * Construct a new observable outputs instance.
   */
  constructor(options: OutputAreaModel.IOptions) {
    this._trusted = options.trusted;
    this.list = new ObservableVector<OutputModel.IModel>();
    this.list.changed.connect(this._onListChanged, this);
  }

  /**
   * A signal emitted when the model changes.
   */
  readonly changed: ISignal<this, ObservableVector.IChangedArgs<OutputModel.IModel>>;

  /**
   * A signal emitted when a value in one of the outputs changes.
   */
  readonly itemChanged: ISignal<this, void>;

  /**
   * A signal emitted when the model is disposed.
   */
  readonly disposed: ISignal<this, void>;

  /**
   * Get the length of the items in the model.
   */
  get length(): number {
    return this.list ? this.list.length : 0;
  }

  /**
   * Get whether the model is trusted.
   */
  get trusted(): boolean {
    return this._trusted;
  }

  /**
   * Set whether the model is trusted.
   *
   * #### Notes
   * Changing the value will cause all of the models to re-set.
   */
  set trusted(value: boolean) {
    if (value === this._trusted) {
      return;
    }
    let trusted = this._trusted = value;
    for (let i = 0; i < this.list.length; i++) {
      let item = this.list.at(i);
      let output = item.toJSON();
      item.dispose();
      item = this._createItem({ output, trusted });
      this.list.set(i, item);
    }
  }

  /**
   * Test whether the model is disposed.
   */
  get isDisposed(): boolean {
    return this.list === null;
  }

  /**
   * Dispose of the resources used by the model.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    let list = this.list;
    this.list = null;
    list.clear();
    this.disposed.emit(void 0);
    clearSignalData(this);
  }

  /**
   * Get an item at the specified index.
   */
  get(index: number): OutputModel.IModel {
    return this.list.at(index);
  }

  /**
   * Add an output, which may be combined with previous output.
   *
   * #### Notes
   * The output bundle is copied.
   * Contiguous stream outputs of the same `name` are combined.
   */
  add(output: nbformat.IOutput): number {
    // If we received a delayed clear message, then clear now.
    if (this.clearNext) {
      this.clear();
      this.clearNext = false;
    }

    // Make a copy of the output bundle.
    output = JSON.parse(JSON.stringify(output)) as nbformat.IOutput;
    let trusted = this._trusted;

    // Consolidate outputs if they are stream outputs of the same kind.
    if (output.output_type === 'stream' && this._lastStream &&
        output.name === this._lastName) {
      // In order to get a list change event, we add the previous
      // text to the current item and replace the previous item.
      // This also replaces the metadata of the last item.
      let item = this._createItem({ output, trusted });
      this._lastStream += item.get(RenderMime.CONSOLE_MIMETYPE);
      item.set(RenderMime.CONSOLE_MIMETYPE, this._lastStream);
      let index = this.length - 1;
      this.list.set(index, item);
      return index;
    }

    // Create the new item.
    let item = this._createItem({ output, trusted });

    // Update the stream information.
    if (output.output_type === 'stream') {
      this._lastStream = item.get(RenderMime.CONSOLE_MIMETYPE) as string;
      this._lastName = output.name;
    } else {
      this._lastStream = '';
    }

    // Add the item to our list and return the new length.
    return this.list.pushBack(item);
  }

  /**
   * Clear all of the output.
   *
   * @param wait Delay clearing the output until the next message is added.
   */
  clear(wait: boolean = false): void {
    if (wait) {
      this.clearNext = true;
      return;
    }
    each(this.list, item => { item.dispose(); });
    this.list.clear();
  }

  /**
   * Serialize the model to JSON.
   */
  toJSON(): nbformat.IOutput[] {
    return toArray(map(this.list, output => output.toJSON() ));
  }

  protected clearNext = false;
  protected list: IObservableVector<OutputModel.IModel> = null;

  /**
   * Create an output item and hook up its signals.
   */
  private _createItem(options: OutputModel.IOptions): OutputModel.IModel {
    let item: OutputModel.IModel;
    switch (options.output.output_type) {
    case 'execute_result':
      item = new OutputModel.ExecuteResult(options);
      break;
    case 'stream':
      item = new OutputModel.Stream(options);
      break;
    case 'error':
      item = new OutputModel.Error(options);
      break;
    default:
      item = new OutputModel.DisplayData(options);
      break;
    }
    item.changed.connect(this._onItemChanged);
    item.metadata.changed.connect(this._onItemChanged);
    return item;
  }

  /**
   * Handle a change to the list.
   */
  private _onListChanged(sender: IObservableVector<OutputModel.IModel>, args: ObservableVector.IChangedArgs<OutputModel.IModel>) {
    this.changed.emit(args);
  }

  /**
   * Handle a change to an item.
   */
  private _onItemChanged(): void {
    this.itemChanged.emit(void 0);
  }

  private _lastStream: string;
  private _lastName: 'stdout' | 'stderr';
  private _trusted = false;
}


/**
 * A namespace for OutputAreaModel statics.
 */
export
namespace OutputAreaModel {
  /**
   * The options used to create an output area model.
   */
  export
  interface IOptions {
    /**
     * Whether the model is trusted.
     */
    trusted: boolean;
  }
}


// Define the signals for the `OutputAreaModel` class.
defineSignal(OutputAreaModel.prototype, 'changed');
defineSignal(OutputAreaModel.prototype, 'itemChanged');
defineSignal(OutputAreaModel.prototype, 'disposed');


/**
 * The namespace for output model data.
 */
export
namespace OutputModel {
  /**
   * The options used to create an output model.
   */
  export
  interface IOptions {
    /**
     * The original output.
     */
    output: nbformat.IOutput;

    /**
     * Whether the output is trusted.
     */
    trusted: boolean;
  }

  /**
   * The interface for an element of the output area.
   */
  export
  interface IBaseOutput extends RenderMime.IMimeModel {
    /**
     * The output type.
     */
    readonly output_type: nbformat.OutputType;

    /**
     * Serialize the model to JSON.
     */
    toJSON(): nbformat.IOutput;
  }

  /**
   * The interface for a display data result.
   */
  export
  interface IDisplayData extends IBaseOutput {
    /**
     * The output type.
     */
    output_type: 'display_data';
  }

  /**
   * The interface for an execute result.
   */
  export
  interface IExecuteResult extends IBaseOutput {
    /**
     * The output type.
     */
    output_type: 'execute_result';

    /**
     * The execution count of the output.
     */
    readonly execution_count: nbformat.ExecutionCount;
  }

  /**
   * The interface for a stream.
   */
  export
  interface IStream extends IBaseOutput {
    /**
     * The output type.
     */
    output_type: 'stream';

    /**
     * The name of the stream.
     */
    readonly name: 'stdout' | 'stderr';
  }

  /**
   * The interface for an error.
   */
  export
  interface IError extends IBaseOutput {
    /**
     * Type of cell output.
     */
    output_type: 'error';

    /**
     * The name of the error.
     */
    readonly ename: string;

    /**
     * The value, or message, of the error.
     */
    readonly evalue: string;

    /**
     * The error's traceback.
     */
    readonly traceback: string[];
  }

  /**
   * The type for an output.
   */
  export
  type IModel = IDisplayData | IExecuteResult | IStream | IError;

  /**
   * The default implementation of an output model.
   */
  export
  class OutputModel extends RenderMime.MimeModel implements IBaseOutput {
    /**
     * Construct a new IModel.
     */
    constructor(options: IOptions) {
      super(Private.getBundleOptions(options));
      let output = this.raw = options.output;
      this.output_type = output.output_type;
      // Remove redundant data.
      switch (output.output_type) {
      case 'display_data':
      case 'execute_result':
        output.data = Object.create(null);
        output.metadata = Object.create(null);
        break;
      case 'stream':
        output.text = '';
        break;
      default:
        break;
      }
    }

    /**
     * The output type.
     */
    readonly output_type: nbformat.OutputType;

    /**
     * Serialize the model to JSON.
     */
    toJSON(): nbformat.IOutput {
      let output = JSON.parse(JSON.stringify(this.raw)) as nbformat.IOutput;
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
      case 'stream':
        output.text = this.get(RenderMime.CONSOLE_MIMETYPE) as string;
        break;
      default:
        break;
      }
      return output;
    }

    protected raw: nbformat.IOutput;
  }

  /**
   * An output for display data.
   */
  export
  class DisplayData extends OutputModel implements IDisplayData {
    /**
     * Type of cell output.
     */
    output_type: 'display_data';
  }

  /**
   * An output for execute result data.
   */
  export
  class ExecuteResult extends OutputModel implements IExecuteResult {
    /**
     * The output type.
     */
    output_type: 'execute_result';

    /**
     * The execution count of the output.
     */
    get execution_count(): nbformat.ExecutionCount {
      return (this.raw as nbformat.IExecuteResult).execution_count;
    }
  }

  /**
   * An output for stream data.
   */
  export
  class Stream extends OutputModel implements IStream {
    /**
     * The output type.
     */
    output_type: 'stream';

    /**
     * The name of the stream.
     */
    get name(): 'stdout' | 'stderr' {
      return (this.raw as nbformat.IStream).name;
    }
  }

  /**
   * An output for error data.
   */
  export
  class Error extends OutputModel implements IError {
    /**
     * Type of cell output.
     */
    output_type: 'error';

    /**
     * The name of the error.
     */
    get ename(): string {
      return (this.raw as nbformat.IError).ename;
    }

    /**
     * The value, or message, of the error.
     */
    get evalue(): string {
      return (this.raw as nbformat.IError).evalue;
    }

    /**
     * The error's traceback.
     */
    get traceback(): string[] {
      return (this.raw as nbformat.IError).traceback;
    }
  }
}

/**
 * The namespace for module private data.
 */
namespace Private {
  /**
   * Get the bundle options given output model options.
   */
  export
  function getBundleOptions(options: OutputModel.IOptions): RenderMime.IMimeModelOptions {
    let data = RenderMime.getData(options.output);
    let metadata = RenderMime.getMetadata(options.output);
    let trusted = options.trusted;
    return { data, trusted, metadata };
  }
}
