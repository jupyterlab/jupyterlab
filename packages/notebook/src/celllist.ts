// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { CellModel, ICellModel } from '@jupyterlab/cells';
import * as nbformat from '@jupyterlab/nbformat';
import {
  Delta,
  ISharedList,
  ISharedMap,
  ISharedType,
  SharedMap
} from '@jupyterlab/shared-models';
import {
  ArrayExt,
  ArrayIterator,
  each,
  IIterator,
  IterableOrArrayLike,
  toArray
} from '@lumino/algorithm';
import { IDisposable } from '@lumino/disposable';
import { ISignal, Signal } from '@lumino/signaling';

import { NotebookModel } from './model';

/**
 * A cell list object that supports undo/redo.
 */
export interface ICellList extends IDisposable {
  /**
   * The type of this object.
   */
  readonly type: 'List';

  /**
   * A signal emitted when the cell list has changed.
   */
  readonly changed: ISignal<this, ISharedList.IChangedArgs<ICellModel>>;

  /**
   * Test whether the list is empty.
   *
   * @returns `true` if the cell list is empty, `false` otherwise.
   */
  readonly isEmpty: boolean;

  /**
   * Get the length of the cell list.
   *
   * @returns The number of cells in the cell list.
   */
  readonly length: number;

  /**
   * Whether the object can redo changes.
   */
  readonly canRedo: boolean;

  /**
   * Whether the object can undo changes.
   */
  readonly canUndo: boolean;

  /**
   * Create an iterator over the cells in the cell list.
   *
   * @returns A new iterator starting at the front of the cell list.
   */
  iter(): IIterator<ICellModel>;

  /**
   * Dispose of the resources held by the cell list.
   */
  dispose(): void;

  /**
   * Perform a transaction. While the function f is called, all changes to the shared
   * document are bundled into a single event.
   */
  transact(f: () => void): void;

  /**
   * Undo an operation.
   */
  undo(): void;

  /**
   * Redo an operation.
   */
  redo(): void;

  /**
   * Clear the change stack.
   */
  clearUndo(): void;

  /**
   * Get the cell at the specified index.
   *
   * @param index - The positive integer index of interest.
   *
   * @returns The cell at the specified index.
   */
  get(index: number): ICellModel;

  /**
   * Set the cell at the specified index.
   *
   * @param index - The positive integer index of interest.
   *
   * @param cell - The cell to set at the specified index.
   */
  set(index: number, cell: ICellModel): void;

  /**
   * Add a cell to the back of the cell list.
   *
   * @param cell - The cell to add to the back of the cell list.
   *
   * @returns The new length of the cell list.
   */
  push(cell: ICellModel): number;

  /**
   * Insert a cell into the cell list at a specific index.
   *
   * @param index - The index at which to insert the cell.
   *
   * @param cell - The cell to set at the specified index.
   *
   * @returns The new length of the cell list.
   */
  insert(index: number, cell: ICellModel): void;

  /**
   * Remove the first occurrence of a cell from the cell list.
   *
   * @param cell - The cell of interest.
   *
   * @returns The index of the removed cell, or `-1` if the cell
   *   is not contained in the cell list.
   */
  removeValue(cell: ICellModel): number | -1;

  /**
   * Remove and return the cell at a specific index.
   *
   * @param index - The index of the cell of interest.
   *
   * @returns The cell at the specified index, or `undefined` if the
   *   index is out of range.
   */
  remove(index: number): ICellModel | undefined;

  /**
   * Remove all cells from the cell list.
   */
  clear(): void;

  /**
   * Move a cell from one index to another.
   *
   * @parm fromIndex - The index of the element to move.
   *
   * @param toIndex - The index to move the element to.
   */
  move(fromIndex: number, toIndex: number): void;

  /**
   * Push a set of cells to the back of the cell list.
   *
   * @param cells - An iterable or array-like set of cells to add.
   *
   * @returns The new length of the cell list.
   */
  pushAll(cells: IterableOrArrayLike<ICellModel>): number;

  /**
   * Insert a set of items into the cell list at the specified index.
   *
   * @param index - The index at which to insert the cells.
   *
   * @param cells - The cells to insert at the specified index.
   *
   * @returns The new length of the cell list.
   */
  insertAll(index: number, cells: IterableOrArrayLike<ICellModel>): number;

  /**
   * Remove a range of items from the cell list.
   *
   * @param startIndex - The start index of the range to remove (inclusive).
   *
   * @param endIndex - The end index of the range to remove (exclusive).
   *
   * @returns The new length of the cell list.
   */
  removeRange(startIndex: number, endIndex: number): number;
}

export namespace ICellList {
  export type IChangedArgs = ISharedList.IChangedArgs<ICellModel>;
}

/**
 * A cell list object that supports undo/redo.
 */
export class CellList implements ICellList {
  /**
   * Construct the cell list.
   */
  constructor(
    factory: NotebookModel.IContentFactory,
    sharedList: ISharedList<ISharedMap<ISharedType>>
  ) {
    this._factory = factory;
    this._cellMap = new Map<any, ICellModel>();

    this._sharedList = sharedList;
    this._sharedList.changed.connect(this._onOrderChanged, this);
  }

  /**
   * The type of this object.
   */
  readonly type: 'List';

  /**
   * A signal emitted when the cell list has changed.
   */
  get changed(): ISignal<this, ISharedList.IChangedArgs<ICellModel>> {
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
   */
  get isEmpty(): boolean {
    return this._sharedList.length === 0;
  }

  /**
   * Get the length of the cell list.
   *
   * @returns The number of cells in the cell list.
   */
  get length(): number {
    return this._sharedList.length;
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
   * Create an iterator over the cells in the cell list.
   *
   * @returns A new iterator starting at the front of the cell list.
   */
  iter(): IIterator<ICellModel> {
    const arr: ICellModel[] = [];
    each(this._sharedList, (cellType: SharedMap<ISharedType>, i: number) => {
      arr.push(this._cellMap.get(cellType.underlyingModel)!);
    });
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
    this._cellMap.clear();
    this._sharedList.dispose();
  }

  /**
   * Perform a transaction. While the function f is called, all changes to the shared
   * document are bundled into a single event.
   */
  transact(f: () => void): void {
    this._sharedList.transact(f);
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
    this._sharedList.clearUndo();
  }

  /**
   * Get the cell at the specified index.
   *
   * @param index - The positive integer index of interest.
   *
   * @returns The cell at the specified index.
   */
  get(index: number): ICellModel {
    const cellType = this._sharedList.get(index) as SharedMap<any>;
    return this._cellMap.get(cellType.underlyingModel)!;
  }

  /**
   * Set the cell at the specified index.
   *
   * @param index - The positive integer index of interest.
   *
   * @param cell - The cell to set at the specified index.
   */
  set(index: number, cell: ICellModel): void {
    const cellType = (cell as CellModel).sharedModel as SharedMap<any>;
    this._cellMap.set(cellType.underlyingModel, cell);
    this._sharedList.set(index, cellType);
  }

  /**
   * Add a cell to the back of the cell list.
   *
   * @param cell - The cell to add to the back of the cell list.
   *
   * @returns The new length of the cell list.
   */
  push(cell: ICellModel): number {
    const cellType = (cell as CellModel).sharedModel as SharedMap<any>;
    this._cellMap.set(cellType.underlyingModel, cell);
    this._sharedList.push(cellType);
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
   */
  insert(index: number, cell: ICellModel): void {
    const cellType = (cell as CellModel).sharedModel as SharedMap<any>;
    this._cellMap.set(cellType.underlyingModel, cell);
    this._sharedList.insert(index, cellType);
  }

  /**
   * Remove the first occurrence of a cell from the cell list.
   *
   * @param cell - The cell of interest.
   *
   * @returns The index of the removed cell, or `-1` if the cell
   *   is not contained in the cell list.
   */
  removeValue(cell: ICellModel): number {
    const index = ArrayExt.findFirstIndex(
      toArray(this._sharedList),
      (cellType: SharedMap<any>) =>
        this._cellMap.get(cellType.underlyingModel) === cell
    );
    this.remove(index);
    return index;
  }

  /**
   * Remove and return the cell at a specific index.
   *
   * @param index - The index of the cell of interest.
   *
   * @returns The cell at the specified index, or `undefined` if the
   *   index is out of range.
   */
  remove(index: number): ICellModel | undefined {
    const cellType = this._sharedList.get(index) as SharedMap<any>;
    const cell = this._cellMap.get(cellType.underlyingModel);
    this._sharedList.remove(index);
    return cell;
  }

  /**
   * Remove all cells from the cell list.
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
   */
  move(fromIndex: number, toIndex: number): void {
    if (
      this.length <= 1 ||
      fromIndex === toIndex ||
      toIndex < 0 ||
      toIndex >= this.length
    ) {
      return;
    }
    //this._sharedList.move(fromIndex, toIndex);
    const cellType = this._sharedList.get(fromIndex) as SharedMap<any>;
    const cell = this._cellMap.get(cellType.underlyingModel);
    const data = cell?.toJSON();
    const id = data?.id as string;
    const type = data?.cell_type as nbformat.CellType;
    const clone = this._factory.createCell(type, id, data);
    this.transact(() => {
      this.remove(fromIndex);
      this.insert(toIndex, clone);
    });
  }

  /**
   * Push a set of cells to the back of the cell list.
   *
   * @param cells - An iterable or array-like set of cells to add.
   *
   * @returns The new length of the cell list.
   */
  pushAll(cells: IterableOrArrayLike<ICellModel>): number {
    const order: ISharedMap<ISharedType>[] = [];
    each(cells, cell => {
      const cellType = (cell as CellModel).sharedModel as SharedMap<any>;
      order.push(cellType);
      this._cellMap.set(cellType.underlyingModel, cell);
    });
    this._sharedList.pushAll(order);
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
   */
  insertAll(index: number, cells: IterableOrArrayLike<ICellModel>): number {
    const order: ISharedMap<ISharedType>[] = [];
    each(cells, cell => {
      const cellType = (cell as CellModel).sharedModel as SharedMap<any>;
      order.push(cellType);
      this._cellMap.set(cellType.underlyingModel, cell);
    });
    this._sharedList.insertAll(index, order);
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
   */
  removeRange(startIndex: number, endIndex: number): number {
    this._sharedList.removeRange(startIndex, endIndex);
    return this.length;
  }

  private _onOrderChanged(
    sender: ISharedList<ISharedMap<ISharedType>>,
    args: ISharedList.IChangedArgs<ISharedMap<ISharedType>>
  ): void {
    const added = new Set<ICellModel>();
    args.added.forEach((cellType: SharedMap<any>) => {
      if (this._cellMap.has(cellType.underlyingModel)) {
        const cell = this._cellMap.get(cellType.underlyingModel)!;
        cell.initialize();
        added.add(cell);
      } else {
        const cell = this._factory.createCellFromSharedModel(cellType);
        this._cellMap.set(cellType.underlyingModel, cell);
        cell.initialize();
        added.add(cell);
      }
    });

    // Get the old values before removing them
    const deleted = new Set<ICellModel>();
    args.deleted.forEach((cellType: SharedMap<any>) => {
      if (this._cellMap.has(cellType.underlyingModel)) {
        const cell = this._cellMap.get(cellType.underlyingModel)!;
        this._cellMap.delete(cellType.underlyingModel);
        deleted.add(cell);
      }
    });

    const changes: ISharedList.IChangedArgs<ICellModel> = {
      added,
      deleted,
      delta: new Array<Delta<Array<ICellModel>>>()
    };
    args.delta.forEach(delta => {
      if (delta.insert != null) {
        const insertedCells = new Array<ICellModel>();
        delta.insert.forEach((cellType: SharedMap<any>) => {
          insertedCells.push(this._cellMap.get(cellType.underlyingModel)!);
        });
        changes.delta.push({ insert: insertedCells });
      } else if (delta.delete != null) {
        changes.delta.push({ delete: delta.delete });
      } else if (delta.retain != null) {
        changes.delta.push({ retain: delta.retain });
      }
    });
    this._changed.emit(changes);
  }

  private _isDisposed: boolean = false;
  private _cellMap: Map<any, ICellModel>;
  private _sharedList: ISharedList<ISharedMap<ISharedType>>;
  private _changed = new Signal<this, ISharedList.IChangedArgs<ICellModel>>(
    this
  );
  private _factory: NotebookModel.IContentFactory;
}
