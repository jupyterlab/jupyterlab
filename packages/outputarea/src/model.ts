// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as nbformat from '@jupyterlab/nbformat';
import { IObservableList, ObservableList } from '@jupyterlab/observables';
import { IOutputModel, OutputModel } from '@jupyterlab/rendermime';
import {
  createMutex,
  ISharedDoc,
  ISharedList,
  ISharedMap,
  SharedDoc,
  SharedMap
} from '@jupyterlab/shared-models';
import { each, map, toArray } from '@lumino/algorithm';
import { JSONExt, JSONObject } from '@lumino/coreutils';
import { IDisposable } from '@lumino/disposable';
import { ISignal, Signal } from '@lumino/signaling';

const globalMutex = createMutex();

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

    sharedDoc?: ISharedDoc;

    sharedList?: ISharedList<ISharedMap<JSONObject>>;
  }

  /**
   * A type alias for changed args.
   */
  export type ChangedArgs = IObservableList.IChangedArgs<IOutputModel>;

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

    if (options.sharedDoc && options.sharedList) {
      this._sharedDoc = options.sharedDoc;
      this._sharedList = options.sharedList;
    } else {
      this._sharedDoc = new SharedDoc();
      this._sharedList = this._sharedDoc.createList<ISharedMap<JSONObject>>(
        'outputs'
      );
    }

    this.list = new ObservableList<IOutputModel>();
    if (options.values) {
      // Initialize the shared model
      each(options.values, value => {
        const index = this._add(value) - 1;
        const item = this.list.get(index);
        item.changed.connect(this._onGenericChange, this);
      });
    } else {
      // Shared model initialized by another client
      each(this._sharedList, sharedModel => {
        const newItem = this._createItem({
          trusted: this._trusted,
          sharedModel: sharedModel
        });
        this.list.push(newItem);
        this._changed.emit({
          type: 'add',
          oldIndex: -1,
          newIndex: this.length - 1,
          oldValues: [],
          newValues: [newItem]
        });
      });
    }
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
    for (let i = 0; i < this.list.length; i++) {
      const oldItem = this.list.get(i);
      const value = oldItem.toJSON();
      
      let sharedItem = this._sharedList.get(i);
      sharedItem.dispose();
      oldItem.dispose();

      const sharedModel = new SharedMap<JSONObject>({
        doc: this._sharedDoc as SharedDoc,
        initialize: false
      });
      const newItem = this._createItem({
        value,
        trusted,
        sharedModel: sharedModel
      });
      globalMutex(() => {
        this._sharedList.set(i, sharedModel);
        this.list.set(i, newItem);
      });
      this._changed.emit({
        type: 'set',
        oldIndex: i,
        newIndex: i,
        oldValues: [oldItem],
        newValues: [newItem]
      });
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
    value = JSONExt.deepCopy(value);
    // Normalize stream data.
    Private.normalize(value);
    const sharedModel = new SharedMap<JSONObject>({
      doc: this._sharedDoc as SharedDoc,
      initialize: false
    });
    const oldItem = this.list.get(index);
    const newItem = this._createItem({
      value,
      trusted: this._trusted,
      sharedModel: sharedModel
    });
    globalMutex(() => {
      this._sharedList.set(index, sharedModel);
      this.list.set(index, newItem);
    });
    this._changed.emit({
      type: 'set',
      oldIndex: index,
      newIndex: index,
      oldValues: [oldItem],
      newValues: [newItem]
    });
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
    if (wait) {
      this.clearNext = true;
      return;
    }
    const oldItems: IOutputModel[] = [];
    each(this.list, (item: IOutputModel) => {
      oldItems.push(item);
      item.dispose();
    });
    globalMutex(() => {
      this.list.clear();
      this._sharedList.clear();
    });
    this._changed.emit({
      type: 'remove',
      oldIndex: 0,
      newIndex: 0,
      oldValues: oldItems,
      newValues: []
    });
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
    return toArray(map(this.list, (output: IOutputModel) => output.toJSON()));
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
      value.name === this._lastName &&
      this.shouldCombine({
        value,
        lastModel: this.list.get(this.length - 1)
      })
    ) {
      // In order to get a list change event, we add the previous
      // text to the current item and replace the previous item.
      // This also replaces the metadata of the last item.
      this._lastStream += value.text as string;
      this._lastStream = Private.removeOverwrittenChars(this._lastStream);
      value.text = this._lastStream;

      const index = this.length - 1;
      const sharedPrev = this._sharedList.get(index);
      sharedPrev.dispose();
      const oldItem = this.list.get(index);
      oldItem.dispose();

      const sharedModel = new SharedMap<JSONObject>({
        doc: this._sharedDoc as SharedDoc,
        initialize: false
      });
      const newItem = this._createItem({
        value,
        trusted,
        sharedModel: sharedModel
      });
      globalMutex(() => {
        this._sharedList.set(index, sharedModel);
        this.list.set(index, newItem);
      });
      this._changed.emit({
        type: 'set',
        oldIndex: index,
        newIndex: index,
        oldValues: [oldItem],
        newValues: [newItem]
      });
      return index;
    }

    if (nbformat.isStream(value)) {
      value.text = Private.removeOverwrittenChars(value.text as string);
    }

    // Update the stream information.
    if (nbformat.isStream(value)) {
      this._lastStream = value.text as string;
      this._lastName = value.name;
    } else {
      this._lastStream = '';
    }

    // Create the new item.
    const sharedModel = new SharedMap<JSONObject>({
      doc: this._sharedDoc as SharedDoc,
      initialize: false
    });
    const newItem = this._createItem({
      value,
      trusted,
      sharedModel: sharedModel
    });

    // Add the item to our list and return the new length.
    globalMutex(() => {
      this._sharedList.push(sharedModel);
      this.list.push(newItem);
    });
    this._changed.emit({
      type: 'add',
      oldIndex: -1,
      newIndex: this.length - 1,
      oldValues: [],
      newValues: [newItem]
    });
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
   * An observable list containing the output models
   * for this output area.
   */
  protected list: IObservableList<IOutputModel>;

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
    sender: ISharedList<ISharedMap<JSONObject>>,
    args: ISharedList.IChangedArgs<ISharedMap<JSONObject>>
  ) {
    globalMutex(() => {
      const oldValues: IOutputModel[] = [];
      const newValues: IOutputModel[] = [];

      if (args.type === 'set') {
        args.newValues.forEach(sharedModel => {
          const item = this._createItem({
            trusted: this._trusted,
            sharedModel: sharedModel
          });
          const index = args.newIndex;
          const oldItem = this.list.get(index)
          oldValues.push(oldItem);
          oldItem.changed.disconnect(this._onGenericChange, this);
          newValues.push(item);
          this.list.set(index, item);
          item.changed.connect(this._onGenericChange, this);
        });
      } else if (args.type === 'add') {
        args.newValues.forEach(sharedModel => {
          const item = this._createItem({
            trusted: this._trusted,
            sharedModel: sharedModel
          });
          newValues.push(item);
          this.list.push(item);
          item.changed.connect(this._onGenericChange, this);
        });
      } else if (args.type === 'move') {
        const fromIndex = args.oldIndex;
        const toIndex = args.newIndex;
        const item = this.list.get(fromIndex);
        oldValues.push(item);
        newValues.push(item);
        this.list.move(fromIndex, toIndex);
      } else if (args.type === 'remove') {
        const startIndex = args.oldIndex;
        const endIndex = startIndex + args.oldValues.length;
        for (let i = args.oldIndex; i < endIndex; i++) {
          const item = this.list.get(i);
          item.dispose();
          oldValues.push(item);
          item.changed.disconnect(this._onGenericChange, this);
        }
        this.list.removeRange(startIndex, endIndex);
      }

      this._changed.emit({
        type: args.type,
        oldIndex: args.oldIndex,
        newIndex: args.newIndex,
        oldValues,
        newValues
      });
    });
  }

  /**
   * Handle a change to an item.
   */
  private _onGenericChange(itemModel: IOutputModel): void {
    let idx: number;
    for (idx = 0; idx < this.list.length; idx++) {
      const item = this.list.get(idx);
      if (item === itemModel) {
        break;
      }
    }
    this._stateChanged.emit(idx);
  }

  private _lastStream = '';
  private _lastName: 'stdout' | 'stderr';
  private _trusted = false;
  private _isDisposed = false;
  private _sharedDoc: ISharedDoc;
  private _sharedList: ISharedList<ISharedMap<JSONObject>>;
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
