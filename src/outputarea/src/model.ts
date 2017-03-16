// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  each, map, toArray
} from '@phosphor/algorithm';

import {
  ISignal, Signal
} from '@phosphor/signaling';

import {
  IObservableVector, ObservableVector, nbformat
} from '@jupyterlab/coreutils';

import {
  IOutputModel, OutputModel
} from '@jupyterlab/rendermime';

import {
  IOutputAreaModel
} from './widget';


/**
 * The default implementation of the IOutputAreaModel.
 */
export
class OutputAreaModel implements IOutputAreaModel {
  /**
   * Construct a new observable outputs instance.
   */
  constructor(options: IOutputAreaModel.IOptions = {}) {
    this._trusted = !!options.trusted;
    this.contentFactory = (options.contentFactory ||
      OutputAreaModel.defaultContentFactory
    );
    this.list = new ObservableVector<IOutputModel>();
    if (options.values) {
      each(options.values, value => { this._add(value); });
    }
    this.list.changed.connect(this._onListChanged, this);
  }

  /**
   * A signal emitted when the model state changes.
   */
  get stateChanged(): ISignal<IOutputAreaModel, void> {
    return this._stateChanged;
  }

  /**
   * A signal emitted when the model changes.
   */
  get changed(): ISignal<this, IOutputAreaModel.ChangedArgs> {
    return this._changed;
  }

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
      let value = item.toJSON();
      item.dispose();
      item = this._createItem({ value, trusted });
      this.list.set(i, item);
    }
  }

  /**
   * The output content factory used by the model.
   */
  readonly contentFactory: IOutputAreaModel.IContentFactory;

  /**
   * Test whether the model is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Dispose of the resources used by the model.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;
    this.list.dispose();
    Signal.clearData(this);
  }

  /**
   * Get an item at the specified index.
   */
  get(index: number): IOutputModel {
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

    return this._add(output);
  }

  /**
   * Clear all of the output.
   *
   * @param wait Delay clearing the output until the next message is added.
   */
  clear(wait: boolean = false): void {
    this._lastStream = '';
    if (wait) {
      this.clearNext = true;
      return;
    }
    each(this.list, (item: IOutputModel) => { item.dispose(); });
    this.list.clear();
  }

  /**
   * Deserialize the model from JSON.
   *
   * #### Notes
   * This will clear any existing data.
   */
  fromJSON(values: nbformat.IOutput[]) {
    this.clear();
    each(values, value => { this._add(value); });
  }

  /**
   * Serialize the model to JSON.
   */
  toJSON(): nbformat.IOutput[] {
    return toArray(map(this.list, (output: IOutputModel) => output.toJSON() ));
  }

  /**
   * Add an item to the list.
   */
  private _add(value: nbformat.IOutput): number {
    let trusted = this._trusted;

    // Normalize stream data.
    if (nbformat.isStream(value)) {
      if (Array.isArray(value.text)) {
        value.text = (value.text as string[]).join('\n');
      }
    }

    // Consolidate outputs if they are stream outputs of the same kind.
    if (nbformat.isStream(value) && this._lastStream &&
        value.name === this._lastName) {
      // In order to get a list change event, we add the previous
      // text to the current item and replace the previous item.
      // This also replaces the metadata of the last item.
      this._lastStream += value.text as string;
      value.text = this._lastStream;
      let item = this._createItem({ value, trusted });
      let index = this.length - 1;
      let prev = this.list.at(index);
      prev.dispose();
      this.list.set(index, item);
      return index;
    }

    // Create the new item.
    let item = this._createItem({ value, trusted });

    // Update the stream information.
    if (nbformat.isStream(value)) {
      this._lastStream = value.text as string;
      this._lastName = value.name;
    } else {
      this._lastStream = '';
    }

    // Add the item to our list and return the new length.
    return this.list.pushBack(item);
  }

  protected clearNext = false;
  protected list: IObservableVector<IOutputModel> = null;

  /**
   * Create an output item and hook up its signals.
   */
  private _createItem(options: IOutputModel.IOptions): IOutputModel {
    let factory = this.contentFactory;
    let item = factory.createOutputModel(options);
    item.data.changed.connect(this._onGenericChange, this);
    item.metadata.changed.connect(this._onGenericChange, this);
    return item;
  }

  /**
   * Handle a change to the list.
   */
  private _onListChanged(sender: IObservableVector<IOutputModel>, args: ObservableVector.IChangedArgs<IOutputModel>) {
    this._changed.emit(args);
    this._stateChanged.emit(void 0);
  }

  /**
   * Handle a change to an item.
   */
  private _onGenericChange(): void {
    this._stateChanged.emit(void 0);
  }

  private _lastStream: string;
  private _lastName: 'stdout' | 'stderr';
  private _trusted = false;
  private _isDisposed = false;
  private _stateChanged = new Signal<IOutputAreaModel, void>(this);
  private _changed = new Signal<this, IOutputAreaModel.ChangedArgs>(this);
}


/**
 * The namespace for OutputAreaModel class statics.
 */
export
namespace OutputAreaModel {
  /**
   * The default implementation of a `IModelOutputFactory`.
   */
  export
  class ContentFactory implements IOutputAreaModel.IContentFactory {
    /**
     * Create an output model.
     */
    createOutputModel(options: IOutputModel.IOptions): IOutputModel {
      return new OutputModel(options);
    }
  }

  /**
   * The default output model factory.
   */
  export
  const defaultContentFactory = new ContentFactory();
}
