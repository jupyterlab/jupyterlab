// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

/*-----------------------------------------------------------------------------
| Copyright (c) 2014-2015, PhosphorJS Contributors
|
| Distributed under the terms of the BSD 3-Clause License.
|
| The full license is in the file LICENSE, distributed with this software.
|----------------------------------------------------------------------------*/
'use strict';

import * as arrays
  from 'phosphor-arrays';

import {
  ISignal, Signal
} from 'phosphor-signaling';


/**
 * An enum of the change types which occur on an observable list.
 */
export
enum ListChangeType {
  /**
   * An item was added to the list.
   */
  Add,

  /**
   * An item was moved in the list.
   */
  Move,

  /**
   * An item was removed from the list.
   */
  Remove,

  /**
   * Items were replaced in the list.
   */
  Replace,

  /**
   * An item was set in the list.
   */
  Set,
}


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
   *   - `Move`: The new index of the item.
   *   - `Remove`: Always `-1`.
   *   - `Replace`: The index of the replacement.
   *   - `Set`: The index of the set item.
   */
  newIndex: number;

  /**
   * The new value associated with the change.
   *
   * The semantics of this value depend upon the change type:
   *   - `Add`: The item which was added.
   *   - `Move`: The item which was moved.
   *   - `Remove`: Always `undefined`.
   *   - `Replace`: The `items[]` which were added.
   *   - `Set`: The new item at the index.
   */
  newValue: T | T[];

  /**
   * The old index associated with the change.
   *
   * The semantics of this value depend upon the change type:
   *   - `Add`: Always `-1`.
   *   - `Move`: The old index of the item.
   *   - `Remove`: The index of the removed item.
   *   - `Replace`: The index of the replacement.
   *   - `Set`: The index of the set item.
   */
  oldIndex: number;

  /**
   * The old value associated with the change.
   *
   * The semantics of this value depend upon the change type:
   *   - `Add`: Always `undefined`.
   *   - `Move`: The item which was moved.
   *   - `Remove`: The item which was removed.
   *   - `Replace`: The `items[]` which were removed.
   *   - `Set`: The old item at the index.
   */
  oldValue: T | T[];
}


/**
 * A sequence container which can be observed for changes.
 */
export
interface IObservableList<T> {
  /**
   * A signal emitted when the list has changed.
   */
  changed: ISignal<IObservableList<T>, IListChangedArgs<T>>;

  /**
   * The number of items in the list.
   *
   * #### Notes
   * This is a read-only property.
   */
  length: number;

  /**
   * Get the item at a specific index in the list.
   *
   * @param index - The index of the item of interest. If this is
   *   negative, it is offset from the end of the list.
   *
   * @returns The item at the specified index, or `undefined` if the
   *   index is out of range.
   */
  get(index: number): T;

  /**
   * Test whether the list contains a specific item.
   *
   * @param item - The item of interest.
   *
   * @returns `true` if the list contains the item, `false` otherwise.
   */
  contains(item: T): boolean;

  /**
   * Get the index of the first occurence of an item in the list.
   *
   * @param item - The item of interest.
   *
   * @returns The index of the specified item or `-1` if the item is
   *   not contained in the list.
   */
  indexOf(item: T): number;

  /**
   * Get a shallow copy of a portion of the list.
   *
   * @param start - The start index of the slice, inclusive. If this is
   *   negative, it is offset from the end of the list. If this is not
   *   provided, it defaults to `0`. In all cases, it is clamped to the
   *   bounds of the list.
   *
   * @param end - The end index of the slice, exclusive. If this is
   *   negative, it is offset from the end of the list. If this is not
   *   provided, it defaults to `length`. In all cases, it is clamped
   *   to the bounds of the list.
   *
   * @returns A new array containing the specified range of items.
   */
  slice(start?: number, end?: number): T[];

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
   * Replace the contents of the list with the specified items.
   *
   * @param items - The items to assign to the list.
   *
   * @returns An array of the previous list items.
   *
   * #### Notes
   * This is equivalent to `list.replace(0, list.length, items)`.
   */
  assign(items: T[]): T[];

  /**
   * Add an item to the end of the list.
   *
   * @param item - The item to add to the list.
   *
   * @returns The index at which the item was added.
   */
  add(item: T): number;

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
   * Replace items at a specific location in the list.
   *
   * @param index - The index at which to modify the list. If this is
   *   negative, it is offset from the end of the list. In all cases,
   *   it is clamped to the bounds of the list.
   *
   * @param count - The number of items to remove at the given index.
   *   This is clamped to the length of the list.
   *
   * @param items - The items to insert at the specified index.
   *
   * @returns An array of the items removed from the list.
   */
  replace(index: number, count: number, items: T[]): T[];

  /**
   * Remove all items from the list.
   *
   * @returns An array of the items removed from the list.
   *
   * #### Notes
   * This is equivalent to `list.replace(0, list.length, [])`.
   */
  clear(): T[];
}


/**
 * A concrete implementation of [[IObservableList]].
 */
export
class ObservableList<T> implements IObservableList<T> {
  /**
   * A signal emitted when the list has changed.
   *
   * **See also:** [[changed]]
   */
  static changedSignal = new Signal<ObservableList<any>, IListChangedArgs<any>>();

  /**
   * Construct a new observable list.
   *
   * @param items - The initial items for the list.
   */
  constructor(items?: T[]) {
    this.internal = items ? items.slice() : [];
  }

  /**
   * A signal emitted when the list has changed.
   *
   * #### Notes
   * This is a pure delegate to the [[changedSignal]].
   */
  get changed(): ISignal<ObservableList<T>, IListChangedArgs<T>> {
    return ObservableList.changedSignal.bind(this);
  }

  /**
   * The number of items in the list.
   *
   * #### Notes
   * This is a read-only property.
   */
  get length(): number {
    return this.internal.length;
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
  get(index: number): T {
    return this.internal[this._norm(index)];
  }

  /**
   * Test whether the list contains a specific item.
   *
   * @param item - The item of interest.
   *
   * @returns `true` if the list contains the item, `false` otherwise.
   */
  contains(item: T): boolean {
    return this.internal.indexOf(item) !== -1;
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
    return this.internal.indexOf(item);
  }

  /**
   * Get a shallow copy of a portion of the list.
   *
   * @param start - The start index of the slice, inclusive. If this is
   *   negative, it is offset from the end of the list. If this is not
   *   provided, it defaults to `0`. In all cases, it is clamped to the
   *   bounds of the list.
   *
   * @param end - The end index of the slice, exclusive. If this is
   *   negative, it is offset from the end of the list. If this is not
   *   provided, it defaults to `length`. In all cases, it is clamped
   *   to the bounds of the list.
   *
   * @returns A new array containing the specified range of items.
   */
  slice(start?: number, end?: number): T[] {
    return this.internal.slice(start, end);
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
    if (!this._check(i)) return void 0;
    return this.setItem(i, item);
  }

  /**
   * Replace the contents of the list with the specified items.
   *
   * @param items - The items to assign to the list.
   *
   * @returns An array of the previous list items.
   *
   * #### Notes
   * This is equivalent to `list.replace(0, list.length, items)`.
   */
  assign(items: T[]): T[] {
    return this.replaceItems(0, this.internal.length, items);
  }

  /**
   * Add an item to the end of the list.
   *
   * @param item - The item to add to the list.
   *
   * @returns The index at which the item was added.
   */
  add(item: T): number {
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
    if (!this._check(i)) return false;
    let j = this._norm(toIndex);
    if (!this._check(j)) return false;
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
    let i = this.internal.indexOf(item);
    if (i !== -1) this.removeItem(i);
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
    if (!this._check(i)) return void 0;
    return this.removeItem(i);
  }

  /**
   * Replace items at a specific location in the list.
   *
   * @param index - The index at which to modify the list. If this is
   *   negative, it is offset from the end of the list. In all cases,
   *   it is clamped to the bounds of the list.
   *
   * @param count - The number of items to remove at the given index.
   *   This is clamped to the length of the list.
   *
   * @param items - The items to insert at the specified index.
   *
   * @returns An array of the items removed from the list.
   */
  replace(index: number, count: number, items: T[]): T[] {
    return this.replaceItems(this._norm(index), this._limit(count), items);
  }

  /**
   * Remove all items from the list.
   *
   * @returns An array of the items removed from the list.
   *
   * #### Notes
   * This is equivalent to `list.replace(0, list.length, [])`.
   */
  clear(): T[] {
    return this.replaceItems(0, this.internal.length, []);
  }

  /**
   * The protected internal array of items for the list.
   *
   * #### Notes
   * Subclasses may access this array directly as needed.
   */
  protected internal: T[];

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
    let i = arrays.insert(this.internal, index, item);
    this.changed.emit({
      type: ListChangeType.Add,
      newIndex: i,
      newValue: item,
      oldIndex: -1,
      oldValue: void 0,
    });
    return i;
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
    if (!arrays.move(this.internal, fromIndex, toIndex)) {
      return false;
    }
    let item = this.internal[toIndex];
    this.changed.emit({
      type: ListChangeType.Move,
      newIndex: toIndex,
      newValue: item,
      oldIndex: fromIndex,
      oldValue: item,
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
    let item = arrays.removeAt(this.internal, index);
    this.changed.emit({
      type: ListChangeType.Remove,
      newIndex: -1,
      newValue: void 0,
      oldIndex: index,
      oldValue: item,
    });
    return item;
  }

  /**
   * Replace items at a specific location in the list.
   *
   * @param index - The index at which to modify the list. This must
   *   be an integer in the range `[0, internal.length]`.
   *
   * @param count - The number of items to remove from the list. This
   *   must be an integer in the range `[0, internal.length]`.
   *
   * @param items - The items to insert at the specified index.
   *
   * @returns An array of the items removed from the list.
   *
   * #### Notes
   * This may be reimplemented by subclasses to customize the behavior.
   */
  protected replaceItems(index: number, count: number, items: T[]): T[] {
    let old = this.internal.splice(index, count, ...items);
    this.changed.emit({
      type: ListChangeType.Replace,
      newIndex: index,
      newValue: items,
      oldIndex: index,
      oldValue: old,
    });
    return old;
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
    let old = this.internal[index];
    this.internal[index] = item;
    this.changed.emit({
      type: ListChangeType.Set,
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
