// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as Y from 'yjs';

import { each, map, toArray } from '@lumino/algorithm';

import { IDisposable } from '@lumino/disposable';

import { ISignal, Signal } from '@lumino/signaling';

import * as nbformat from '@jupyterlab/nbformat';

import { IOutputModel, OutputModel } from '@jupyterlab/rendermime';
import { JSONExt } from '@lumino/coreutils';

/**
 * This is a custom event that is fired when the output model is modified.
 * If items were added or deleted, then `delta` (a Yjs delta) describes the added & removed items.
 * If items were updated (attributes were modified), then Array contains the indexed of all items that were updated
 */
export interface IOutputAreaEvent {
  readonly delta: Array<any>;
  readonly updated: Array<number>;
}

/**
 * The model for an output area.
 */
export interface IOutputAreaModel extends IDisposable {
  /**
   * A signal emitted when the model state changes.
   */
  readonly stateChanged: ISignal<IOutputAreaModel, void>;

  /**
   * A signal emitted when the model changes.
   */
  readonly changed: ISignal<IOutputAreaModel, IOutputAreaEvent>;

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
    ymodel: Y.Array<any>;
  }

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
  constructor(options: IOutputAreaModel.IOptions) {
    this._trusted = !!options.trusted;
    this.contentFactory =
      options.contentFactory || OutputAreaModel.defaultContentFactory;
    this.ymodel = options.ymodel;
    if (options.values) {
      each(options.values, value => {
        this._add(value);
      });
    }
    this.outputModels = this.ymodel
      .toArray()
      .map(ymap => this._createItem({ ymodel: ymap }));
    this._onGenericChange = this._onGenericChange.bind(this);
    this.ymodel.observeDeep(this._onGenericChange);
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
  get changed(): ISignal<this, IOutputAreaEvent> {
    return this._changed;
  }

  /**
   * Get the length of the items in the model.
   */
  get length(): number {
    return this.ymodel.length;
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
    // Set the trusted property on all output models.
    // Do this in a single transaction to reduce the number of event calls.
    this.ymodel.doc!.transact(() => {
      this.outputModels.forEach(item => {
        item.trusted = trusted;
      });
    });
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
    this.ymodel.unobserveDeep(this._onGenericChange);
    Signal.clearData(this);
  }

  /**
   * Get an item at the specified index.
   */
  get(index: number): IOutputModel {
    return this.outputModels[index];
  }

  /**
   * Set the value at the specified index.
   */
  set(index: number, value: nbformat.IOutput): void {
    value.value = JSONExt.deepCopy(value);
    // Normalize stream data.
    Private.normalize(value);
    const item = this.get(index);
    item.reinitialize(value, this._trusted);
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
    this.ymodel.delete(0, this.ymodel.length); // @todo call .dispose on all deleted items
  }

  /**
   * Deserialize the model from JSON.
   *
   * #### Notes
   * This will clear any existing data.
   */
  fromJSON(values: nbformat.IOutput[]): void {
    this.ymodel.doc!.transact(() => {
      this.clear();
      each(values, value => {
        this._add(value);
      });
    });
  }

  /**
   * Serialize the model to JSON.
   */
  toJSON(): nbformat.IOutput[] {
    return toArray(map(this.outputModels, output => output.toJSON()));
  }

  /**
   * Add a copy of the item to the list.
   */
  private _add(value: nbformat.IOutput): number {
    const trusted = this._trusted;
    value = JSONExt.deepCopy(value);

    // Normalize the value.
    Private.normalize(value);

    const lastModel = this.length === 0 ? null : this.get(this.length - 1);

    // Consolidate outputs if they are stream outputs of the same kind.
    if (
      nbformat.isStream(value) &&
      this._lastStream &&
      value.name === this._lastName &&
      this.shouldCombine({
        value,
        lastModel: lastModel!
      })
    ) {
      // In order to get a list change event, we add the previous
      // text to the current item and replace the previous item.
      // This also replaces the metadata of the last item.
      this._lastStream += value.text as string;
      this._lastStream = Private.removeOverwrittenChars(this._lastStream);
      value.text = this._lastStream;
      lastModel!.reinitialize(value, trusted);
      return this.ymodel.length;
    }

    if (nbformat.isStream(value)) {
      value.text = Private.removeOverwrittenChars(value.text as string);
    }

    // Create the new item.
    const yItemModel = new Y.Map();
    const item = this._createItem({ ymodel: yItemModel, value, trusted });
    // dispose of item, we are going to add it automatically in the listChanged event (this also handles remote events)
    item.dispose();

    // Update the stream information.
    if (nbformat.isStream(value)) {
      this._lastStream = value.text as string;
      this._lastName = value.name;
    } else {
      this._lastStream = '';
    }

    // Add the item to our list and return the new length.
    this.ymodel.push([yItemModel]);
    return this.ymodel.length;
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
   * Handle a change to an item.
   */
  private _onGenericChange(events: Array<Y.YEvent>, tr: Y.Transaction): void {
    // find the YArrayEvent on `this.model` if possible
    const yarrayEvent = events.find(event => event.target === this.ymodel);
    // replace the `delta.insert` content with the actual inserted models
    const _delta = yarrayEvent ? yarrayEvent.changes.delta : []; // otherwise no items were added or removed
    const delta = [];
    for (let i = 0, currIndex = 0; i < _delta.length; i++) {
      const d = _delta[i] as any;
      if (d.insert != null) {
        const insert = d.insert.map((outputYModel: Y.Map<any>) =>
          this._createItem({ ymodel: outputYModel })
        );
        this.outputModels.splice(currIndex, 0, ...insert);
        delta.push({ insert });
        currIndex += d.insert.length;
      } else if (d.retain != null) {
        delta.push(d);
        currIndex += d.retain;
      } else {
        // it is a d.delete op
        this.outputModels.splice(currIndex, d.delete);
        delta.push(d);
      }
    }

    // find the updated items and store their indexes in `updated`
    const updated = [] as Array<number>;
    this.ymodel.forEach((child, index) => {
      if (tr.changedParentTypes.has(child)) {
        updated.push(index);
      }
    });
    this._changed.emit({ delta, updated });
    this._stateChanged.emit(void 0);
  }

  /**
   * An observable list containing the output models
   * for this output area.
   */
  protected ymodel: Y.Array<Y.Map<any>>;
  /**
   * Instances of the generated output children.
   */
  protected outputModels: IOutputModel[];
  private _lastStream: string;
  private _lastName: 'stdout' | 'stderr';
  private _trusted = false;
  private _isDisposed = false;
  private _stateChanged = new Signal<IOutputAreaModel, void>(this);
  private _changed = new Signal<this, IOutputAreaEvent>(this);
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
