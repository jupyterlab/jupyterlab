// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JSONObject
} from '@phosphor/coreutils';

import {
  ArrayExt, IIterator, IterableOrArrayLike, each, toArray, ArrayIterator
} from '@phosphor/algorithm';

import {
  ISignal, Signal
} from '@phosphor/signaling';

import {
  utils
} from '@jupyterlab/services';

import {
  IObservableMap, ObservableMap, IObservableVector, ObservableVector,
  IObservableUndoableVector, ObservableUndoableVector, ISerializable
} from '@jupyterlab/coreutils';

import {
  ICellModel
} from '@jupyterlab/cells';


/**
 * Unfortunate, this.
 */
class CellID implements ISerializable { 
  constructor(id: string) {
    this.id = id;
  }

  readonly id: string;

  toJSON(): JSONObject {
    return { id: this.id };
  }
}

/**
 * A cell list object that supports undo/redo.
 */
export
class CellList implements IObservableUndoableVector<ICellModel> {
  /**
   * Construct the cell list.
   */
  constructor() {
    this._cellOrder = new ObservableUndoableVector<CellID>((id: JSONObject) => {
      return new CellID((id as any).id);
    });
    this._cellMap = new ObservableMap<ICellModel>();

    this._cellOrder.changed.connect(this._onOrderChanged, this);
  }

  /**
   * A signal emitted when the cell list has changed.
   */
  get changed(): ISignal<this, ObservableVector.IChangedArgs<ICellModel>> {
    return this._changed;
  }

  /**
   * Test whether the cell list has been disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Test whether the list is empty.
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
    return this._cellOrder.length === 0;
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
    return this._cellOrder.length;
  }

  /**
   * Get the value at the front of the vector.
   *
   * @returns The value at the front of the vector, or `undefined` if
   *   the vector is empty.
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
  get front(): ICellModel {
    return this.at(0);
  }

  /**
   * Get the value at the back of the vector.
   *
   * @returns The value at the back of the vector, or `undefined` if
   *   the vector is empty.
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
  get back(): ICellModel {
    return this.at(this.length-1);
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
  iter(): IIterator<ICellModel> {
    let arr: ICellModel[] = [];
    for(let id of toArray(this._cellOrder)) {
      arr.push(this._cellMap.get(id.id));
    }
    return new ArrayIterator<ICellModel>(arr);
  }

  /**
   * Dispose of the resources held by the vector.
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
  at(index: number): ICellModel {
    return this._cellMap.get(this._cellOrder.at(index).id) as ICellModel;
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
  set(index: number, value: ICellModel): void {
    // Generate a new uuid for the cell.
    let id = utils.uuid();
    // Set the internal data structures.
    this._cellMap.set(id, value);
    this._cellOrder.set(index, new CellID(id));
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
  pushBack(value: ICellModel): number {
    // Generate a new uuid for the cell.
    let id = utils.uuid();
    // Set the internal data structures.
    this._cellMap.set(id, value);
    let num = this._cellOrder.pushBack(new CellID(id));
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
  popBack(): ICellModel {
    //Don't clear the map in case we need to reinstate the cell
    let id = this._cellOrder.popBack();
    let value = this._cellMap.get(id.id);
    return value;
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
  insert(index: number, value: ICellModel): number {
    // Generate a new uuid for the cell.
    let id = utils.uuid();
    // Set the internal data structures.
    this._cellMap.set(id, value);
    let num = this._cellOrder.insert(index, new CellID(id));
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
   */
  remove(value: ICellModel): number {
    let index = ArrayExt.findFirstIndex(
      toArray(this._cellOrder), id => (this._cellMap.get(id.id)===value));
    this.removeAt(index);
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
  removeAt(index: number): ICellModel {
    let id= this._cellOrder.removeAt(index);
    let value = this._cellMap.get(id.id);
    return value;
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
    let oldValues: ICellModel[] = []
    for(let id of toArray(this._cellOrder)) {
      oldValues.push(this._cellMap.get(id.id));
    }
    this._cellOrder.clear();
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
    this._cellOrder.move(fromIndex, toIndex);
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
  pushAll(values: IterableOrArrayLike<ICellModel>): number {
    let newIndex = this.length;
    let newValues = toArray(values);
    each(newValues, value => {
      // Generate a new uuid for the cell.
      let id = utils.uuid();
      // Set the internal data structures.
      this._cellMap.set(id, value);
      let num = this._cellOrder.pushBack(new CellID(id));
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
  insertAll(index: number, values: IterableOrArrayLike<ICellModel>): number {
    let newIndex = index;
    let newValues = toArray(values);
    each(newValues, value => {
      // Generate a new uuid for the cell.
      let id = utils.uuid();
      this._cellMap.set(id, value);
      this._cellOrder.insert(index++, new CellID(id));
    });
    return this.length;
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
    let oldValues: ICellModel[] = [];
    for (let i = startIndex; i < endIndex; i++) {
      let id = this._cellOrder.removeAt(startIndex);
      oldValues.push(this._cellMap.get(id.id));
    }
    return this.length;
  }

  /**
   * Whether the object can redo changes.
   */
  get canRedo(): boolean {
    return this._cellOrder.canRedo;
  }

  /**
   * Whether the object can undo changes.
   */
  get canUndo(): boolean {
    return this._cellOrder.canUndo;
  }

  /**
   * Begin a compound operation.
   *
   * @param isUndoAble - Whether the operation is undoable.
   *   The default is `true`.
   */
  beginCompoundOperation(isUndoAble?: boolean): void {
    this._cellOrder.beginCompoundOperation(isUndoAble);
  }

  /**
   * End a compound operation.
   */
  endCompoundOperation(): void {
    this._cellOrder.endCompoundOperation();
  }

  /**
   * Undo an operation.
   */
  undo(): void {
    this._cellOrder.undo();
  }

  /**
   * Redo an operation.
   */
  redo(): void {
    this._cellOrder.redo();
  }

  /**
   * Clear the change stack.
   */
  clearUndo(): void {
    //dispose of cells not in the current
    //cell order.
    for(let key of this._cellMap.keys()) {
      if(ArrayExt.findFirstIndex(
         toArray(this._cellOrder), id => (id.id)===key) === -1) {
        let cell = this._cellMap.get(key) as ICellModel;
        cell.dispose();
        this._cellMap.delete(key);
      }
    }
    this._cellOrder.clearUndo();
  }

  private _onOrderChanged(order: IObservableVector<CellID>, change: ObservableVector.IChangedArgs<CellID>): void {
    let newValues: ICellModel[] = [];
    let oldValues: ICellModel[] = [];
    each(change.newValues, (id)=>{
      newValues.push(this._cellMap.get(id.id));
    });
    each(change.oldValues, (id)=>{
      oldValues.push(this._cellMap.get(id.id));
    });
    this._changed.emit({
      type: change.type,
      oldIndex: change.oldIndex,
      newIndex: change.newIndex,
      oldValues,
      newValues
    });
  }

  private _isDisposed: boolean = false;
  private _cellOrder: IObservableUndoableVector<CellID> = null;
  private _cellMap: IObservableMap<ICellModel> = null;
  private _changed = new Signal<this, ObservableVector.IChangedArgs<ICellModel>>(this);
}
