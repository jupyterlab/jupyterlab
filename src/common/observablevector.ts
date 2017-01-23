// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ArrayExt, IIterator, IterableOrArrayLike, each, toArray
} from '@phosphor/algorithm';

import {
  IDisposable
} from '@phosphor/disposable';

import {
  ISignal, Signal
} from '@phosphor/signaling';

import {
  Vector
} from './vector';


/**
 * A vector which can be observed for changes.
 */
export
interface IObservableVector<T> extends IDisposable {
  /**
   * A signal emitted when the vector has changed.
   */
  readonly changed: ISignal<this, ObservableVector.IChangedArgs<T>>;

  /**
   * Test whether the vector is empty.
   *
   * @returns `true` if the vector is empty, `false` otherwise.
   *
   * #### Complexity
   * Constant.
   *
   * #### Iterator Validity
   * No changes.
   */
  readonly isEmpty: boolean;

  /**
   * The length of the sequence.
   *
   * #### Notes
   * This is a read-only property.
   */
  length: number;

  /**
   * Create an iterator over the values in the vector.
   *
   * @returns A new iterator starting at the front of the vector.
   *
   * #### Complexity
   * Constant.
   *
   * #### Iterator Validity
   * No changes.
   */
  iter(): IIterator<T>;

  /**
   * Get the value at the front of the vector.
   *
   * @returns The value at the front of the vector, or `undefined` if
   *   the vector is empty.
   *
   * #### Complexity
   * Constant.
   *
   * #### Iterator Validity
   * No changes.
   */
  readonly front: T;

  /**
   * Get the value at the back of the vector.
   *
   * @returns The value at the back of the vector, or `undefined` if
   *   the vector is empty.
   *
   * #### Complexity
   * Constant.
   *
   * #### Iterator Validity
   * No changes.
   */
  readonly back: T;

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
  at(index: number): T;

  /**
   * Get whether this vector can be linked to another.
   * If so, the functions `link` and `unlink` will perform
   * that. Otherwise, they are no-op functions.
   *
   * @returns `true` if the vector may be linked to another,
   *   `false` otherwise.
   */
  readonly isLinkable: boolean;

  /**
   * Get whether this vector can is linked to another.
   *
   * @returns `true` if the vector is linked to another,
   *   `false` otherwise.
   */
  readonly isLinked: boolean;

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

  /**
   * Add a value to the back of the vector.
   *
   * @param value - The value to add to the back of the vector.
   *
   * @returns The new length of the vector.
   *
   * #### Complexity
   * Constant.
   *
   * #### Iterator Validity
   * No changes.
   */
  pushBack(value: T): number;

  /**
   * Remove and return the value at the back of the vector.
   *
   * @returns The value at the back of the vector, or `undefined` if
   *   the vector is empty.
   *
   * #### Complexity
   * Constant.
   *
   * #### Iterator Validity
   * Iterators pointing at the removed value are invalidated.
   */
  popBack(): T;

  /**
   * Insert a value into the vector at a specific index.
   *
   * @param index - The index at which to insert the value.
   *
   * @param value - The value to set at the specified index.
   *
   * @returns The new length of the vector.
   *
   * #### Complexity
   * Linear.
   *
   * #### Iterator Validity
   * No changes.
   *
   * #### Notes
   * The `index` will be clamped to the bounds of the vector.
   *
   * #### Undefined Behavior
   * An `index` which is non-integral.
   */
  insert(index: number, value: T): number;

  /**
   * Remove the first occurrence of a value from the vector.
   *
   * @param value - The value of interest.
   *
   * @returns The index of the removed value, or `-1` if the value
   *   is not contained in the vector.
   *
   * #### Complexity
   * Linear.
   *
   * #### Iterator Validity
   * Iterators pointing at the removed value and beyond are invalidated.
   */
  remove(value: T): number;

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
  removeAt(index: number): T;

  /**
   * Remove all values from the vector.
   *
   * #### Complexity
   * Linear.
   *
   * #### Iterator Validity
   * All current iterators are invalidated.
   */
  clear(): void;

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
  move(fromIndex: number, toIndex: number): void;

  /**
   * Push a set of values to the back of the vector.
   *
   * @param values - An iterable or array-like set of values to add.
   *
   * @returns The new length of the vector.
   *
   * #### Complexity
   * Linear.
   *
   * #### Iterator Validity
   * No changes.
   */
  pushAll(values: IterableOrArrayLike<T>): number;

  /**
   * Insert a set of items into the vector at the specified index.
   *
   * @param index - The index at which to insert the values.
   *
   * @param values - The values to insert at the specified index.
   *
   * @returns The new length of the vector.
   *
   * #### Complexity.
   * Linear.
   *
   * #### Iterator Validity
   * No changes.
   *
   * #### Notes
   * The `index` will be clamped to the bounds of the vector.
   *
   * #### Undefined Behavior.
   * An `index` which is non-integral.
   */
  insertAll(index: number, values: IterableOrArrayLike<T>): number;

  /**
   * Remove a range of items from the vector.
   *
   * @param startIndex - The start index of the range to remove (inclusive).
   *
   * @param endIndex - The end index of the range to remove (exclusive).
   *
   * @returns The new length of the vector.
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
   * Link the vector to another vector.
   * Any changes to either are mirrored in the other.
   *
   * @param vec: the parent vector.
   */
  link(vec: IObservableVector<T>): void;

  /**
   * Unlink the vector from its parent vector.
   */
  unlink(): void;
}


/**
 * A concrete implementation of [[IObservableVector]].
 */
export
class ObservableVector<T> extends Vector<T> implements IObservableVector<T> {
  /**
   * Construct a new observable map.
   */
  constructor(options: ObservableVector.IOptions<T> = {}) {
    super(options.values || []);
    this._itemCmp = options.itemCmp || Private.itemCmp;
  }

  /**
   * A signal emitted when the vector has changed.
   */
  get changed(): ISignal<this, ObservableVector.IChangedArgs<T>> {
    return this._changed;
  }

  /**
   * Get whether this vector can be linked to another.
   * If so, the functions `link` and `unlink` will perform
   * that. Otherwise, they are no-op functions.
   *
   * @returns `true` if the vector may be linked to another,
   *   `false` otherwise.
   */
  readonly isLinkable: boolean = true;

  /**
   * Get whether this vector can is linked to another.
   *
   * @returns `true` if the vector is linked to another,
   *   `false` otherwise.
   */
  get isLinked(): boolean {
    return !!this._parent;
  }

  /**
   * Test whether the vector has been disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Test whether the vector is empty.
   *
   * @returns `true` if the vector is empty, `false` otherwise.
   *
   * #### Notes
   * This is a read-only property.
   *
   * #### Complexity
   * Constant.
   *
   * #### Iterator Validity
   * No changes.
   */
  get isEmpty(): boolean {
    return this.length === 0;
  }

  /**
   * Get the length of the vector.
   *
   * @return The number of values in the vector.
   *
   * #### Notes
   * This is a read-only property.
   *
   * #### Complexity
   * Constant.
   *
   * #### Iterator Validity
   * No changes.
   */
  get length(): number {
    //TODO: How to call super.length?
    if (!this.isLinked) {
      return (this as any)._array.length;
    } else {
      return this._parent.length;
    }
  }


  /**
   * Create an iterator over the values in the vector.
   *
   * @returns A new iterator starting at the front of the vector.
   *
   * #### Complexity
   * Constant.
   *
   * #### Iterator Validity
   * No changes.
   */
  iter(): IIterator<T> {
    if(!this.isLinked) {
      return super.iter();
    } else {
      return this._parent.iter();
    }
  }

  /**
   * Get the value at the specified index.
   *
   * @param index - The positive integer index of interest.
   *
   * @returns The value at the specified index.
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
  at(index: number): T {
    if(!this.isLinked) {
      return super.at(index);
    } else {
      return this._parent.at(index);
    }
  }

  /**
   * Dispose of the resources held by the vector.
   */
  dispose(): void {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    if(this.isLinked) {
      this.unlink();
    }
    Signal.clearData(this);
    this.clear();
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
    if(!this.isLinked) {
      let oldValues = [this.at(index)];
      if (value === undefined) {
        value = null;
      }
      // Bail if the value does not change.
      let itemCmp = this._itemCmp;
      if (itemCmp(oldValues[0], value)) {
        return;
      }
      super.set(index, value);
      this._changed.emit({
        type: 'set',
        oldIndex: index,
        newIndex: index,
        oldValues,
        newValues: [value]
      });
    } else {
      this._parent.set(index, value);
    }
  }

  /**
   * Add a value to the back of the vector.
   *
   * @param value - The value to add to the back of the vector.
   *
   * @returns The new length of the vector.
   *
   * #### Complexity
   * Constant.
   *
   * #### Iterator Validity
   * No changes.
   */
  pushBack(value: T): number {
    if(!this.isLinked) {
      let num = super.pushBack(value);
      // Bail if in the constructor.
      if (!this._changed) {
        return;
      }
      this._changed.emit({
        type: 'add',
        oldIndex: -1,
        newIndex: this.length - 1,
        oldValues: [],
        newValues: [value]
      });
      return num;
    } else {
      return this._parent.pushBack(value);
    }
  }

  /**
   * Remove and return the value at the back of the vector.
   *
   * @returns The value at the back of the vector, or `undefined` if
   *   the vector is empty.
   *
   * #### Complexity
   * Constant.
   *
   * #### Iterator Validity
   * Iterators pointing at the removed value are invalidated.
   */
  popBack(): T {
    if(!this.isLinked) {
      let value = super.popBack();
      this._changed.emit({
        type: 'remove',
        oldIndex: this.length,
        newIndex: -1,
        oldValues: [value],
        newValues: []
      });
      return value;
    } else {
      return this._parent.popBack();
    }
  }

  /**
   * Insert a value into the vector at a specific index.
   *
   * @param index - The index at which to insert the value.
   *
   * @param value - The value to set at the specified index.
   *
   * @returns The new length of the vector.
   *
   * #### Complexity
   * Linear.
   *
   * #### Iterator Validity
   * No changes.
   *
   * #### Notes
   * The `index` will be clamped to the bounds of the vector.
   *
   * #### Undefined Behavior
   * An `index` which is non-integral.
   */
  insert(index: number, value: T): number {
    if(!this.isLinked) {
      let num = super.insert(index, value);
      this._changed.emit({
        type: 'add',
        oldIndex: -1,
        newIndex: index,
        oldValues: [],
        newValues: [value]
      });
      return num;
    } else {
      return this._parent.insert(index, value);
    }
  }

  /**
   * Remove the first occurrence of a value from the vector.
   *
   * @param value - The value of interest.
   *
   * @returns The index of the removed value, or `-1` if the value
   *   is not contained in the vector.
   *
   * #### Complexity
   * Linear.
   *
   * #### Iterator Validity
   * Iterators pointing at the removed value and beyond are invalidated.
   */
  remove(value: T): number {
    if(!this.isLinked) {
      let itemCmp = this._itemCmp;
      let index = ArrayExt.findFirstIndex(toArray(this), item => itemCmp(item, value));
      this.removeAt(index);
      return index;
    } else {
      return this._parent.remove(value);
    }
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
  removeAt(index: number): T {
    if(!this.isLinked) {
      let value = super.removeAt(index);
      this._changed.emit({
        type: 'remove',
        oldIndex: index,
        newIndex: -1,
        oldValues: [value],
        newValues: []
      });
      return value;
    } else {
      return this._parent.removeAt(index);
    }
  }

  /**
   * Remove all values from the vector.
   *
   * #### Complexity
   * Linear.
   *
   * #### Iterator Validity
   * All current iterators are invalidated.
   */
  clear(): void {
    if(!this.isLinked) {
      let oldValues = toArray(this);
      super.clear();
      this._changed.emit({
        type: 'remove',
        oldIndex: 0,
        newIndex: 0,
        oldValues,
        newValues: []
      });
    } else {
      this._parent.clear();
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
    if(!this.isLinked) {
      let value = this.at(fromIndex);
      super.removeAt(fromIndex);
      if (toIndex < fromIndex) {
        super.insert(toIndex - 1, value);
      } else {
        super.insert(toIndex, value);
      }
      let arr = [value];
      this._changed.emit({
        type: 'move',
        oldIndex: fromIndex,
        newIndex: toIndex,
        oldValues: arr,
        newValues: arr
      });
    } else {
      this._parent.move(fromIndex, toIndex);
    }
  }

  /**
   * Push a set of values to the back of the vector.
   *
   * @param values - An iterable or array-like set of values to add.
   *
   * @returns The new length of the vector.
   *
   * #### Complexity
   * Linear.
   *
   * #### Iterator Validity
   * No changes.
   */
  pushAll(values: IterableOrArrayLike<T>): number {
    if(!this.isLinked) {
      let newIndex = this.length;
      let newValues = toArray(values);
      each(newValues, value => { super.pushBack(value); });
      this._changed.emit({
        type: 'add',
        oldIndex: -1,
        newIndex,
        oldValues: [],
        newValues
      });
      return this.length;
    } else {
      return this._parent.pushAll(values);
    }
  }

  /**
   * Insert a set of items into the vector at the specified index.
   *
   * @param index - The index at which to insert the values.
   *
   * @param values - The values to insert at the specified index.
   *
   * @returns The new length of the vector.
   *
   * #### Complexity.
   * Linear.
   *
   * #### Iterator Validity
   * No changes.
   *
   * #### Notes
   * The `index` will be clamped to the bounds of the vector.
   *
   * #### Undefined Behavior.
   * An `index` which is non-integral.
   */
  insertAll(index: number, values: IterableOrArrayLike<T>): number {
    if(!this.isLinked) {
      let newIndex = index;
      let newValues = toArray(values);
      each(newValues, value => { super.insert(index++, value); });
      this._changed.emit({
        type: 'add',
        oldIndex: -1,
        newIndex,
        oldValues: [],
        newValues
      });
      return this.length;
    } else {
      return this._parent.insertAll(index, values);
    }
  }

  /**
   * Remove a range of items from the vector.
   *
   * @param startIndex - The start index of the range to remove (inclusive).
   *
   * @param endIndex - The end index of the range to remove (exclusive).
   *
   * @returns The new length of the vector.
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
    if(!this.isLinked) {
      let oldValues: T[] = [];
      for (let i = startIndex; i < endIndex; i++) {
        oldValues.push(super.removeAt(startIndex));
      }
      this._changed.emit({
        type: 'remove',
        oldIndex: startIndex,
        newIndex: -1,
        oldValues,
        newValues: []
      });
      return this.length;
    } else {
      return this._parent.removeRange(startIndex, endIndex);
    }
  }

  /**
   * Link the vector to another vector.
   * Any changes to either are mirrored in the other.
   *
   * @param vec: the parent vector.
   */
  link(vec: IObservableVector<T>): void {
    //First, recreate the parent vector locally to trigger the 
    //appropriate changed signals.
    let min = vec.length <= this.length ? vec.length : this.length;
    for (let i=0; i<min; i++) {
      if (vec.at(i) !== this.at(i)) {
        this.set(i, vec.at(i));
      }
    }
    if (vec.length < this.length) {
      while(this.length > min) {
        this.popBack();
      }
    } else if (this.length < vec.length) {
      for(let i = min; i < vec.length; i++) {
        this.pushBack(vec.at(i));
      }
    }
    //Now clear the local copy without triggering signals
    super.clear();

    //Set the parent vector and forward its signals
    this._parent = vec;
    this._parent.changed.connect(this._forwardSignal, this);
  }

  /**
   * Unlink the vector from its parent vector.
   */
  unlink(): void {
    if(this._parent) {
      if(!this._parent.isDisposed) {
        //reconstruct the local array without sending signals
        each(this._parent, (value: T)=>{ super.pushBack(value); });
      }
      this._parent.changed.disconnect(this._forwardSignal, this);
      this._parent = null;
    }
  }

  /**
   * Catch a signal from the parent vector and pass it on.
   */
  private _forwardSignal(s: IObservableVector<T>,
                         c: ObservableVector.IChangedArgs<T>) {
    this._changed.emit(c);
  }

  private _isDisposed = false;
  private _itemCmp: (first: T, second: T) => boolean;
  private _changed = new Signal<this, ObservableVector.IChangedArgs<T>>(this);
  private _parent: IObservableVector<T> = null;
}


/**
 * The namespace for `ObservableVector` class statics.
 */
export
namespace ObservableVector {
  /**
   * The options used to initialize an observable map.
   */
  export
  interface IOptions<T> {
    /**
     * An optional intial set of values.
     */
    values?: T[];

    /**
     * The item comparison function for change detection on `set`.
     *
     * If not given, strict `===` equality will be used.
     */
    itemCmp?: (first: T, second: T) => boolean;
  }

  /**
   * The change types which occur on an observable vector.
   */
  export
  type ChangeType =
    /**
     * Item(s) were added to the vector.
     */
    'add' |

    /**
     * An item was moved within the vector.
     */
    'move' |

    /**
     * Item(s) were removed from the vector.
     */
    'remove' |

    /**
     * An item was set in the vector.
     */
    'set';

  /**
   * The changed args object which is emitted by an observable vector.
   */
  export
  interface IChangedArgs<T> {
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
 * The namespace for module private data.
 */
namespace Private {
  /**
   * The default strict equality item cmp.
   */
  export
  function itemCmp(first: any, second: any): boolean {
    return first === second;
  }
}

