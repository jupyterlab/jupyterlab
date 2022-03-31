// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as nbformat from '@jupyterlab/nbformat';
import { IOutputModel, OutputModel } from '@jupyterlab/rendermime';
import { Delta, ISharedList, SharedDoc } from '@jupyterlab/shared-models';
import { each } from '@lumino/algorithm';
import { JSONExt, JSONObject } from '@lumino/coreutils';
import { IDisposable } from '@lumino/disposable';
import { ISignal, Signal } from '@lumino/signaling';

/**
 * The model for an output area.
 */
export interface IOutputAreaModel extends IDisposable {
  /**
   * A signal emitted when the output item changes.
   *
   * The number is the index of the output that changed.
   */
  readonly stateChanged: ISignal<IOutputAreaModel, number>;

  /**
   * A signal emitted when the list of items changes.
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
   * @returns The total number of outputs.
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
export namespace IOutputAreaModel {
  /**
   * The options used to create a output area model.
   */
  export interface IOptions {
    /**
     * The underlying shared model.
     *
     * TODO: documentation
     */
    sharedList?: ISharedList<JSONObject>;

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
  }

  /**
   * A type alias for changed args.
   */
  export type ChangedArgs = ISharedList.IChangedArgs<IOutputModel>;

  /**
   * The interface for an output content factory.
   */
  export interface IContentFactory {
    /**
     * Create an output model.
     */
    createOutputModel(options: IOutputModel.IOptions): IOutputModel;
  }
}

/**
 * The default implementation of the IOutputAreaModel.
 */
export class OutputAreaModel implements IOutputAreaModel {
  /**
   * Construct a new observable outputs instance.
   */
  constructor(options: IOutputAreaModel.IOptions = {}) {
    this._trusted = !!options.trusted;
    this.contentFactory =
      options.contentFactory || OutputAreaModel.defaultContentFactory;

    if (options.sharedList) {
      this._sharedList = options.sharedList;
    } else {
      this._sharedList = new SharedDoc().createList<JSONObject>('outputs');
    }

    this._outputMap = new Map<any, IOutputModel>();
    each(this._sharedList, value => {
      const newItem = this._createItem({
        value: value as nbformat.IOutput,
        trusted: this._trusted
      });
      newItem.changed.connect(this._onGenericChange, this);
      this._outputMap.set(value, newItem);
    });
    this._sharedList.changed.connect(this._onListChanged, this);
  }

  /**
   * A signal emitted when an item changes.
   */
  get stateChanged(): ISignal<IOutputAreaModel, number> {
    return this._stateChanged;
  }

  /**
   * A signal emitted when the list of items changes.
   */
  get changed(): ISignal<IOutputAreaModel, IOutputAreaModel.ChangedArgs> {
    return this._changed;
  }

  /**
   * Get the length of the items in the model.
   */
  get length(): number {
    return this._sharedList ? this._sharedList.length : 0;
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
    const trusted = (this._trusted = value);
    for (let i = 0; i < this._sharedList.length; i++) {
      const oldValue = this._sharedList.get(i);
      const oldItem = this._outputMap.get(oldValue)!;
      const value = oldItem.toJSON();

      const newItem = this._createItem({
        value,
        trusted
      });
      this._outputMap.set(value as JSONObject, newItem);
      this._sharedList.set(i, value as JSONObject);
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
    this._sharedList.dispose();
    Signal.clearData(this);
  }

  /**
   * Get an item at the specified index.
   */
  get(index: number): IOutputModel {
    const value = this._sharedList.get(index);
    return this._outputMap.get(value)!;
  }

  /**
   * Set the value at the specified index.
   */
  set(index: number, value: nbformat.IOutput): void {
    value = JSONExt.deepCopy(value);
    // Normalize stream data.
    Private.normalize(value);
    const newItem = this._createItem({
      value,
      trusted: this._trusted
    });
    this._outputMap.set(value as JSONObject, newItem);
    this._sharedList.set(index, value as JSONObject);
  }

  /**
   * Add an output, which may be combined with previous output.
   *
   * @returns The total number of outputs.
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
    this._lastModel = null;
    if (wait) {
      this.clearNext = true;
      return;
    }
    this._sharedList.clear();
  }

  /**
   * Deserialize the model from JSON.
   *
   * #### Notes
   * This will clear any existing data.
   */
  fromJSON(values: nbformat.IOutput[]): void {
    this.clear();
    each(values, value => {
      this._add(value);
    });
  }

  /**
   * Serialize the model to JSON.
   */
  toJSON(): nbformat.IOutput[] {
    const outputs: nbformat.IOutput[] = [];
    each(this._sharedList, value => {
      const item = this._outputMap.get(value)!;
      outputs.push(item.toJSON());
    });
    return outputs;
  }

  /**
   * Remove a range of items from the list.
   *
   * @param startIndex — The start index of the range to remove (inclusive).
   * @param endIndex — The end index of the range to remove (exclusive).
   *
   * @returns The new length of the list.
   */
  protected removeRange(startIndex: number, endIndex: number): number {
    return this._sharedList.removeRange(startIndex, endIndex);
  }

  /**
   * Add a copy of the item to the list.
   *
   * @returns The list length
   */
  private _add(value: nbformat.IOutput): number {
    const trusted = this._trusted;
    value = JSONExt.deepCopy(value);

    // Normalize the value.
    Private.normalize(value);

    // Consolidate outputs if they are stream outputs of the same kind.
    if (
      nbformat.isStream(value) &&
      this._lastStream &&
      this._lastModel &&
      value.name === this._lastName &&
      this.shouldCombine({
        value,
        lastModel: this._lastModel
      })
    ) {
      // In order to get a list change event, we add the previous
      // text to the current item and replace the previous item.
      // This also replaces the metadata of the last item.
      this._lastStream += value.text as string;
      this._lastStream = Private.removeOverwrittenChars(this._lastStream);
      value.text = this._lastStream;

      const index = this.length - 1;
      const newItem = this._createItem({
        value,
        trusted
      });
      this._lastModel = newItem;
      this._outputMap.set(value as JSONObject, newItem);
      this._sharedList.set(index, value as JSONObject);
      return index;
    }

    if (nbformat.isStream(value)) {
      value.text = Private.removeOverwrittenChars(value.text as string);
    }

    // Create the new item.
    const newItem = this._createItem({
      value,
      trusted
    });

    // Add the item to our list and return the new length.
    this._outputMap.set(value as JSONObject, newItem);
    this._sharedList.push(value as JSONObject);

    // Update the stream information.
    if (nbformat.isStream(value)) {
      this._lastStream = value.text as string;
      this._lastModel = newItem;
      this._lastName = value.name;
    } else {
      this._lastStream = '';
      this._lastModel = null;
    }
    return this.length;
  }

  /**
   * Whether a new value should be consolidated with the previous output.
   *
   * This will only be called if the minimal criteria of both being stream
   * messages of the same type.
   */
  protected shouldCombine(options: {
    value: nbformat.IOutput;
    lastModel: IOutputModel;
  }): boolean {
    return true;
  }

  /**
   * A flag that is set when we want to clear the output area
   * *after* the next addition to it.
   */
  protected clearNext = false;

  /**
   * Create an output item and hook up its signals.
   */
  private _createItem(options: IOutputModel.IOptions): IOutputModel {
    const factory = this.contentFactory;
    const item = factory.createOutputModel(options);
    return item;
  }

  /**
   * Handle a change to the list.
   */
  private _onListChanged(
    sender: ISharedList<JSONObject>,
    args: ISharedList.IChangedArgs<JSONObject>
  ) {
    const added = new Set<IOutputModel>();
    args.added.forEach(value => {
      if (this._outputMap.has(value)) {
        added.add(this._outputMap.get(value)!);
      } else {
        const item = this._createItem({
          value: value as nbformat.IOutput,
          trusted: this._trusted
        });
        item.changed.connect(this._onGenericChange, this);
        this._outputMap.set(value, item);
        added.add(item);
      }
    });

    // Get the old values before removing them
    const deleted = new Set<IOutputModel>();
    args.deleted.forEach(value => {
      if (this._outputMap.has(value)) {
        const item = this._outputMap.get(value)!;
        item.changed.disconnect(this._onGenericChange, this);
        this._outputMap.delete(value);
        item.dispose();
        deleted.add(item);
      }
    });

    const changes: ISharedList.IChangedArgs<IOutputModel> = {
      added,
      deleted,
      delta: new Array<Delta<Array<IOutputModel>>>()
    };
    args.delta.forEach(delta => {
      if (delta.insert != null) {
        const insertedItems = new Array<IOutputModel>();
        delta.insert.forEach(value => {
          insertedItems.push(this._outputMap.get(value)!);
        });
        changes.delta.push({ insert: insertedItems });
      } else if (delta.delete != null) {
        changes.delta.push({ delete: delta.delete });
      } else if (delta.retain != null) {
        changes.delta.push({ retain: delta.retain });
      }
    });

    this._changed.emit(changes);
  }

  /**
   * Handle a change to an item.
   */
  private _onGenericChange(itemModel: IOutputModel): void {
    let idx: number;
    for (idx = 0; idx < this._sharedList.length; idx++) {
      const value = this._sharedList.get(idx);
      const item = this._outputMap.get(value);
      if (item === itemModel) {
        break;
      }
    }
    this._stateChanged.emit(idx);
  }

  private _lastStream: string;
  private _lastModel: IOutputModel | null;
  private _lastName: 'stdout' | 'stderr';
  private _trusted = false;
  private _isDisposed = false;
  private _sharedList: ISharedList<JSONObject>;
  private _outputMap: Map<JSONObject, IOutputModel>;
  private _stateChanged = new Signal<IOutputAreaModel, number>(this);
  private _changed = new Signal<OutputAreaModel, IOutputAreaModel.ChangedArgs>(this);
}

/**
 * The namespace for OutputAreaModel class statics.
 */
export namespace OutputAreaModel {
  /**
   * The default implementation of a `IModelOutputFactory`.
   */
  export class ContentFactory implements IOutputAreaModel.IContentFactory {
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
  export const defaultContentFactory = new ContentFactory();
}

/**
 * A namespace for module-private functionality.
 */
namespace Private {
  /**
   * Normalize an output.
   */
  export function normalize(value: nbformat.IOutput): void {
    if (nbformat.isStream(value)) {
      if (Array.isArray(value.text)) {
        value.text = (value.text as string[]).join('\n');
      }
    }
  }

  /**
   * Remove characters that are overridden by backspace characters.
   */
  function fixBackspace(txt: string): string {
    let tmp = txt;
    do {
      txt = tmp;
      // Cancel out anything-but-newline followed by backspace
      tmp = txt.replace(/[^\n]\x08/gm, ''); // eslint-disable-line no-control-regex
    } while (tmp.length < txt.length);
    return txt;
  }

  /**
   * Remove chunks that should be overridden by the effect of
   * carriage return characters.
   */
  function fixCarriageReturn(txt: string): string {
    txt = txt.replace(/\r+\n/gm, '\n'); // \r followed by \n --> newline
    while (txt.search(/\r[^$]/g) > -1) {
      const base = txt.match(/^(.*)\r+/m)![1];
      let insert = txt.match(/\r+(.*)$/m)![1];
      insert = insert + base.slice(insert.length, base.length);
      txt = txt.replace(/\r+.*$/m, '\r').replace(/^.*\r/m, insert);
    }
    return txt;
  }

  /*
   * Remove characters overridden by backspaces and carriage returns
   */
  export function removeOverwrittenChars(text: string): string {
    return fixCarriageReturn(fixBackspace(text));
  }
}
