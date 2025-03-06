// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as nbformat from '@jupyterlab/nbformat';
import {
  IObservableList,
  IObservableString,
  ObservableList
} from '@jupyterlab/observables';
import { IOutputModel, OutputModel } from '@jupyterlab/rendermime';
import { map } from '@lumino/algorithm';
import { JSONExt } from '@lumino/coreutils';
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

  removeStreamOutput(number: number): void;

  appendStreamOutput(text: string): void;

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
   * Remove an output at a given index.
   */
  remove(index: number): void;

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
    this.list = new ObservableList<IOutputModel>();
    if (options.values) {
      for (const value of options.values) {
        const index = this._add(value) - 1;
        const item = this.list.get(index);
        item.changed.connect(this._onGenericChange, this);
      }
    }
    this.list.changed.connect(this._onListChanged, this);
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
    const trusted = (this._trusted = value);
    for (let i = 0; i < this.list.length; i++) {
      const oldItem = this.list.get(i);
      const value = oldItem.toJSON();
      const item = this._createItem({ value, trusted });
      this.list.set(i, item);
      oldItem.dispose();
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
    value = JSONExt.deepCopy(value);
    // Normalize stream data.
    Private.normalize(value);
    const item = this._createItem({ value, trusted: this._trusted });
    this.list.set(index, item);
  }

  removeStreamOutput(number: number): void {
    const prev = this.list.get(this.length - 1) as IOutputModel;
    const curText = prev.streamText!;
    const length = curText.text.length;
    const options = { silent: true };
    curText.remove(length - number, length, options);
  }

  appendStreamOutput(text: string): void {
    const prev = this.list.get(this.length - 1) as IOutputModel;
    const curText = prev.streamText!;
    const length = curText.text.length;
    const options = { silent: true };
    curText.insert(length, text, options);
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
   * Remove an output at a given index.
   */
  remove(index: number): void {
    this.list.remove(index)?.dispose();
  }

  /**
   * Clear all of the output.
   *
   * @param wait Delay clearing the output until the next message is added.
   */
  clear(wait: boolean = false): void {
    this._lastStreamName = '';
    if (wait) {
      this.clearNext = true;
      return;
    }
    for (const item of this.list) {
      item.dispose();
    }
    this.list.clear();
  }

  /**
   * Deserialize the model from JSON.
   *
   * #### Notes
   * This will clear any existing data.
   */
  fromJSON(values: nbformat.IOutput[]): void {
    this.clear();
    for (const value of values) {
      this._add(value);
    }
  }

  /**
   * Serialize the model to JSON.
   */
  toJSON(): nbformat.IOutput[] {
    return Array.from(
      map(this.list, (output: IOutputModel) => output.toJSON())
    );
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
      value.name === this._lastStreamName &&
      this.length > 0 &&
      this.shouldCombine({
        value,
        lastModel: this.list.get(this.length - 1)
      })
    ) {
      // We append the new text to the current text.
      // This creates a text change event.
      const prev = this.list.get(this.length - 1) as IOutputModel;
      const curText = prev.streamText!;
      const newText =
        typeof value.text === 'string' ? value.text : value.text.join('');
      this._streamIndex = Private.addText(this._streamIndex, curText, newText);
      return this.length;
    }

    if (nbformat.isStream(value)) {
      if (typeof value.text !== 'string') {
        value.text = value.text.join('');
      }
      const { text, index } = Private.processText(0, value.text);
      this._streamIndex = index;
      value.text = text;
    }

    // Create the new item.
    const item = this._createItem({ value, trusted });

    // Add the item to our list and return the new length.
    const length = this.list.push(item);

    // Update the stream information.
    if (nbformat.isStream(value)) {
      this._lastStreamName = value.name;
    } else {
      this._lastStreamName = '';
    }

    return length;
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
    sender: IObservableList<IOutputModel>,
    args: IObservableList.IChangedArgs<IOutputModel>
  ) {
    switch (args.type) {
      case 'add':
        args.newValues.forEach(item => {
          item.changed.connect(this._onGenericChange, this);
        });
        break;
      case 'remove':
        args.oldValues.forEach(item => {
          item.changed.disconnect(this._onGenericChange, this);
        });
        break;
      case 'set':
        args.newValues.forEach(item => {
          item.changed.connect(this._onGenericChange, this);
        });
        args.oldValues.forEach(item => {
          item.changed.disconnect(this._onGenericChange, this);
        });
        break;
    }
    this._changed.emit(args);
  }

  /**
   * Handle a change to an item.
   */
  private _onGenericChange(itemModel: IOutputModel): void {
    let idx: number;
    let item: IOutputModel | null = null;
    for (idx = 0; idx < this.list.length; idx++) {
      item = this.list.get(idx);
      if (item === itemModel) {
        break;
      }
    }
    if (item != null) {
      this._stateChanged.emit(idx);
      this._changed.emit({
        type: 'set',
        newIndex: idx,
        oldIndex: idx,
        oldValues: [item],
        newValues: [item]
      });
    }
  }

  private _lastStreamName: '' | 'stdout' | 'stderr' = '';
  private _trusted = false;
  private _isDisposed = false;
  private _stateChanged = new Signal<OutputAreaModel, number>(this);
  private _changed = new Signal<OutputAreaModel, IOutputAreaModel.ChangedArgs>(
    this
  );
  private _streamIndex = 0;
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
   * Like `indexOf` but allowing to use a regular expression.
   */
  function indexOfAny(text: string, re: RegExp, i: number): number {
    const index = text.slice(i).search(re);
    return index >= 0 ? index + i : index;
  }

  /*
   * Handle backspaces in `newText` and concatenates to `text`, if any.
   */
  export function processText(
    index: number,
    newText: string,
    text?: string
  ): { text: string; index: number } {
    if (text === undefined) {
      text = '';
    }
    if (
      !(
        newText.includes('\b') ||
        newText.includes('\r') ||
        newText.includes('\n')
      )
    ) {
      text =
        text.slice(0, index) + newText + text.slice(index + newText.length);
      return { text, index: index + newText.length };
    }
    let idx0 = index;
    let idx1: number = -1;
    let lastEnd: number = 0;
    const regex = /[\n\b\r]/;
    // TODO: once we upgrade eslint to 9.1.0 we can toggle `allExceptWhileTrue`
    // option and remove the ignore rule below.
    // eslint-disable-next-line no-constant-condition
    while (true) {
      idx1 = indexOfAny(newText, regex, lastEnd);

      // Insert characters at current position.
      const prefix = newText.slice(
        lastEnd,
        idx1 === -1 ? newText.length : idx1
      );
      text = text.slice(0, idx0) + prefix + text.slice(idx0 + prefix.length);
      lastEnd = idx1 + 1;
      idx0 += prefix.length;

      if (idx1 === -1) {
        break;
      }

      const newChar = newText[idx1];
      if (newChar === '\b') {
        // Backspace: delete previous character if there is one and if it's not a line feed.
        if (idx0 > 0 && text[idx0 - 1] !== '\n') {
          text = text.slice(0, idx0 - 1) + text.slice(idx0 + 1);
          idx0--;
        }
      } else if (newChar === '\r') {
        // Carriage return: go back to beginning of line.
        let done = false;
        while (!done) {
          if (idx0 === 0) {
            done = true;
          } else if (text[idx0 - 1] === '\n') {
            done = true;
          } else {
            idx0--;
          }
        }
      } else if (newChar === '\n') {
        // Insert new line at end of text.
        text = text + '\n';
        idx0 = text.length;
      } else {
        throw Error(`This should not happen`);
      }
    }
    return { text, index: idx0 };
  }

  /*
   * Concatenate a string to an observable string, handling backspaces.
   */
  export function addText(
    prevIndex: number,
    curText: IObservableString,
    newText: string
  ): number {
    const { text, index } = processText(prevIndex, newText, curText.text);
    // Compute the difference between current text and new text.
    let done = false;
    let idx = 0;
    while (!done) {
      if (idx === text.length) {
        if (idx === curText.text.length) {
          done = true;
        } else {
          curText.remove(idx, curText.text.length);
          done = true;
        }
      } else if (idx === curText.text.length) {
        if (idx !== text.length) {
          curText.insert(curText.text.length, text.slice(idx));
          done = true;
        }
      } else if (text[idx] !== curText.text[idx]) {
        curText.remove(idx, curText.text.length);
        curText.insert(idx, text.slice(idx));
        done = true;
      } else {
        idx++;
      }
    }
    return index;
  }
}
