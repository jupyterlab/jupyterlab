// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  EmptyIterator, IIterator, IterableOrArrayLike, iter, each
} from 'phosphor/lib/algorithm/iteration';

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
 * A vector which can be observed for changes.
 */
export
interface IObservableVector<T> extends Vector<T>, IDisposable {
  /**
   * A signal emitted when the vector has changed.
   */
  changed: ISignal<IObservableVector<T>, ObservableVector.IChangedArgs<T>>;

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
   * Remove a range of items from the list.
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
}


/**
 * A concrete implementation of [[IObservableVector]].
 */
export
class ObservableVector<T> implements IObservableVector<T> extends Vector {
  /**
   * A signal emitted when the list has changed.
   *
   * #### Notes
   * This is a pure delegate to the [[changedSignal]].
   */
  changed: ISignal<ObservableVector<T>, IListChangedArgs<T>>;

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
  set(index: number, item: T): T {
    let oldValues = iter([this.at(index)]);
    super.set(index, number);
    this.changed.emit({
      type: 'set',
      oldIndex: index,
      newIndex: index,
      oldValues,
      newValues = iter([item])
    });
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
    let num = super.pushBack(value);
    this.changed.emit({
      type: 'add',
      oldIndex: -1,
      newIndex: this.length - 1,
      oldValues: EmptyIterator.instance,
      newValues: iter(value)
    });
    return num;
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
    let value = super.popBack();
    this.changed.emit({
      type: 'remove',
      oldIndex: this.length,
      newIndex: -1,
      oldValues: iter(value),
      newValues: EmptyIterator.instance
    });
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
    let num = super.insert(index, value);
    this.changed.emit({
      type: 'add',
      oldIndex: -1,
      newIndex: index,
      oldValues: EmptyIterator.instance,
      newValues: iter(value)
    });
    return num;
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
   *
   * #### Notes
   * Comparison is performed using strict `===` equality.
   */
  remove(value: T): number {
    let oldIndex = this.indexOf(value);
    let num = super.remove(value);
    this.changed.emit({
      type: 'remove',
      oldIndex,
      newIndex: -1,
      oldValues: iter(value),
      newValues: EmptyIterator.instance
    });
    return num;
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
    let value = super.removeAt(index);
    this.changed.emit({
      type: 'remove',
      oldIndex: index,
      newIndex: -1,
      oldValues: iter(value),
      newValues: EmptyIterator.instance
    });
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
    let values = [];
    each(this, value => {  values.push(value); });
    super.clear();
    this.changed.emit({
      type: 'remove',
      oldIndex: 0,
      newIndex: -1,
      oldValues: iter(values),
      newValues: EmptyIterator.instance
    });
  }

  /**
   * Swap the contents of the vector with the contents of another.
   *
   * @param other - The other vector holding the contents to swap.
   *
   * #### Complexity
   * Constant.
   *
   * #### Iterator Validity
   * All current iterators remain valid, but will now point to the
   * contents of the other vector involved in the swap.
   */
  swap(other: Vector<T>): void {
    let oldValues = this.iter();
    super.swap(other);
    this.changed.emit({
      type: 'remove',
      oldIndex: 0,
      newIndex: -1,
      oldValues,
      newValues: EmptyIterator.instance
    });
    this.changed.emit({
      type: 'add',
      oldIndex: -1,
      newIndex: 0,
      oldValues: EmptyIterator.instance,
      newValues: this.iter()
    });
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
    let value = this.at(fromIndex);
    let it = iter(value);
    super.removeAt(fromIndex);
    if (toIndex < fromIndex) {
      toIndex -= 1;
    }
    super.insert(toIndex, value);
    this.changed.emit({
      type: 'move',
      oldIndex: fromIndex,
      newIndex: toIndex,
      oldValues: it
      newValues: it
    });
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
    let newIndex = this.length;
    each(values, value => { super.pushBack(value); });
    this.changed.emit({
      type: 'add',
      oldIndex: -1,
      newIndex,
      oldValues: EmptyIterator.instance,
      newValues = iter(values)
    });
    return this.length;
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
    each(values, value => { super.insert(index++, value); });
    this.changed.emit({
      type: 'add',
      oldIndex: -1,
      newIndex: index,
      oldValues: EmptyIterator.instance,
      newValues: iter(values)
    });
  }

  /**
   * Remove a range of items from the list.
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
    let oldValues: T[] = [];
    for (let i = startIndex; i < endIndex; i++) {
      oldValues.push(super.removeAt(startIndex));
    }
    this.changed.emit({
      type: 'remove',
      oldIndex: startIndex,
      newIndex: -1,
      oldValues: iter(oldValues),
      newValues: EmptyIterator.instance
    });
  }
}


/**
 * The namespace for `ObservableVector` class statics.
 */
export
namespace ObservableVector {
  /**
   * The change types which occur on an observable list.
   */
  export
  type ChangeType =
    /**
     * An item was added to the list.
     */
    'add' |

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
  interface IChangedArgs<T> {
    /**
     * The type of change undergone by the list.
     */
    type: ChangeType;

    /**
     * The new index associated with the change.
     */
    newIndex: number;

    /**
     * The new values associated with the change.
     */
    newValues: IIterator<T>;

    /**
     * The old index associated with the change.
     */
    oldIndex: number;

    /**
     * The old values associated with the change.
     */
    oldValues: IIterator<T>;
  }
}


// Define the signals for the `ObservableVector` class.
defineSignal(ObservableVector.prototype, 'changed');
