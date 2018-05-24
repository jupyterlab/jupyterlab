// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  each, map, toArray
} from '@phosphor/algorithm';

import {
  IDisposable
} from '@phosphor/disposable';

import {
  ISignal, Signal
} from '@phosphor/signaling';

import {
  nbformat,
} from '@jupyterlab/coreutils';

import {
  IObservableList, ObservableList,
  IObservableValue, ObservableValue, IModelDB
} from '@jupyterlab/observables';

import {
  IOutputModel, OutputModel
} from '@jupyterlab/rendermime';


/**
 * The model for an output area.
 */
export
interface IOutputAreaModel extends IDisposable {
  /**
   * A signal emitted when the model state changes.
   */
  readonly stateChanged: ISignal<IOutputAreaModel, void>;

  /**
   * A signal emitted when the model changes.
   */
  readonly changed: ISignal<IOutputAreaModel, IOutputAreaModel.ChangedArgs>;

  /**
   * The length of the items in the model.
   */
  readonly length: number;

  /**
   * Whether the output area is trusted.
   */
  trusted: boolean;

  /**
   * The output content factory used by the model.
   */
  readonly contentFactory: IOutputAreaModel.IContentFactory;

  /**
   * Get an item at the specified index.
   */
  get(index: number): IOutputModel;

  /**
   * Add an output, which may be combined with previous output.
   *
   * #### Notes
   * The output bundle is copied.
   * Contiguous stream outputs of the same `name` are combined.
   */
  add(output: nbformat.IOutput): number;

  /**
   * Set the value at the specified index.
   */
  set(index: number, output: nbformat.IOutput): void;

  /**
   * Clear all of the output.
   *
   * @param wait - Delay clearing the output until the next message is added.
   */
  clear(wait?: boolean): void;

  /**
   * Deserialize the model from JSON.
   *
   * #### Notes
   * This will clear any existing data.
   */
  fromJSON(values: nbformat.IOutput[]): void;

  /**
   * Serialize the model to JSON.
   */
  toJSON(): nbformat.IOutput[];
}


/**
 * The namespace for IOutputAreaModel interfaces.
 */
export
namespace IOutputAreaModel {
  /**
   * The options used to create a output area model.
   */
  export
  interface IOptions {
    /**
     * The initial values for the model.
     */
    values?: nbformat.IOutput[];

    /**
     * Whether the output is trusted.  The default is false.
     */
    trusted?: boolean;

    /**
     * The output content factory used by the model.
     *
     * If not given, a default factory will be used.
     */
    contentFactory?: IContentFactory;

    /**
     * An optional IModelDB to store the output area model.
     */
    modelDB?: IModelDB;
  }

  /**
   * A type alias for changed args.
   */
  export
  type ChangedArgs = IObservableList.IChangedArgs<IOutputModel>;

  /**
   * The interface for an output content factory.
   */
  export
  interface IContentFactory {
    /**
     * Create an output model.
     */
    createOutputModel(options: IOutputModel.IOptions): IOutputModel;
  }
}

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
    this.list = new ObservableList<IOutputModel>();
    if (options.values) {
      each(options.values, value => { this._add(value); });
    }
    this.list.changed.connect(this._onListChanged, this);

    // If we are given a IModelDB, keep an up-to-date
    // serialized copy of the OutputAreaModel in it.
    if (options.modelDB) {
      this._modelDB = options.modelDB;
      this._serialized = this._modelDB.createValue('outputs');
      if (this._serialized.get()) {
        this.fromJSON(this._serialized.get() as nbformat.IOutput[]);
      } else {
        this._serialized.set(this.toJSON());
      }
      this._serialized.changed.connect(this._onSerializedChanged, this);
    }
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
      let item = this.list.get(i);
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
    return this.list.get(index);
  }

  /**
   * Set the value at the specified index.
   */
  set(index: number, value: nbformat.IOutput): void {
    // Normalize stream data.
    this._normalize(value);
    let item = this._createItem({ value, trusted: this._trusted });
    this.list.set(index, item);
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

    // Normalize the value.
    this._normalize(value);

    // Consolidate outputs if they are stream outputs of the same kind.
    if (nbformat.isStream(value) && this._lastStream &&
        value.name === this._lastName) {
      // In order to get a list change event, we add the previous
      // text to the current item and replace the previous item.
      // This also replaces the metadata of the last item.
      this._lastStream += value.text as string;
      value.text = this._lastStream;
      this._removeOverwrittenChars(value);
      let item = this._createItem({ value, trusted });
      let index = this.length - 1;
      let prev = this.list.get(index);
      prev.dispose();
      this.list.set(index, item);
      return index;
    }

    if (nbformat.isStream(value)) {
      this._removeOverwrittenChars(value);
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
    return this.list.push(item);
  }

  /**
   * Normalize an output.
   */
  private _normalize(value: nbformat.IOutput): void {
    if (nbformat.isStream(value)) {
      if (Array.isArray(value.text)) {
        value.text = (value.text as string[]).join('\n');
      }
    }
  }

  /**
   * Remove characters that are overridden by backspace characters.
   */
  private _fixBackspace(txt: string): string {
    let tmp = txt;
    do {
      txt = tmp;
      // Cancel out anything-but-newline followed by backspace
      tmp = txt.replace(/[^\n]\x08/gm, '');
    } while (tmp.length < txt.length);
    return txt;
  }

  /**
   * Remove chunks that should be overridden by the effect of
   * carriage return characters.
   */
  private _fixCarriageReturn(txt: string): string {
    let tmp = txt;
    // Handle multiple carriage returns before a newline
    tmp = tmp.replace(/\r\r+\n/gm, '\r\n');
    // Remove chunks that should be overridden by carriage returns
    do {
      // Remove any chunks preceding a carriage return unless carriage
      // return followed by a newline
      tmp = tmp.replace(/^[^\n]*(?:\r(?!\n))+/gm, '');
    } while (tmp.search(/\r(?!\n)/) > -1);
    do {
      // Replace remaining \r\n characters with a newline
      tmp = tmp.replace(/\r\n/gm, '\n');
    } while (tmp.indexOf('\r\n') > -1);
    return tmp;
  }

  /*
   * Remove characters overridden by backspaces and carriage returns
   */
  private _removeOverwrittenChars(value: nbformat.IOutput): void {
    let tmp = value.text as string;
    value.text = this._fixCarriageReturn(this._fixBackspace(tmp));
  }

  protected clearNext = false;
  protected list: IObservableList<IOutputModel> = null;

  /**
   * Create an output item and hook up its signals.
   */
  private _createItem(options: IOutputModel.IOptions): IOutputModel {
    let factory = this.contentFactory;
    let item = factory.createOutputModel(options);
    item.changed.connect(this._onGenericChange, this);
    return item;
  }

  /**
   * Handle a change to the list.
   */
  private _onListChanged(sender: IObservableList<IOutputModel>, args: IObservableList.IChangedArgs<IOutputModel>) {
    if (this._serialized && !this._changeGuard) {
      this._changeGuard = true;
      this._serialized.set(this.toJSON());
      this._changeGuard = false;
    }
    this._changed.emit(args);
  }

  /**
   * If the serialized version of the outputs have changed due to a remote
   * action, then update the model accordingly.
   */
  private _onSerializedChanged(sender: IObservableValue, args: ObservableValue.IChangedArgs) {
    if (!this._changeGuard) {
      this._changeGuard = true;
      this.fromJSON(args.newValue as nbformat.IOutput[]);
      this._changeGuard = false;
    }
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
  private _modelDB: IModelDB = null;
  private _serialized: IObservableValue = null;
  private _changeGuard = false;
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
