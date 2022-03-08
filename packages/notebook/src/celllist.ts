// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ICellModel } from '@jupyterlab/cells';
import {
  IObservableList,
  IObservableMap,
  ObservableMap
} from '@jupyterlab/observables';
import {
  ISharedDoc,
  ISharedList,
  ISharedMap,
  ISharedType,
  IUndoManager
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
  readonly type: 'List';

  readonly underlyingModel: ISharedList<ISharedMap<ISharedType>>;

  /**
   * A signal emitted when the cell list has changed.
   */
  readonly changed: ISignal<this, IObservableList.IChangedArgs<ICellModel>>;

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
  removeValue(cell: ICellModel): number;

  /**
   * Remove and return the cell at a specific index.
   *
   * @param index - The index of the cell of interest.
   *
   * @returns The cell at the specified index, or `undefined` if the
   *   index is out of range.
   */
  remove(index: number): ICellModel;

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

/**
 * A cell list object that supports undo/redo.
 */
export class CellList implements ICellList {
  /**
   * Construct the cell list.
   */
  constructor(factory: NotebookModel.IContentFactory, sharedDoc: ISharedDoc) {
    this._factory = factory;
    this._cellMap = new ObservableMap<ICellModel>();

    this._sharedDoc = sharedDoc;
    this._sharedList = this._sharedDoc.createList<ISharedMap<ISharedType>>(
      'cellsOrder'
    );
    this._undoManager = this._sharedList.undoManager;

    this._sharedList.changed.connect(this._onOrderChanged, this);
  }

  readonly type: 'List';

  get underlyingModel(): ISharedList<ISharedMap<ISharedType>> {
    return this._sharedList;
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
    for (const cellType of toArray(this._sharedList)) {
      const id = cellType.get('id') as string;
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
    this._sharedList.dispose();
  }

  /**
   * Perform a transaction. While the function f is called, all changes to the shared
   * document are bundled into a single event.
   */
  transact(f: () => void): void {
    this._transactionsGuard(() => {
      this._sharedDoc.transact(f, this._sharedList);
    });
  }

  /**
   * Undo an operation.
   */
  undo(): void {
    this._undoManager.undo();
  }

  /**
   * Redo an operation.
   */
  redo(): void {
    this._undoManager.redo();
  }

  /**
   * Clear the change stack.
   */
  clearUndo(): void {
    this._undoManager.clear();
  }

  /**
   * Get the cell at the specified index.
   *
   * @param index - The positive integer index of interest.
   *
   * @returns The cell at the specified index.
   */
  get(index: number): ICellModel {
    const id = this._sharedList.get(index).get('id') as string;
    return this._cellMap.get(id)!;
  }

  /**
   * Set the cell at the specified index.
   *
   * @param index - The positive integer index of interest.
   *
   * @param cell - The cell to set at the specified index.
   */
  set(index: number, cell: ICellModel): void {
    // Set the internal data structures.
    this._operationsGuard(() => {
      const id = this._sharedList.get(index).get('id') as string;
      const oldValues: ICellModel[] =
        id !== undefined ? [this._cellMap.get(id)!] : [];

      this._cellMap.set(cell.id, cell);
      this._sharedList.set(index, cell.sharedModel);
      cell.initialize();

      this._changed.emit({
        type: 'set',
        oldIndex: index,
        newIndex: index,
        oldValues,
        newValues: [cell]
      });
    });
  }

  /**
   * Add a cell to the back of the cell list.
   *
   * @param cell - The cell to add to the back of the cell list.
   *
   * @returns The new length of the cell list.
   */
  push(cell: ICellModel): number {
    // Set the internal data structures.
    this._operationsGuard(() => {
      this._cellMap.set(cell.id, cell);
      this._sharedList.push(cell.sharedModel);
      cell.initialize();

      this._changed.emit({
        type: 'add',
        oldIndex: -1,
        newIndex: this.length - 1,
        oldValues: [],
        newValues: [cell]
      });
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
   */
  insert(index: number, cell: ICellModel): void {
    // Set the internal data structures.
    this._operationsGuard(() => {
      this._cellMap.set(cell.id, cell);
      this._sharedList.insert(index, cell.sharedModel);
      cell.initialize();

      this._changed.emit({
        type: 'add',
        oldIndex: -2,
        newIndex: index,
        oldValues: [],
        newValues: [cell]
      });
    });
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
      cellType => this._cellMap.get(cellType.get('id') as string) === cell
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
  remove(index: number): ICellModel {
    const id = this._sharedList.get(index).get('id') as string;
    const cell = this._cellMap.get(id)!;

    this._operationsGuard(() => {
      this._cellMap.delete(id);
      this._sharedList.remove(index);

      this._changed.emit({
        type: 'remove',
        oldIndex: index,
        newIndex: -1,
        oldValues: [cell],
        newValues: []
      });
    });
    return cell;
  }

  /**
   * Remove all cells from the cell list.
   */
  clear(): void {
    this._operationsGuard(() => {
      const oldValues: ICellModel[] = [];
      each(this._cellMap.values(), cell => {
        oldValues.push(cell);
      });

      this._cellMap.clear();
      this._sharedList.clear();

      this._changed.emit({
        type: 'remove',
        oldIndex: 0,
        newIndex: 0,
        oldValues,
        newValues: []
      });
    });
  }

  /**
   * Move a cell from one index to another.
   *
   * @parm fromIndex - The index of the element to move.
   *
   * @param toIndex - The index to move the element to.
   */
  move(fromIndex: number, toIndex: number): void {
    this._operationsGuard(() => {
      const id = this._sharedList.get(fromIndex).get('id') as string;
      const value = this._cellMap.get(id)!;

      this._sharedList.move(fromIndex, toIndex);

      this._changed.emit({
        type: 'move',
        oldIndex: fromIndex,
        newIndex: toIndex,
        oldValues: [value],
        newValues: [value]
      });
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
    this._operationsGuard(() => {
      const order: ISharedMap<ISharedType>[] = [];

      each(cells, cell => {
        order.push(cell.sharedModel);
        this._cellMap.set(cell.id, cell);
      });
      this._sharedList.pushAll(order);
      each(cells, cell => cell.initialize());

      this._changed.emit({
        type: 'add',
        oldIndex: -1,
        newIndex: this.length - 1,
        oldValues: [],
        newValues: toArray(cells)
      });
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
   */
  insertAll(index: number, cells: IterableOrArrayLike<ICellModel>): number {
    this._operationsGuard(() => {
      const order: ISharedMap<ISharedType>[] = [];

      each(cells, cell => {
        order.push(cell.sharedModel);
        this._cellMap.set(cell.id, cell);
      });
      this._sharedList.insertAll(index, order);
      each(cells, cell => cell.initialize());

      this._changed.emit({
        type: 'add',
        oldIndex: -2,
        newIndex: index,
        oldValues: [],
        newValues: toArray(cells)
      });
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
   */
  removeRange(startIndex: number, endIndex: number): number {
    this._operationsGuard(() => {
      const oldValues: ICellModel[] = [];
      for (let i = startIndex; i < endIndex; i++) {
        const id = this._sharedList.get(i).get('id') as string;
        oldValues.push(this._cellMap.delete(id)!);
      }
      this._sharedList.removeRange(startIndex, endIndex);

      this._changed.emit({
        type: 'remove',
        oldIndex: startIndex,
        newIndex: -1,
        oldValues,
        newValues: []
      });
    });
    return this.length;
  }

  private _operationsGuard(operation: () => void): void {
    if (!this._changeGuard) {
      try {
        this._changeGuard = true;
        operation();
      } finally {
        this._changeGuard = false;
      }
    }
  }

  private _transactionsGuard(operation: () => void): void {
    if (!this._transactionGuard) {
      try {
        this._transactionGuard = true;
        operation();
      } finally {
        this._transactionGuard = false;
      }
    }
  }

  private _onOrderChanged(
    sender: ISharedList<ISharedMap<ISharedType>>,
    args: ISharedList.IChangedArgs<ISharedMap<ISharedType>>
  ): void {
    this._transactionsGuard(() => {
      this._operationsGuard(() => {
        // Get the old values before removing them
        const oldValues: ICellModel[] = [];
        each(args.oldValues, (cellType: ISharedMap<ISharedType>) => {
          this._cellMap.values().forEach(cell => {
            if (cell.sharedModel.underlyingModel === cellType.underlyingModel) {
              oldValues.push(cell);
            }
          });
        });

        if (args.type === 'set') {
          args.newValues.forEach((cellType: ISharedMap<ISharedType>) => {
            const id = cellType.get('id') as string;
            const cell = this._createCellModel(id, cellType);
            this._cellMap.set(id, cell);
            cell.initialize();
          });
        } else if (args.type === 'add') {
          args.newValues.forEach((cellType: ISharedMap<ISharedType>) => {
            const id = cellType.get('id') as string;
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
          oldValues.forEach(cell => {
            this._cellMap.delete(cell.id);
          });
        }

        // Get new values after creating them
        const newValues: ICellModel[] = [];
        each(args.newValues, (cellType: ISharedMap<ISharedType>) => {
          const id = cellType.get('id') as string;
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
  private _changeGuard = false;
  private _transactionGuard = false;
  private _cellMap: IObservableMap<ICellModel>;
  private _sharedDoc: ISharedDoc;
  private _sharedList: ISharedList<ISharedMap<ISharedType>>;
  private _undoManager: IUndoManager;
  private _changed = new Signal<this, IObservableList.IChangedArgs<ICellModel>>(
    this
  );
  private _factory: NotebookModel.IContentFactory;
}
