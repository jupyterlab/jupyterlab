// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IObservableList } from '@jupyterlab/observables';

import {
  ArrayExt,
  ArrayIterator,
  IIterator,
  IterableOrArrayLike,
  retro,
  toArray,
  each
} from '@phosphor/algorithm';

import { ReadonlyJSONValue } from '@phosphor/coreutils';

import { ListField, Datastore, Schema } from '@phosphor/datastore';

import { ISignal, Signal } from '@phosphor/signaling';

import { ObservableBase } from './base';

/**
 * A concrete implementation of [[IObservableList]].
 */
export class ObservableList<T extends ReadonlyJSONValue>
  extends ObservableBase<ListField.Change<T>>
  implements IObservableList<T> {
  /**
   * Construct a new observable list.
   */
  constructor(
    datastore: Promise<Datastore>,
    schema: Schema,
    recordId: string,
    fieldId: string,
    options: ObservableList.IOptions<T> = {}
  ) {
    super(datastore, schema, recordId, fieldId);
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
  iter(): IIterator<T> {
    return new ArrayIterator(this._array);
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
  get(index: number): T | undefined {
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
    let oldValue = this._array[index];
    if (value === undefined) {
      throw new Error('Cannot set an undefined item');
    }
    // Bail if the value does not change.
    let itemCmp = this._itemCmp;
    if (itemCmp(oldValue, value)) {
      return;
    }

    const table = this.ds!.get(this.schema);
    this.ds!.beginTransaction();
    try {
      table.update({
        [this.recordID]: {
          [this.fieldId]: {
            index,
            remove: 1,
            values: [value]
          }
        }
      } as any);
    } finally {
      this.ds!.endTransaction();
    }
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
   * #### Iterator Validity
   * No changes.
   */
  push(value: T): number {
    let current = this._array;
    const table = this.ds!.get(this.schema);
    this.ds!.beginTransaction();
    try {
      table.update({
        [this.recordID]: {
          [this.fieldId]: {
            index: current.length,
            remove: 0,
            values: [value]
          }
        }
      } as any);
    } finally {
      this.ds!.endTransaction();
    }
    return current.length + 1;
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
   * #### Undefined Behavior
   * An `index` which is non-integral.
   */
  insert(index: number, value: T): void {
    this.ensureBackend();
    const table = this.ds!.get(this.schema);
    this.ds!.beginTransaction();
    try {
      table.update({
        [this.recordID]: {
          [this.fieldId]: {
            index,
            remove: 0,
            values: [value]
          }
        }
      } as any);
    } finally {
      this.ds!.endTransaction();
    }
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
    let itemCmp = this._itemCmp;
    let index = ArrayExt.findFirstIndex(this._array, item => {
      return itemCmp(item, value);
    });
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
    if (index < 0 || index >= this.length) {
      return;
    }
    const table = this.ds!.get(this.schema);
    this.ds!.beginTransaction();
    try {
      table.update({
        [this.recordID]: {
          [this.fieldId]: {
            index,
            remove: 1,
            values: []
          }
        }
      } as any);
    } finally {
      this.ds!.endTransaction();
    }
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
    this.ensureBackend();
    const table = this.ds!.get(this.schema);
    this.ds!.beginTransaction();
    try {
      table.update({
        [this.recordID]: {
          [this.fieldId]: {
            index: 0,
            remove: this.length,
            values: []
          }
        }
      } as any);
    } finally {
      this.ds!.endTransaction();
    }
  }

  /**
   * Move a value from one index to another.
   *
   * @parm fromIndex - The index of the element to move.
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
    const array = this._array;
    let n = array.length;
    if (n <= 1) {
      return;
    }
    if (fromIndex < 0) {
      fromIndex = Math.max(0, fromIndex + n);
    } else {
      fromIndex = Math.min(fromIndex, n - 1);
    }
    if (toIndex < 0) {
      toIndex = Math.max(0, toIndex + n);
    } else {
      toIndex = Math.min(toIndex, n - 1);
    }
    if (fromIndex === toIndex) {
      return;
    }

    const table = this.ds!.get(this.schema);
    this.ds!.beginTransaction();
    try {
      table.update({
        [this.recordID]: {
          [this.fieldId]: [
            {
              index: fromIndex,
              remove: 1,
              values: []
            },
            {
              index: toIndex,
              remove: 0,
              values: [array[fromIndex]]
            }
          ]
        }
      } as any);
    } finally {
      this.ds!.endTransaction();
    }
  }

  /**
   * Push a set of values to the back of the list.
   *
   * @param values - An iterable or array-like set of values to add.
   *
   * @returns The new length of the list.
   *
   * #### Complexity
   * Linear.
   *
   * #### Iterator Validity
   * No changes.
   */
  pushAll(values: IterableOrArrayLike<T>): number {
    let length = this.length;
    const table = this.ds!.get(this.schema);
    this.ds!.beginTransaction();
    const newValues = toArray(values);
    try {
      table.update({
        [this.recordID]: {
          [this.fieldId]: {
            index: length,
            remove: 0,
            values: newValues
          }
        }
      } as any);
    } finally {
      this.ds!.endTransaction();
    }
    return length + newValues.length;
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
   *
   * #### Undefined Behavior.
   * An `index` which is non-integral.
   */
  insertAll(index: number, values: IterableOrArrayLike<T>): void {
    this.ensureBackend();
    const table = this.ds!.get(this.schema);
    this.ds!.beginTransaction();
    try {
      table.update({
        [this.recordID]: {
          [this.fieldId]: {
            index,
            remove: 0,
            values: toArray(values)
          }
        }
      } as any);
    } finally {
      this.ds!.endTransaction();
    }
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
    const length = this.length;
    const table = this.ds!.get(this.schema);
    this.ds!.beginTransaction();
    try {
      table.update({
        [this.recordID]: {
          [this.fieldId]: {
            startIndex,
            remove: endIndex - startIndex,
            values: []
          }
        }
      } as any);
    } finally {
      this.ds!.endTransaction();
    }
    return length - (endIndex - startIndex);
  }

  protected onChange(change: ListField.Change<T>): void {
    let arr = this._array.slice();
    let args: IObservableList.IChangedArgs<T>[] = [];
    each(retro(change), c => {
      let newer = arr.slice();
      if (c.removed.length === 1 && c.inserted.length === 1) {
        arr.splice(c.index, c.inserted.length, ...c.removed);
        args.push({
          type: 'set',
          newIndex: c.index,
          oldIndex: c.index,
          newValues: newer,
          oldValues: arr.slice()
        });
      } else {
        if (c.removed.length > 0) {
          arr.splice(c.index, 0, ...c.removed);
          const tmp = arr.slice();
          args.push({
            type: 'remove',
            newIndex: c.index,
            oldIndex: c.index,
            newValues: newer,
            oldValues: tmp
          });
          newer = tmp;
        }
        if (c.inserted.length > 0) {
          arr.splice(c.index, c.inserted.length);
          args.push({
            type: 'add',
            newIndex: c.index,
            oldIndex: c.index,
            newValues: newer,
            oldValues: arr.slice()
          });
        }
      }
    });
    each(retro(args), a => {
      this._changed.emit(a);
    });
  }

  private get _array(): ReadonlyArray<T> {
    this.ensureBackend();
    const record = this.ds!.get(this.schema).get(this.recordID);
    return record ? (record[this.fieldId] as ReadonlyArray<T>) : [];
  }

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
  export function itemCmp(first: any, second: any): boolean {
    return first === second;
  }
}
