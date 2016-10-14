// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  EmptyIterator, IIterator, IIterable, IterableOrArrayLike, iter, each
} from 'phosphor/lib/algorithm/iteration';

import {
  move
} from 'phosphor/lib/algorithm/mutation';

import {
  indexOf
} from 'phosphor/lib/algorithm/searching';

import {
  Vector
} from 'phosphor/lib/collections/vector';

import {
  IDisposable
} from 'phosphor/lib/core/disposable';

import {
  clearSignalData, defineSignal, ISignal
} from 'phosphor/lib/core/signaling';


/**
 * The change types which occur on an observable list.
 */
export
type ListChangeType =
  /**
   * An item was added to the list.
   */
  'add' |

  /**
   * Items were assigned or cleared in the list.
   */
  'assign' |

  /**
   * An item was moved within the list.
   */
  'move' |

  /**
   * An item was removed from the list.
   */
  'remove' |

  /**
   * An item was set in the list.
   */
  'set';


/**
 * The changed args object which is emitted by an observable list.
 */
export
interface IListChangedArgs<T> {
  /**
   * The type of change undergone by the list.
   */
  type: ListChangeType;

  /**
   * The new index associated with the change.
   *
   * The semantics of this value depend upon the change type:
   *   - `Add`: The index of the added item.
   *   - `Assign`: Always `-1`.
   *   - `Move`: The new index of the item.
   *   - `Remove`: Always `-1`.
   *   - `Assign`: Always `-1`.
   *   - `Set`: The index of the set item.
   */
  newIndex: number;

  /**
   * The new value associated with the change.
   *
   * The semantics of this value depend upon the change type:
   *   - `Add`: The item which was added.
   *   - `Assign`: The new items.
   *   - `Move`: The item which was moved.
   *   - `Remove`: Always `undefined`.
   *   - `Set`: The new item at the index.
   */
  newValue: T | IIterator<T>;

  /**
   * The old index associated with the change.
   *
   * The semantics of this value depend upon the change type:
   *   - `Add`: Always `-1`.
   *   - `Assign`: Always `-1`.
   *   - `Move`: The old index of the item.
   *   - `Remove`: The index of the removed item.
   *   - `Set`: The index of the set item.
   */
  oldIndex: number;

  /**
   * The old value associated with the change.
   *
   * The semantics of this value depend upon the change type:
   *   - `Add`: Always `undefined`.
   *   - `Assign`: The old items.
   *   - `Move`: The item which was moved.
   *   - `Remove`: The item which was removed.
   *   - `Set`: The old item at the index.
   */
  oldValue: T | IIterator<T>;
}


/**
 * A sequence container which can be observed for changes.
 */
export
interface IObservableList<T> extends IDisposable, IIterable<T> {
  /**
   * A signal emitted when the list has changed.
   */
  changed: ISignal<IObservableList<T>, IListChangedArgs<T>>;

  /**
   * The number of items in the list.
   */
  readonly length: number;

  /**
   * Get the item at a specific index in the list.
   *
   * @param index - The index of the item of interest. If this is
   *   negative, it is offset from the end of the list.
   *
   * @returns The item at the specified index, or `undefined` if the
   *   index is out of range.
   */
  at(index: number): T;

  /**
   * Set the item at a specific index.
   *
   * @param index - The index of interest. If this is negative, it is
   *   offset from the end of the list.
   *
   * @param item - The item to set at the index.
   *
   * @returns The item which occupied the index, or `undefined` if the
   *   index is out of range.
   */
  set(index: number, item: T): T;

  /**
   * Add an item to the end of the list.
   *
   * @param item - The item to add to the list.
   *
   * @returns The new length of the vector.
   */
  pushBack(item: T): number;

  /**
   * Insert an item into the list at a specific index.
   *
   * @param index - The index at which to insert the item. If this is
   *   negative, it is offset from the end of the list. In all cases,
   *   it is clamped to the bounds of the list.
   *
   * @param item - The item to insert into the list.
   *
   * @returns The the new length of the vector.
   */
  insert(index: number, item: T): number;

  /**
   * Move an item from one index to another.
   *
   * @param fromIndex - The index of the item of interest. If this is
   *   negative, it is offset from the end of the list.
   *
   * @param toIndex - The desired index for the item. If this is
   *   negative, it is offset from the end of the list.
   *
   * @returns `true` if the item was moved, `false` otherwise.
   */
  move(fromIndex: number, toIndex: number): boolean;

  /**
   * Remove the first occurrence of a specific item from the list.
   *
   * @param item - The item to remove from the list.
   *
   * @return The index occupied by the item, or `-1` if the item is
   *   not contained in the list.
   */
  remove(item: T): number;

  /**
   * Remove the item at a specific index.
   *
   * @param index - The index of the item of interest. If this is
   *   negative, it is offset from the end of the list.
   *
   * @returns The item at the specified index, or `undefined` if the
   *   index is out of range.
   */
  removeAt(index: number): T;

  /**
   * Assign the items in the list.
   *
   * @param items - The items to assign.
   *
   * @returns An iterator for of the items in the existing list.
   */
  assign(items: IterableOrArrayLike<T>): IIterator<T>;

  /**
   * Remove all items from the list.
   *
   * @returns An iterator for the items removed from the list.
   *
   * #### Notes
   * This is equivalent to `list.assign([])`.
   */
  clear(): IIterator<T>;
}


/**
 * A concrete implementation of [[IObservableList]].
 */
export
class ObservableList<T> implements IObservableList<T> {
  /**
   * Construct a new observable list.
   *
   * @param items - The initial items for the list.
   */
  constructor(items?: IterableOrArrayLike<T>) {
    this.internal = new Vector<T>(items);
  }

  /**
   * A signal emitted when the list has changed.
   *
   * #### Notes
   * This is a pure delegate to the [[changedSignal]].
   */
  changed: ISignal<ObservableList<T>, IListChangedArgs<T>>;

  /**
   * The number of items in the list.
   */
  get length(): number {
    return this.internal.length;
  }

  /**
   * Test whether the list has been disposed.
   */
  get isDisposed(): boolean {
    return this.internal === null;
  }

  /**
   * Dispose of the resources held by the list.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    clearSignalData(this);
    this.internal.clear();
    this.internal = null;
  }

  /**
   * Create an iterator over the values in the list.
   *
   * @returns A new iterator starting at the front of the list.
   */
  iter(): IIterator<T> {
    return this.internal.iter();
  }

  /**
   * Get the item at a specific index in the list.
   *
   * @param index - The index of the item of interest. If this is
   *   negative, it is offset from the end of the list.
   *
   * @returns The item at the specified index, or `undefined` if the
   *   index is out of range.
   */
  at(index: number): T {
    return this.internal.at(this._norm(index));
  }

  /**
   * Get the index of the first occurence of an item in the list.
   *
   * @param item - The item of interest.
   *
   * @returns The index of the specified item or `-1` if the item is
   *   not contained in the list.
   */
  indexOf(item: T): number {
    return indexOf(this.internal, item);
  }

  /**
   * Set the item at a specific index.
   *
   * @param index - The index of interest. If this is negative, it is
   *   offset from the end of the list.
   *
   * @param item - The item to set at the index.
   *
   * @returns The item which occupied the index, or `undefined` if the
   *   index is out of range.
   */
  set(index: number, item: T): T {
    let i = this._norm(index);
    if (!this._check(i)) {
      return void 0;
    }
    return this.setItem(i, item);
  }

  /**
   * Add an item to the end of the list.
   *
   * @param item - The item to add to the list.
   *
   * @returns The index at which the item was added.
   */
  pushBack(item: T): number {
    return this.addItem(this.internal.length, item);
  }

  /**
   * Insert an item into the list at a specific index.
   *
   * @param index - The index at which to insert the item. If this is
   *   negative, it is offset from the end of the list. In all cases,
   *   it is clamped to the bounds of the list.
   *
   * @param item - The item to insert into the list.
   *
   * @returns The index at which the item was inserted.
   */
  insert(index: number, item: T): number {
    return this.addItem(this._clamp(index), item);
  }

  /**
   * Move an item from one index to another.
   *
   * @param fromIndex - The index of the item of interest. If this is
   *   negative, it is offset from the end of the list.
   *
   * @param toIndex - The desired index for the item. If this is
   *   negative, it is offset from the end of the list.
   *
   * @returns `true` if the item was moved, `false` otherwise.
   */
  move(fromIndex: number, toIndex: number): boolean {
    let i = this._norm(fromIndex);
    if (!this._check(i)) {
      return false;
    }
    let j = this._norm(toIndex);
    if (!this._check(j)) {
      return false;
    }
    return this.moveItem(i, j);
  }

  /**
   * Remove the first occurrence of a specific item from the list.
   *
   * @param item - The item to remove from the list.
   *
   * @return The index occupied by the item, or `-1` if the item is
   *   not contained in the list.
   */
  remove(item: T): number {
    let i = indexOf(this.internal, item);
    if (i !== -1) {
      this.removeItem(i);
    }
    return i;
  }

  /**
   * Remove the item at a specific index.
   *
   * @param index - The index of the item of interest. If this is
   *   negative, it is offset from the end of the list.
   *
   * @returns The item at the specified index, or `undefined` if the
   *   index is out of range.
   */
  removeAt(index: number): T {
    let i = this._norm(index);
    if (!this._check(i)) {
      return void 0;
    }
    return this.removeItem(i);
  }

  /**
   * Assign the items in the list.
   *
   * @param items - The items to assign.
   *
   * @returns An iterator for of the items in the existing list.
   */
  assign(items: IterableOrArrayLike<T>): IIterator<T> {
    let old: T[] = [];
    while (!this.internal.isEmpty) {
      old.push(this.internal.removeAt(0));
    }
    let newValue = iter(items);
    let oldValue = iter(old);

    each(newValue, item => {
      this.internal.pushBack(item);
    });

    this.changed.emit({
      type: 'assign',
      newIndex: -1,
      newValue,
      oldIndex: -1,
      oldValue
    });
    return oldValue;
  }

  /**
   * Remove all items from the list.
   *
   * @returns An iterator for the items removed from the list.
   *
   * #### Notes
   * This is equivalent to `list.assign([])`.
   */
  clear(): IIterator<T> {
    return this.assign(EmptyIterator.instance);
  }

  /**
   * The protected internal array of items for the list.
   *
   * #### Notes
   * Subclasses may access this array directly as needed.
   */
  protected internal: Vector<T>;

  /**
   * Add an item to the list at the specified index.
   *
   * @param index - The index at which to add the item. This must be
   *   an integer in the range `[0, internal.length]`.
   *
   * @param item - The item to add at the specified index.
   *
   * @returns The index at which the item was added.
   *
   * #### Notes
   * This may be reimplemented by subclasses to customize the behavior.
   */
  protected addItem(index: number, item: T): number {
    let value = this.internal.insert(index, item);
    this.changed.emit({
      type: 'add',
      newIndex: index,
      newValue: item,
      oldIndex: -1,
      oldValue: void 0,
    });
    return value;
  }

  /**
   * Move an item in the list from one index to another.
   *
   * @param fromIndex - The initial index of the item. This must be
   *   an integer in the range `[0, internal.length)`.
   *
   * @param toIndex - The desired index for the item. This must be
   *   an integer in the range `[0, internal.length)`.
   *
   * @returns `true` if the item was moved, `false` otherwise.
   *
   * #### Notes
   * This may be reimplemented by subclasses to customize the behavior.
   */
  protected moveItem(fromIndex: number, toIndex: number): boolean {
    let before = this.internal.at(toIndex);
    move(this.internal, fromIndex, toIndex);
    let after = this.internal.at(toIndex);
    if (before === after) {
      return;
    }
    this.changed.emit({
      type: 'move',
      newIndex: toIndex,
      newValue: after,
      oldIndex: fromIndex,
      oldValue: after,
    });
    return true;
  }

  /**
   * Remove the item from the list at the specified index.
   *
   * @param index - The index of the item to remove. This must be
   *   an integer in the range `[0, internal.length)`.
   *
   * @returns The item removed from the list.
   *
   * #### Notes
   * This may be reimplemented by subclasses to customize the behavior.
   */
  protected removeItem(index: number): T {
    let item = this.internal.removeAt(index);
    this.changed.emit({
      type: 'remove',
      newIndex: -1,
      newValue: void 0,
      oldIndex: index,
      oldValue: item,
    });
    return item;
  }

  /**
   * Set the item at a specific index in the list.
   *
   * @param index - The index of interest. This must be an integer in
   *   the range `[0, internal.length)`.
   *
   * @param item - The item to set at the index.
   *
   * @returns The item which previously occupied the specified index.
   *
   * #### Notes
   * This may be reimplemented by subclasses to customize the behavior.
   */
  protected setItem(index: number, item: T): T {
    let old = this.internal.at(index);
    this.internal.set(index, item);
    this.changed.emit({
      type: 'set',
      newIndex: index,
      newValue: item,
      oldIndex: index,
      oldValue: old,
    });
    return old;
  }

  /**
   * Normalize an index and offset negative values from the list end.
   */
  private _norm(i: number): number {
    return i < 0 ? Math.floor(i) + this.internal.length : Math.floor(i);
  }

  /**
   * Check whether a normalized index is in range.
   */
  private _check(i: number): boolean {
    return i >= 0 && i < this.internal.length;
  }

  /**
   * Normalize and clamp an index to the list bounds.
   */
  private _clamp(i: number): number {
    return Math.max(0, Math.min(this._norm(i), this.internal.length));
  }

  /**
   * Normalize and limit a count to the length of the list.
   */
  private _limit(c: number): number {
    return Math.max(0, Math.min(Math.floor(c), this.internal.length));
  }
}


// Define the signals for the `ObservableList` class.
defineSignal(ObservableList.prototype, 'changed');
