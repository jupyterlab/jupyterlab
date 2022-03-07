// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ICellModel } from '@jupyterlab/cells';
import {
  IModelDB,
  IObservableList,
  IObservableMap,
  IObservableUndoableList,
  ObservableMap
} from '@jupyterlab/observables';
import {
  createMutex,
  ISharedDoc,
  ISharedList,
  ISharedMap,
  ISharedType
} from '@jupyterlab/shared-models';
import {
  ArrayExt,
  ArrayIterator,
  each,
  IIterator,
  IterableOrArrayLike,
  toArray
} from '@lumino/algorithm';
import { ISignal, Signal } from '@lumino/signaling';
import { NotebookModel } from './model';

const globalMutex = createMutex();

/**
 * A cell list object that supports undo/redo.
 */
export class CellList implements IObservableUndoableList<ICellModel> {
  /**
   * Construct the cell list.
   */
  constructor(
    modelDB: IModelDB,
    factory: NotebookModel.IContentFactory,
    sharedDoc: ISharedDoc
  ) {
    this._factory = factory;
    this._cellMap = new ObservableMap<ICellModel>();

    this._sharedDoc = sharedDoc;
    this._sharedList = this._sharedDoc.createList<string>('cellsOrder');
    this._cells = this._sharedDoc.createMap<ISharedMap<ISharedType>>('cells');
    this._sharedList.changed.connect(this._onOrderChanged, this);
  }

  readonly type: 'List';

  get underlyingModel(): ISharedMap<ISharedMap<ISharedType>> {
    return this._cells;
  }

  /**
   * A signal emitted when the cell list has changed.
   */
  get changed(): ISignal<this, IObservableList.IChangedArgs<ICellModel>> {
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
   * @returns `true` if the cell list is empty, `false` otherwise.
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
    return this._sharedList.length === 0;
  }

  /**
   * Get the length of the cell list.
   *
   * @returns The number of cells in the cell list.
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
    return this._sharedList.length;
  }

  /**
   * Create an iterator over the cells in the cell list.
   *
   * @returns A new iterator starting at the front of the cell list.
   *
   * #### Complexity
   * Constant.
   *
   * #### Iterator Validity
   * No changes.
   */
  iter(): IIterator<ICellModel> {
    const arr: ICellModel[] = [];
    for (const id of toArray(this._sharedList)) {
      arr.push(this._cellMap.get(id)!);
    }
    return new ArrayIterator<ICellModel>(arr);
  }

  /**
   * Dispose of the resources held by the cell list.
   */
  dispose(): void {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    Signal.clearData(this);
    // Clean up the cell map and cell order objects.
    for (const cell of this._cellMap.values()) {
      cell.dispose();
    }
    this._cellMap.dispose();
    this._cells.dispose();
    this._sharedList.dispose();
  }

  /**
   * Get the cell at the specified index.
   *
   * @param index - The positive integer index of interest.
   *
   * @returns The cell at the specified index.
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
  get(index: number): ICellModel {
    return this._cellMap.get(this._sharedList.get(index))!;
  }

  /**
   * Set the cell at the specified index.
   *
   * @param index - The positive integer index of interest.
   *
   * @param cell - The cell to set at the specified index.
   *
   * #### Complexity
   * Constant.
   *
   * #### Iterator Validity
   * No changes.
   *
   * #### Undefined Behavior
   * An `index` which is non-integral or out of range.
   *
   * #### Notes
   * This should be considered to transfer ownership of the
   * cell to the `CellList`. As such, `cell.dispose()` should
   * not be called by other actors.
   */
  set(index: number, cell: ICellModel): void {
    // Set the internal data structures.
    const id = this._sharedList.get(index);
    const oldValues: ICellModel[] =
      id !== undefined ? [this._cellMap.get(id)!] : [];
    this._cellMap.set(cell.id, cell);
    if (!this._cells.has(id)) {
      this._cells.set(cell.id, cell.sharedModel);
    }
    globalMutex(() => {
      this._sharedList.set(index, cell.id);
      cell.initialize();
    });
    this._changed.emit({
      type: 'set',
      oldIndex: index,
      newIndex: index,
      oldValues,
      newValues: [cell]
    });
  }

  /**
   * Add a cell to the back of the cell list.
   *
   * @param cell - The cell to add to the back of the cell list.
   *
   * @returns The new length of the cell list.
   *
   * #### Complexity
   * Constant.
   *
   * #### Iterator Validity
   * No changes.
   *
   * #### Notes
   * This should be considered to transfer ownership of the
   * cell to the `CellList`. As such, `cell.dispose()` should
   * not be called by other actors.
   */
  push(cell: ICellModel): number {
    // Set the internal data structures.
    this._cellMap.set(cell.id, cell);
    this._cells.set(cell.id, cell.sharedModel);
    globalMutex(() => {
      this._sharedList.push(cell.id);
      cell.initialize();
    });
    this._changed.emit({
      type: 'add',
      oldIndex: -1,
      newIndex: this.length - 1,
      oldValues: [],
      newValues: [cell]
    });
    return this.length;
  }

  /**
   * Insert a cell into the cell list at a specific index.
   *
   * @param index - The index at which to insert the cell.
   *
   * @param cell - The cell to set at the specified index.
   *
   * @returns The new length of the cell list.
   *
   * #### Complexity
   * Linear.
   *
   * #### Iterator Validity
   * No changes.
   *
   * #### Notes
   * The `index` will be clamped to the bounds of the cell list.
   *
   * #### Undefined Behavior
   * An `index` which is non-integral.
   *
   * #### Notes
   * This should be considered to transfer ownership of the
   * cell to the `CellList`. As such, `cell.dispose()` should
   * not be called by other actors.
   */
  insert(index: number, cell: ICellModel): void {
    // Set the internal data structures.
    globalMutex(() => {
      this._cellMap.set(cell.id, cell);
      this._cells.set(cell.id, cell.sharedModel);
      this._sharedList.insert(index, cell.id);
      cell.initialize();
    });
    this._changed.emit({
      type: 'add',
      oldIndex: -2,
      newIndex: index,
      oldValues: [],
      newValues: [cell]
    });
  }

  /**
   * Remove the first occurrence of a cell from the cell list.
   *
   * @param cell - The cell of interest.
   *
   * @returns The index of the removed cell, or `-1` if the cell
   *   is not contained in the cell list.
   *
   * #### Complexity
   * Linear.
   *
   * #### Iterator Validity
   * Iterators pointing at the removed cell and beyond are invalidated.
   */
  removeValue(cell: ICellModel, del: boolean = true): number {
    const index = ArrayExt.findFirstIndex(
      toArray(this._sharedList),
      id => this._cellMap.get(id) === cell
    );
    this.remove(index, del);
    return index;
  }

  /**
   * Remove and return the cell at a specific index.
   *
   * @param index - The index of the cell of interest.
   *
   * @returns The cell at the specified index, or `undefined` if the
   *   index is out of range.
   *
   * #### Complexity
   * Constant.
   *
   * #### Iterator Validity
   * Iterators pointing at the removed cell and beyond are invalidated.
   *
   * #### Undefined Behavior
   * An `index` which is non-integral.
   */
  remove(index: number, del: boolean = true): ICellModel {
    const key = this._sharedList.get(index)!;
    const cell = this._cellMap.get(key)!;
    this._cellMap.delete(key);
    if (del) {
      this._cells.delete(key);
    }
    globalMutex(() => {
      this._sharedList.remove(index)!;
    });
    this._changed.emit({
      type: 'remove',
      oldIndex: index,
      newIndex: -1,
      oldValues: [cell],
      newValues: []
    });
    return cell;
  }

  /**
   * Remove all cells from the cell list.
   *
   * #### Complexity
   * Linear.
   *
   * #### Iterator Validity
   * All current iterators are invalidated.
   */
  clear(): void {
    this._sharedList.clear();
  }

  /**
   * Move a cell from one index to another.
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
    const id = this._sharedList.get(fromIndex);
    const value = this._cellMap.get(id)!;
    globalMutex(() => {
      this._sharedList.move(fromIndex, toIndex);
    });
    this._changed.emit({
      type: 'move',
      oldIndex: fromIndex,
      newIndex: toIndex,
      oldValues: [value],
      newValues: [value]
    });
  }

  /**
   * Push a set of cells to the back of the cell list.
   *
   * @param cells - An iterable or array-like set of cells to add.
   *
   * @returns The new length of the cell list.
   *
   * #### Complexity
   * Linear.
   *
   * #### Iterator Validity
   * No changes.
   *
   * #### Notes
   * This should be considered to transfer ownership of the
   * cells to the `CellList`. As such, `cell.dispose()` should
   * not be called by other actors.
   */
  pushAll(cells: IterableOrArrayLike<ICellModel>): number {
    const order: string[] = [];
    each(cells, cell => {
      order.push(cell.id);
      this._cellMap.set(cell.id, cell);
      this._cells.set(cell.id, cell.sharedModel);
      cell.initialize();
    });
    globalMutex(() => {
      this._sharedList.pushAll(order);
    });
    this._changed.emit({
      type: 'add',
      oldIndex: -1,
      newIndex: this.length - 1,
      oldValues: [],
      newValues: toArray(cells)
    });
    return this.length;
  }

  /**
   * Insert a set of items into the cell list at the specified index.
   *
   * @param index - The index at which to insert the cells.
   *
   * @param cells - The cells to insert at the specified index.
   *
   * @returns The new length of the cell list.
   *
   * #### Complexity.
   * Linear.
   *
   * #### Iterator Validity
   * No changes.
   *
   * #### Notes
   * The `index` will be clamped to the bounds of the cell list.
   *
   * #### Undefined Behavior.
   * An `index` which is non-integral.
   *
   * #### Notes
   * This should be considered to transfer ownership of the
   * cells to the `CellList`. As such, `cell.dispose()` should
   * not be called by other actors.
   */
  insertAll(index: number, cells: IterableOrArrayLike<ICellModel>): number {
    const order: string[] = [];
    each(cells, cell => {
      order.push(cell.id);
      this._cellMap.set(cell.id, cell);
      this._cells.set(cell.id, cell.sharedModel);
      cell.initialize();
    });
    globalMutex(() => {
      this._sharedList.insertAll(index, order);
    });
    this._changed.emit({
      type: 'add',
      oldIndex: -2,
      newIndex: index,
      oldValues: [],
      newValues: toArray(cells)
    });
    return this.length;
  }

  /**
   * Remove a range of items from the cell list.
   *
   * @param startIndex - The start index of the range to remove (inclusive).
   *
   * @param endIndex - The end index of the range to remove (exclusive).
   *
   * @returns The new length of the cell list.
   *
   * #### Complexity
   * Linear.
   *
   * #### Iterator Validity
   * Iterators pointing to the first removed cell and beyond are invalid.
   *
   * #### Undefined Behavior
   * A `startIndex` or `endIndex` which is non-integral.
   */
  removeRange(
    startIndex: number,
    endIndex: number,
    del: boolean = true
  ): number {
    const oldValues: ICellModel[] = [];
    for (let i = startIndex; i < endIndex; i++) {
      const id = this._sharedList.get(i);
      oldValues.push(this._cellMap.delete(id)!);
      if (del) {
        this._cells.delete(id);
      }
    }
    globalMutex(() => {
      this._sharedList.removeRange(startIndex, endIndex);
    });
    this._changed.emit({
      type: 'remove',
      oldIndex: startIndex,
      newIndex: -1,
      oldValues,
      newValues: []
    });
    return this.length;
  }

  /**
   * Whether the object can redo changes.
   */
  get canRedo(): boolean {
    return this._sharedList.canRedo();
  }

  /**
   * Whether the object can undo changes.
   */
  get canUndo(): boolean {
    return this._sharedList.canUndo();
  }

  /**
   * Begin a compound operation.
   *
   * @param isUndoAble - Whether the operation is undoable.
   *   The default is `true`.
   */
  beginCompoundOperation(isUndoAble?: boolean): void {
    //this._cellOrder.beginCompoundOperation(isUndoAble);
  }

  /**
   * End a compound operation.
   */
  endCompoundOperation(): void {
    //this._cellOrder.endCompoundOperation();
  }

  /**
   * Undo an operation.
   */
  undo(): void {
    this._sharedList.undo();
  }

  /**
   * Redo an operation.
   */
  redo(): void {
    this._sharedList.redo();
  }

  /**
   * Clear the change stack.
   */
  clearUndo(): void {
    //this._sharedList.clearUndoHistory();
  }

  private _onOrderChanged(
    sender: ISharedList<string>,
    args: ISharedList.IChangedArgs<string>
  ): void {
    globalMutex(() => {
      // Get the old values before removing them
      const oldValues: ICellModel[] = [];
      each(args.oldValues, id => {
        oldValues.push(this._cellMap.get(id)!);
      });

      if (args.type === 'set') {
        args.newValues.forEach(id => {
          const cellType = this._cells.get(id)!;
          const cell = this._createCellModel(id, cellType);
          this._cellMap.set(id, cell);
          cell.initialize();
        });
      } else if (args.type === 'add') {
        args.newValues.forEach(id => {
          const cellType = this._cells.get(id)!;
          const cell = this._createCellModel(id, cellType);
          this._cellMap.set(id, cell);
          cell.initialize();
        });
      } else if (args.type === 'move') {
        // Do nothing
      } else if (args.type === 'remove') {
        // TODO: remove cells from the cell map
        // we need the oldValues
        // check which ones are missing and remove them
        args.oldValues.forEach(id => {
          this._cells.delete(id);
          this._cellMap.delete(id);
        });
      }

      // Get new values after creating them
      const newValues: ICellModel[] = [];
      each(args.newValues, id => {
        newValues.push(this._cellMap.get(id)!);
      });

      this._changed.emit({
        type: args.type,
        oldIndex: args.oldIndex,
        newIndex: args.newIndex,
        oldValues,
        newValues
      });
    });
  }

  private _createCellModel(
    id: string,
    sharedModel: ISharedMap<ISharedType>
  ): ICellModel {
    const sharedDoc = this._sharedDoc;
    let cell: ICellModel;
    switch (sharedModel.get('type')) {
      case 'code':
        cell = this._factory.createCodeCell({
          id,
          sharedDoc,
          sharedModel
        });
        break;
      case 'markdown':
        cell = this._factory.createMarkdownCell({
          id,
          sharedDoc,
          sharedModel
        });
        break;
      default:
        cell = this._factory.createRawCell({
          id,
          sharedDoc,
          sharedModel
        });
        break;
    }
    return cell;
  }

  private _isDisposed: boolean = false;
  private _cellMap: IObservableMap<ICellModel>;
  private _sharedDoc: ISharedDoc;
  private _sharedList: ISharedList<string>;
  private _cells: ISharedMap<ISharedMap<ISharedType>>;
  private _changed = new Signal<this, IObservableList.IChangedArgs<ICellModel>>(
    this
  );
  private _factory: NotebookModel.IContentFactory;
}
