// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  nbformat
} from '@jupyterlab/services';

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
   *
   * #### Notes
   * The payload is the index of the item that changed.
   */
  readonly itemChanged: ISignal<IOutputAreaModel, number>;

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
  toJSON(): nbformat.IOutput;
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
   *
   * #### Notes
   * The payload is the index of the item that changed.
   */
  readonly itemChanged: ISignal<IOutputAreaModel, number>;

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
  get(index: number): OutputAreaModel.Output {
    return this.list.at(index);
  }

  /**
   * Add an output, which may be combined with previous output.
   *
   * #### Notes
   * The output bundle is copied.
   * Contiguous stream outputs of the same `name` are combined.
   */
  add(output: OutputAreaModel.Output): number {
    // If we received a delayed clear message, then clear now.
    if (this.clearNext) {
      this.clear();
      this.clearNext = false;
    }
    if (output.output_type === 'input_request') {
      this.list.pushBack(output);
    }

    // Make a copy of the output bundle.
    let value = JSON.parse(JSON.stringify(output)) as nbformat.IOutput;

    // Join multiline text outputs.
    if (value.output_type === 'stream') {
      if (Array.isArray(value.text)) {
        value.text = (value.text as string[]).join('\n');
      }
    }

    // Consolidate outputs if they are stream outputs of the same kind.
    let index = this.length - 1;
    let lastOutput = this.get(index);
    if (value.output_type === 'stream'
        && lastOutput && lastOutput.output_type === 'stream'
        && value.name === lastOutput.name) {
      // In order to get a list change event, we add the previous
      // text to the current item and replace the previous item.
      // This also replaces the metadata of the last item.
      let text = value.text as string;
      value.text = lastOutput.text as string + text;
      this.list.set(index, value);
      return index;
    } else {
      switch (value.output_type) {
      case 'stream':
      case 'execute_result':
      case 'display_data':
      case 'error':
        return this.list.pushBack(value);
      default:
        break;
      }
    }
    return -1;
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
    this.list.clear();
  }

  protected clearNext = false;
  protected list: IObservableVector<OutputAreaModel.Output> = null;

  /**
   * Handle a change to the list.
   */
  private _onListChanged(sender: IObservableVector<OutputAreaModel.IOutput>, args: ObservableVector.IChangedArgs<OutputAreaModel.Output>) {
    this.changed.emit(args);
  }
}


/**
 * A namespace for OutputAreaModel statics.
 */
export
namespace OutputAreaModel {

  /**
   * A valid output area item.
   */
  export
  type Output = nbformat.IOutput | IInputRequest;
}


// Define the signals for the `OutputAreaModel` class.
defineSignal(OutputAreaModel.prototype, 'changed');
defineSignal(OutputAreaModel.prototype, 'disposed');
