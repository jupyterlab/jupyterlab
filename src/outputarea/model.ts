// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  nbformat
} from '@jupyterlab/services';

import {
  each, toArray
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


/**
 * A model that maintains a list of output data.
 */
export
interface IOutputAreaModel extends IDisposable {
  /**
   * A signal emitted when the model changes.
   */
  readonly changed: ISignal<IOutputAreaModel, ObservableVector.IChangedArgs<OutputAreaModel.IOutput>>;

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
  get(index: number): OutputAreaModel.IOutput;

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
  constructor() {
    this.list = new ObservableVector<OutputAreaModel.Output>();
    this.list.changed.connect(this._onListChanged, this);
  }

  /**
   * A signal emitted when the model changes.
   */
  readonly changed: ISignal<this, ObservableVector.IChangedArgs<OutputAreaModel.Output>>;

  /**
   * A signal emitted when a value in one of the outputs changes.
   */
  readonly itemChanged: ISignal<IOutputAreaModel, void>;

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
    for (let i = 0; i < this.list.length, i++) {
      let item = this.list.at(i);
      let output = item.toJSON();
      item.dispose();
      item = this._createItem({ output, trusted });
      this.set(i, item);
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
  get(index: number): OutputAreaModel.IOutput {
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
      this._lastStream += output.text;
      output.text = this._lastStream;
      let item = this._createItem({ output, trusted });
      let index = this.length - 1;
      this.list.set(index, item);
      return index;
    }

    // Update the stream information.
    if (item.output_type === 'stream') {
      this._lastStream = output.text;
      this._lastName = output.name;
    } else {
      this._lastStream = '';
    }

    // Create the new item and add it to our list.
    let item = this._createItem({ output, trusted });
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
    each(this.list => item => { item.dispose(); });
    this.list.clear();
  }

  /**
   * Serialize the model to JSON.
   */
  toJSON(): nbformat.IOutput[] {
    return toArray(each(this.list, output => output.toJSON() ));
  }

  protected clearNext = false;
  protected list: IObservableVector<OutputAreaModel.Output> = null;

  /**
   * Create an output item and hook up its signals.
   */
  private _createItem(options: OutputAreaModel.IOutputOptions): OutputAreaModel.IOutput {
    let item = new OutputAreaModel.Output(options);
    item.changed.connect(this._onItemChanged);
    item.metadata.changed.connect(this._onItemChanged);
    return item;
  }

  /**
   * Handle a change to the list.
   */
  private _onListChanged(sender: IObservableVector<OutputAreaModel.IOutput>, args: ObservableVector.IChangedArgs<OutputAreaModel.Output>) {
    this.changed.emit(args);
  }

  private _lastStream: string;
  private _lastName: 'stdout' | 'stderr';
  private _trusted;
}


/**
 * A namespace for OutputAreaModel statics.
 */
export
namespace OutputAreaModel {
  /**
   * The interface for an element of the output area.
   */
  export
  interface IOutput extends RenderMime.IMimeBundle {
    /**
     * The output type.
     */
    readonly type: nbformat.OutputType;

    /**
     * Serialize the model to JSON.
     */
    toJSON(): nbformat.IOutput;
  }

  /**
   * The default implementation of an output model.
   */
  export
  class Output extends RenderMime.MimeBundle implements IOutput {
    /**
     * Construct a new IOutput.
     */
    constructor(options: IOutputOptions) {
      super(Private.getBundleOptions(options));
      let output = this._output = options.output;
      this.type = output.output_type;
      // Remove redundant data.
      switch (output.output_type) {
      case 'display_data':
      case 'execute_result':
        output.data = Object.create(null);
        output.metadata = Object.create(null);
        break;
      case 'text':
        output.text = '';
        break;
      default:
        break;
      }
    }

    /**
     * The output type.
     */
    readonly type: nbformat.OutputType;

    /**
     * Serialize the model to JSON.
     */
    toJSON(): nbformat.IOutput {
      let output = JSON.parse(JSON.stringify(this._output)) as nbformat.IOutput;
      switch (output.output_type) {
      case 'display_data':
      case 'execute_result':
        for (key in self.keys()) {
          output.data[key] = self.get(key);
        }
        for (key in self.metadata.keys) {
          output.metadata[key] = self.metadata.get(key);
        }
        break;
      case 'stream':
        output.text = self.get(RenderMime.CONSOLE_MIMETYPE);
        break;
      default:
        break;
      }
      return output;
    }

    private _output: nbformat.IOutput;
  }

  /**
   * The options used to create an IOutput.
   */
  export
  interface IOutputOptions {
    /**
     * The original output.
     */
    output: nbformat.IOutput;

    /**
     * The parsed mime bundle.
     */
    data: JSONObject;

    /**
     * Whether the output is trusted.
     */
    trusted: boolean;
  }
}


// Define the signals for the `OutputAreaModel` class.
defineSignal(OutputAreaModel.prototype, 'changed');
defineSignal(OutputAreaModel.prototype, 'itemChanged');
defineSignal(OutputAreaModel.prototype, 'disposed');


/**
 * The namespace for module private data.
 */
namespace Private {
  /**
   * Get the bundle options given IOutputOptions.
   */
  export
  function getBundleOptions(options: OutputAreaModel.IOptions): RenderMime.IMimeBundleOPtions {
    let data = RenderMime.getData(options.output);
    let metadata = RenderMime.getMetadata(options.output);
    let trusted = data.trusted;
    return { data, trusted, metadata };
  }
}
