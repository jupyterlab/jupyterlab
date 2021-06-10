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
import * as models from '@jupyterlab/shared-models';
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
    model: models.ISharedNotebook
  ) {
    this._factory = factory;
    this._cellOrder = modelDB.createList<string>('cellOrder');
    this._cellMap = new ObservableMap<ICellModel>();

    this._cellOrder.changed.connect(this._onOrderChanged, this);
    this.nbmodel = model;
    this.nbmodel.changed.connect(this.onSharedModelChanged, this);
    this.changed.connect(this.onModelDBChanged, this);
  }

  type: 'List';
  nbmodel: models.ISharedNotebook;

  /**
   * Prevents that the modeldb event handler is executed when the shared-model event handler is executed and vice-versa.
   */
  private readonly _mutex = models.createMutex();

  private onModelDBChanged(
    self: CellList,
    change: IObservableList.IChangedArgs<ICellModel>
  ) {
    this._mutex(() => {
      const nbmodel = this.nbmodel;
      nbmodel.transact(() => {
        if (change.type === 'set' || change.type === 'remove') {
          nbmodel.deleteCellRange(
            change.oldIndex,
            change.oldIndex + change.oldValues.length
          );
        }
        if (
          change.type === 'set' ||
          change.type === 'add' ||
          change.type === 'move'
        ) {
          const cells = change.newValues.map(cell => {
            return cell.sharedModel.clone() as any;
          });
          let insertLocation = change.newIndex;
          if (change.type === 'move' && insertLocation > change.oldIndex) {
            insertLocation += change.oldValues.length;
          }
          nbmodel.insertCells(insertLocation, cells);
          change.newValues.forEach((cell, index) => {
            cell.switchSharedModel(cells[index], false);
          });
        }
        if (change.type === 'move') {
          let from = change.oldIndex;
          if (from >= change.newIndex) {
            from += change.oldValues.length;
          }
          nbmodel.deleteCellRange(from, from + change.oldValues.length);
        }
      });
    });
  }

  private onSharedModelChanged(
    self: models.ISharedNotebook,
    change: models.NotebookChange
  ) {
    this._mutex(() => {
      let currpos = 0;
      change.cellsChange?.forEach(delta => {
        if (delta.insert != null) {
          const cells = delta.insert.map(nbcell => {
            const cell = this._factory.createCell(nbcell.cell_type, {});
            cell.switchSharedModel(nbcell as any, true);
            return cell;
          });
          this.insertAll(currpos, cells);
          currpos += delta.insert.length;
        } else if (delta.delete != null) {
          this.removeRange(currpos, currpos + delta.delete);
        } else if (delta.retain != null) {
          currpos += delta.retain;
        }
      });
    });
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
    return this._cellOrder.length === 0;
  }

  /**
   * Get the length of the cell list.
   *
   * @return The number of cells in the cell list.
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
    for (const id of toArray(this._cellOrder)) {
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
    this._cellOrder.dispose();
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
    return this._cellMap.get(this._cellOrder.get(index))!;
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
    this._cellMap.set(cell.id, cell);
    this._cellOrder.set(index, cell.id);
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
    const num = this._cellOrder.push(cell.id);
    return num;
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
    this._cellMap.set(cell.id, cell);
    this._cellOrder.insert(index, cell.id);
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
  removeValue(cell: ICellModel): number {
    const index = ArrayExt.findFirstIndex(
      toArray(this._cellOrder),
      id => this._cellMap.get(id) === cell
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
  remove(index: number): ICellModel {
    const id = this._cellOrder.get(index);
    this._cellOrder.remove(index);
    const cell = this._cellMap.get(id)!;
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
    this._cellOrder.clear();
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
    this._cellOrder.move(fromIndex, toIndex);
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
    const newValues = toArray(cells);
    each(newValues, cell => {
      // Set the internal data structures.
      this._cellMap.set(cell.id, cell);
      this._cellOrder.push(cell.id);
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
    const newValues = toArray(cells);
    each(newValues, cell => {
      this._cellMap.set(cell.id, cell);
      // @todo it looks like this compound operation shoult start before the `each` loop.
      this._cellOrder.beginCompoundOperation();
      this._cellOrder.insert(index++, cell.id);
      this._cellOrder.endCompoundOperation();
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
  removeRange(startIndex: number, endIndex: number): number {
    this._cellOrder.removeRange(startIndex, endIndex);
    return this.length;
  }

  /**
   * Whether the object can redo changes.
   */
  get canRedo(): boolean {
    return this.nbmodel.canRedo();
  }

  /**
   * Whether the object can undo changes.
   */
  get canUndo(): boolean {
    return this.nbmodel.canUndo();
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
    this.nbmodel.undo();
  }

  /**
   * Redo an operation.
   */
  redo(): void {
    this.nbmodel.redo();
  }

  /**
   * Clear the change stack.
   */
  clearUndo(): void {
    this.nbmodel.clearUndoHistory();
  }

  private _onOrderChanged(
    order: IObservableUndoableList<string>,
    change: IObservableList.IChangedArgs<string>
  ): void {
    if (change.type === 'add' || change.type === 'set') {
      each(change.newValues, id => {
        const existingCell = this._cellMap.get(id);
        if (existingCell == null) {
          const cellDB = this._factory.modelDB!;
          const cellType = cellDB.createValue(id + '.type');
          let cell: ICellModel;
          switch (cellType.get()) {
            case 'code':
              cell = this._factory.createCodeCell({ id: id });
              break;
            case 'markdown':
              cell = this._factory.createMarkdownCell({ id: id });
              break;
            default:
              cell = this._factory.createRawCell({ id: id });
              break;
          }
          this._cellMap.set(id, cell);
        } else if (!existingCell.sharedModel.isStandalone) {
          this._mutex(() => {
            // it does already exist, probably because it was deleted previously and we introduced it
            // copy it to a fresh codecell instance
            const cell = existingCell.toJSON();
            let freshCell = null;
            switch (cell.cell_type) {
              case 'code':
                freshCell = this._factory.createCodeCell({ cell });
                break;
              case 'markdown':
                freshCell = this._factory.createMarkdownCell({ cell });
                break;
              default:
                freshCell = this._factory.createRawCell({ cell });
                break;
            }
            this._cellMap.set(id, freshCell);
          });
        }
      });
    }
    const newValues: ICellModel[] = [];
    const oldValues: ICellModel[] = [];
    each(change.newValues, id => {
      newValues.push(this._cellMap.get(id)!);
    });
    each(change.oldValues, id => {
      oldValues.push(this._cellMap.get(id)!);
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
  private _cellOrder: IObservableUndoableList<string>;
  private _cellMap: IObservableMap<ICellModel>;
  private _changed = new Signal<this, IObservableList.IChangedArgs<ICellModel>>(
    this
  );
  private _factory: NotebookModel.IContentFactory;
}
