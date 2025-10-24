// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ArrayExt } from '@lumino/algorithm';
import { IDisposable } from '@lumino/disposable';
import { ISignal, Signal } from '@lumino/signaling';

/**
 * A list which can be observed for changes.
 */
export interface IObservableList<T> extends IDisposable, Iterable<T> {
  /**
   * A signal emitted when the list has changed.
   */
  readonly changed: ISignal<this, IObservableList.IChangedArgs<T>>;

  /**
   * The type of this object.
   */
  readonly type: 'List';

  /**
   * The length of the list.
   *
   * #### Notes
   * This is a read-only property.
   */
  length: number;

  /**
   * Remove all values from the list.
   *
   * #### Complexity
   * Linear.
   *
   * #### Iterator Validity
   * All current iterators are invalidated.
   */
  clear(): void;

  /**
   * Get the value at the specified index.
   *
   * @param index - The positive integer index of interest.
   *
   * @returns The value at the specified index.
   *
   * #### Undefined Behavior
   * An `index` which is non-integral or out of range.
   */
  get(index: number): T;

  /**
   * Insert a value into the list at a specific index.
   *
   * @param index - The index at which to insert the value.
   *
   * @param value - The value to set at the specified index.
   *
   * #### Complexity
   * Linear.
   *
   * #### Iterator Validity
   * No changes.
   *
   * #### Notes
   * The `index` will be clamped to the bounds of the list.
   *
   * #### Undefined Behavior
   * An `index` which is non-integral.
   */
  insert(index: number, value: T): void;

  /**
   * Insert a set of items into the list at the specified index.
   *
   * @param index - The index at which to insert the values.
   *
   * @param values - The values to insert at the specified index.
   *
   * #### Complexity.
   * Linear.
   *
   * #### Iterator Validity
   * No changes.
   *
   * #### Notes
   * The `index` will be clamped to the bounds of the list.
   *
   * #### Undefined Behavior.
   * An `index` which is non-integral.
   */
  insertAll(index: number, values: Iterable<T>): void;

  /**
   * Move a value from one index to another.
   *
   * @param fromIndex - The index of the element to move.
   *
   * @param toIndex - The index to move the element to.
   *
   * #### Complexity
   * Constant.
   *
   * #### Iterator Validity
   * Iterators pointing at the lesser of the `fromIndex` and the `toIndex`
   * and beyond are invalidated.
   *
   * #### Undefined Behavior
   * A `fromIndex` or a `toIndex` which is non-integral.
   */
  move(fromIndex: number, toIndex: number): void;

  /**
   * Add a value to the back of the list.
   *
   * @param value - The value to add to the back of the list.
   *
   * @returns The new length of the list.
   *
   * #### Complexity
   * Constant.
   *
   * #### Iterator Validity
   * No changes.
   */
  push(value: T): number;

  /**
   * Push a set of values to the back of the list.
   *
   * @param values - An iterable set of values to add.
   *
   * @returns The new length of the list.
   *
   * #### Complexity
   * Linear.
   *
   * #### Iterator Validity
   * No changes.
   */
  pushAll(values: Iterable<T>): number;

  /**
   * Remove and return the value at a specific index.
   *
   * @param index - The index of the value of interest.
   *
   * @returns The value at the specified index, or `undefined` if the
   *   index is out of range.
   *
   * #### Complexity
   * Constant.
   *
   * #### Iterator Validity
   * Iterators pointing at the removed value and beyond are invalidated.
   *
   * #### Undefined Behavior
   * An `index` which is non-integral.
   */
  remove(index: number): T | undefined;

  /**
   * Remove a range of items from the list.
   *
   * @param startIndex - The start index of the range to remove (inclusive).
   *
   * @param endIndex - The end index of the range to remove (exclusive).
   *
   * @returns The new length of the list.
   *
   * #### Complexity
   * Linear.
   *
   * #### Iterator Validity
   * Iterators pointing to the first removed value and beyond are invalid.
   *
   * #### Undefined Behavior
   * A `startIndex` or `endIndex` which is non-integral.
   */
  removeRange(startIndex: number, endIndex: number): number;

  /**
   * Remove the first occurrence of a value from the list.
   *
   * @param value - The value of interest.
   *
   * @returns The index of the removed value, or `-1` if the value
   *   is not contained in the list.
   *
   * #### Complexity
   * Linear.
   *
   * #### Iterator Validity
   * Iterators pointing at the removed value and beyond are invalidated.
   */
  removeValue(value: T): number;

  /**
   * Set the value at the specified index.
   *
   * @param index - The positive integer index of interest.
   *
   * @param value - The value to set at the specified index.
   *
   * #### Complexity
   * Constant.
   *
   * #### Iterator Validity
   * No changes.
   *
   * #### Undefined Behavior
   * An `index` which is non-integral or out of range.
   */
  set(index: number, value: T): void;
}

/**
 * The namespace for IObservableList related interfaces.
 */
export namespace IObservableList {
  /**
   * The change types which occur on an observable list.
   */
  export type ChangeType =
    /**
     * Item(s) were added to the list.
     */
    | 'add'

    /**
     * An item was moved within the list.
     */
    | 'move'

    /**
     * Item(s) were removed from the list.
     */
    | 'remove'

    /**
     * An item was set in the list.
     */
    | 'set'

    /**
     * The list was cleared.
     */
    | 'clear';

  /**
   * The changed args object which is emitted by an observable list.
   */
  export interface IChangedArgs<T> {
    /**
     * The type of change undergone by the vector.
     */
    type: ChangeType;

    /**
     * The new index associated with the change.
     */
    newIndex: number;

    /**
     * The new values associated with the change.
     *
     * #### Notes
     * The values will be contiguous starting at the `newIndex`.
     */
    newValues: T[];

    /**
     * The old index associated with the change.
     */
    oldIndex: number;

    /**
     * The old values associated with the change.
     *
     * #### Notes
     * The values will be contiguous starting at the `oldIndex`.
     */
    oldValues: T[];
  }
}

/**
 * A concrete implementation of [[IObservableList]].
 */
export class ObservableList<T> implements IObservableList<T> {
  /**
   * Construct a new observable map.
   */
  constructor(options: ObservableList.IOptions<T> = {}) {
    if (options.values) {
      for (const value of options.values) {
        this._array.push(value);
      }
    }
    this._itemCmp = options.itemCmp || Private.itemCmp;
  }

  /**
   * The type of this object.
   */
  get type(): 'List' {
    return 'List';
  }

  /**
   * A signal emitted when the list has changed.
   */
  get changed(): ISignal<this, IObservableList.IChangedArgs<T>> {
    return this._changed;
  }

  /**
   * The length of the list.
   */
  get length(): number {
    return this._array.length;
  }

  /**
   * Test whether the list has been disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Dispose of the resources held by the list.
   */
  dispose(): void {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    Signal.clearData(this);
    this.clear();
  }

  /**
   * Create an iterator over the values in the list.
   *
   * @returns A new iterator starting at the front of the list.
   *
   * #### Complexity
   * Constant.
   *
   * #### Iterator Validity
   * No changes.
   */
  [Symbol.iterator](): IterableIterator<T> {
    return this._array[Symbol.iterator]();
  }

  /**
   * Get the value at the specified index.
   *
   * @param index - The positive integer index of interest.
   *
   * @returns The value at the specified index.
   *
   * #### Undefined Behavior
   * An `index` which is non-integral or out of range.
   */
  get(index: number): T {
    return this._array[index];
  }

  /**
   * Set the value at the specified index.
   *
   * @param index - The positive integer index of interest.
   *
   * @param value - The value to set at the specified index.
   *
   * #### Complexity
   * Constant.
   *
   * #### Iterator Validity
   * No changes.
   *
   * #### Undefined Behavior
   * An `index` which is non-integral or out of range.
   */
  set(index: number, value: T): void {
    const oldValue = this._array[index];
    if (value === undefined) {
      throw new Error('Cannot set an undefined item');
    }
    // Bail if the value does not change.
    const itemCmp = this._itemCmp;
    if (itemCmp(oldValue, value)) {
      return;
    }
    this._array[index] = value;
    this._changed.emit({
      type: 'set',
      oldIndex: index,
      newIndex: index,
      oldValues: [oldValue],
      newValues: [value]
    });
  }

  /**
   * Add a value to the end of the list.
   *
   * @param value - The value to add to the end of the list.
   *
   * @returns The new length of the list.
   *
   * #### Complexity
   * Constant.
   *
   * #### Notes
   * By convention, the oldIndex is set to -1 to indicate
   * an push operation.
   *
   * #### Iterator Validity
   * No changes.
   */
  push(value: T): number {
    const num = this._array.push(value);
    this._changed.emit({
      type: 'add',
      oldIndex: -1,
      newIndex: this.length - 1,
      oldValues: [],
      newValues: [value]
    });
    return num;
  }

  /**
   * Insert a value into the list at a specific index.
   *
   * @param index - The index at which to insert the value.
   *
   * @param value - The value to set at the specified index.
   *
   * #### Complexity
   * Linear.
   *
   * #### Iterator Validity
   * No changes.
   *
   * #### Notes
   * The `index` will be clamped to the bounds of the list.
   *
   * By convention, the oldIndex is set to -2 to indicate
   * an insert operation.
   *
   * The value -2 as oldIndex can be used to distinguish from the push
   * method which will use a value -1.
   *
   * #### Undefined Behavior
   * An `index` which is non-integral.
   */
  insert(index: number, value: T): void {
    if (index === this._array.length) {
      this._array.push(value);
    } else {
      ArrayExt.insert(this._array, index, value);
    }
    this._changed.emit({
      type: 'add',
      oldIndex: -2,
      newIndex: index,
      oldValues: [],
      newValues: [value]
    });
  }

  /**
   * Remove the first occurrence of a value from the list.
   *
   * @param value - The value of interest.
   *
   * @returns The index of the removed value, or `-1` if the value
   *   is not contained in the list.
   *
   * #### Complexity
   * Linear.
   *
   * #### Iterator Validity
   * Iterators pointing at the removed value and beyond are invalidated.
   */
  removeValue(value: T): number {
    const itemCmp = this._itemCmp;
    const index = ArrayExt.findFirstIndex(this._array, item => {
      return itemCmp(item, value);
    });
    if (index < 0) return index;
    this.remove(index);
    return index;
  }

  /**
   * Remove and return the value at a specific index.
   *
   * @param index - The index of the value of interest.
   *
   * @returns The value at the specified index, or `undefined` if the
   *   index is out of range.
   *
   * #### Complexity
   * Constant.
   *
   * #### Iterator Validity
   * Iterators pointing at the removed value and beyond are invalidated.
   *
   * #### Undefined Behavior
   * An `index` which is non-integral.
   */
  remove(index: number): T | undefined {
    const value = ArrayExt.removeAt(this._array, index);
    if (value === undefined) {
      return;
    }
    this._changed.emit({
      type: 'remove',
      oldIndex: index,
      newIndex: -1,
      newValues: [],
      oldValues: [value]
    });
    return value;
  }

  /**
   * Remove all values from the list.
   *
   * #### Complexity
   * Linear.
   *
   * #### Iterator Validity
   * All current iterators are invalidated.
   */
  clear(): void {
    const copy = this._array.slice();
    this._array.length = 0;
    this._changed.emit({
      type: 'clear',
      oldIndex: 0,
      newIndex: 0,
      newValues: [],
      oldValues: copy
    });
  }

  /**
   * Move a value from one index to another.
   *
   * @param fromIndex - The index of the element to move.
   *
   * @param toIndex - The index to move the element to.
   *
   * #### Complexity
   * Constant.
   *
   * #### Iterator Validity
   * Iterators pointing at the lesser of the `fromIndex` and the `toIndex`
   * and beyond are invalidated.
   *
   * #### Undefined Behavior
   * A `fromIndex` or a `toIndex` which is non-integral.
   */
  move(fromIndex: number, toIndex: number): void {
    if (this.length <= 1 || fromIndex === toIndex) {
      return;
    }
    const values = [this._array[fromIndex]];
    ArrayExt.move(this._array, fromIndex, toIndex);
    this._changed.emit({
      type: 'move',
      oldIndex: fromIndex,
      newIndex: toIndex,
      oldValues: values,
      newValues: values
    });
  }

  /**
   * Push a set of values to the back of the list.
   *
   * @param values - An iterable set of values to add.
   *
   * @returns The new length of the list.
   *
   * #### Complexity
   * Linear.
   *
   * #### Notes
   * By convention, the oldIndex is set to -1 to indicate
   * an push operation.
   *
   * #### Iterator Validity
   * No changes.
   */
  pushAll(values: Iterable<T>): number {
    const newIndex = this.length;
    for (const value of values) {
      this._array.push(value);
    }
    this._changed.emit({
      type: 'add',
      oldIndex: -1,
      newIndex,
      oldValues: [],
      newValues: Array.from(values)
    });
    return this.length;
  }

  /**
   * Insert a set of items into the list at the specified index.
   *
   * @param index - The index at which to insert the values.
   *
   * @param values - The values to insert at the specified index.
   *
   * #### Complexity.
   * Linear.
   *
   * #### Iterator Validity
   * No changes.
   *
   * #### Notes
   * The `index` will be clamped to the bounds of the list.
   * By convention, the oldIndex is set to -2 to indicate
   * an insert operation.
   *
   * #### Undefined Behavior.
   * An `index` which is non-integral.
   */
  insertAll(index: number, values: Iterable<T>): void {
    const newIndex = index;
    for (const value of values) {
      ArrayExt.insert(this._array, index++, value);
    }
    this._changed.emit({
      type: 'add',
      oldIndex: -2,
      newIndex,
      oldValues: [],
      newValues: Array.from(values)
    });
  }

  /**
   * Remove a range of items from the list.
   *
   * @param startIndex - The start index of the range to remove (inclusive).
   *
   * @param endIndex - The end index of the range to remove (exclusive).
   *
   * @returns The new length of the list.
   *
   * #### Complexity
   * Linear.
   *
   * #### Iterator Validity
   * Iterators pointing to the first removed value and beyond are invalid.
   *
   * #### Undefined Behavior
   * A `startIndex` or `endIndex` which is non-integral.
   */
  removeRange(startIndex: number, endIndex: number): number {
    const oldValues = this._array.slice(startIndex, endIndex);
    for (let i = startIndex; i < endIndex; i++) {
      ArrayExt.removeAt(this._array, startIndex);
    }
    this._changed.emit({
      type: 'remove',
      oldIndex: startIndex,
      newIndex: -1,
      oldValues,
      newValues: []
    });
    return this.length;
  }

  private _array: Array<T> = [];
  private _isDisposed = false;
  private _itemCmp: (first: T, second: T) => boolean;
  private _changed = new Signal<this, IObservableList.IChangedArgs<T>>(this);
}

/**
 * The namespace for `ObservableList` class statics.
 */
export namespace ObservableList {
  /**
   * The options used to initialize an observable map.
   */
  export interface IOptions<T> {
    /**
     * An optional initial set of values.
     */
    values?: Iterable<T>;

    /**
     * The item comparison function for change detection on `set`.
     *
     * If not given, strict `===` equality will be used.
     */
    itemCmp?: (first: T, second: T) => boolean;
  }
}

/**
 * The namespace for module private data.
 */
namespace Private {
  /**
   * The default strict equality item cmp.
   */
  export function itemCmp<T>(first: T, second: T): boolean {
    return first === second;
  }
}
