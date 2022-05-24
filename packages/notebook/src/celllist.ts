// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  CodeCellModel,
  ICellModel,
  MarkdownCellModel,
  RawCellModel
} from '@jupyterlab/cells';
import {
  IObservableList,
  IObservableMap,
  ObservableList,
  ObservableMap
} from '@jupyterlab/observables';
import * as models from '@jupyterlab/shared-models';
import { ISharedRawCell } from '@jupyterlab/shared-models';
import { ISignal, Signal } from '@lumino/signaling';

/**
 * A cell list object that supports undo/redo.
 */
export class CellList {
  /**
   * Construct the cell list.
   */
  constructor(model: models.ISharedNotebook) {
    this._cellOrder = new ObservableList();
    this._cellMap = new ObservableMap<ICellModel>();
    this.nbmodel = model;
    this._cellOrder.changed.connect(this._onOrderChanged, this);
    this.nbmodel.changed.connect(this.onSharedModelChanged, this);
    this._insertCells(0, this.nbmodel.cells);
  }

  type: 'List';
  nbmodel: models.ISharedNotebook;

  private _insertCells(index: number, cells: Array<models.ISharedCell>) {
    const cellModels = cells.map(nbcell => {
      switch (nbcell.cell_type) {
        case 'code': {
          return new CodeCellModel({
            sharedModel: nbcell
          });
        }
        case 'markdown': {
          return new MarkdownCellModel({
            sharedModel: nbcell
          });
        }
        default: {
          return new RawCellModel({
            sharedModel: nbcell as ISharedRawCell
          });
        }
      }
    });
    for(const cell of cellModels){
      this._cellMap.set(cell.id, cell);
      this._cellOrder.insert(index++, cell.id);
    }
    return this.length;
  }

  private onSharedModelChanged(
    self: models.ISharedNotebook,
    change: models.NotebookChange
  ) {
    let currpos = 0;
    change.cellsChange?.forEach(delta => {
      if (delta.insert != null) {
        this._insertCells(currpos, delta.insert);
        currpos += delta.insert.length;
      } else if (delta.delete != null) {
        this._cellOrder.removeRange(currpos, currpos + delta.delete);
      } else if (delta.retain != null) {
        currpos += delta.retain;
      }
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
    return this._cellOrder.length;
  }

  /**
   * Create an iterator over the cells in the cell list.
   *
   * @returns A new iterator starting at the front of the cell list.
   */
  *[Symbol.iterator](): IterableIterator<ICellModel> {
    for (const id of this._cellOrder) {
      yield this._cellMap.get(id)!;
    }
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

  private _onOrderChanged(
    order: IObservableList<string>,
    change: IObservableList.IChangedArgs<string>
  ): void {
    const newValues: ICellModel[] = [];
    const oldValues: ICellModel[] = [];
    for (const id of change.newValues) {
      newValues.push(this._cellMap.get(id)!);
    }
    for (const id of change.oldValues) {
      oldValues.push(this._cellMap.get(id)!);
    }
    this._changed.emit({
      type: change.type,
      oldIndex: change.oldIndex,
      newIndex: change.newIndex,
      oldValues,
      newValues
    });
  }

  private _isDisposed: boolean = false;
  private _cellOrder: IObservableList<string>;
  private _cellMap: IObservableMap<ICellModel>;
  private _changed = new Signal<this, IObservableList.IChangedArgs<ICellModel>>(
    this
  );
}
