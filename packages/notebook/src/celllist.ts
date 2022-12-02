// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  CellModel,
  CodeCellModel,
  ICellModel,
  MarkdownCellModel,
  RawCellModel
} from '@jupyterlab/cells';
import { IObservableList } from '@jupyterlab/observables';
import {
  ISharedCell,
  ISharedCodeCell,
  ISharedMarkdownCell,
  ISharedNotebook,
  ISharedRawCell,
  NotebookChange
} from '@jupyter/ydoc';
import { ISignal, Signal } from '@lumino/signaling';

/**
 * A cell list object that supports undo/redo.
 */
export class CellList {
  /**
   * Construct the cell list.
   */
  constructor(protected model: ISharedNotebook) {
    this._insertCells(0, this.model.cells);

    this.model.changed.connect(this._onSharedModelChanged, this);
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
   * Get the length of the cell list.
   *
   * @returns The number of cells in the cell list.
   */
  get length(): number {
    return this.model.cells.length;
  }

  /**
   * Create an iterator over the cells in the cell list.
   *
   * @returns A new iterator starting at the front of the cell list.
   */
  *[Symbol.iterator](): IterableIterator<ICellModel> {
    for (const cell of this.model.cells) {
      yield this._cellMap.get(cell)!;
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

    // Clean up the cell map and cell order objects.
    for (const cell of this.model.cells) {
      this._cellMap.get(cell)?.dispose();
    }
    Signal.clearData(this);
  }

  /**
   * Get the cell at the specified index.
   *
   * @param index - The positive integer index of interest.
   *
   * @returns The cell at the specified index.
   */
  get(index: number): ICellModel {
    return this._cellMap.get(this.model.cells[index])!;
  }

  private _insertCells(index: number, cells: Array<ISharedCell>) {
    cells.forEach(sharedModel => {
      let cellModel: CellModel;
      switch (sharedModel.cell_type) {
        case 'code': {
          cellModel = new CodeCellModel({
            sharedModel: sharedModel as ISharedCodeCell
          });
          break;
        }
        case 'markdown': {
          cellModel = new MarkdownCellModel({
            sharedModel: sharedModel as ISharedMarkdownCell
          });
          break;
        }
        default: {
          cellModel = new RawCellModel({
            sharedModel: sharedModel as ISharedRawCell
          });
        }
      }

      this._cellMap.set(sharedModel, cellModel);
      sharedModel.disposed.connect(() => {
        cellModel.dispose();
        this._cellMap.delete(sharedModel);
      });
    });

    return this.length;
  }

  private _onSharedModelChanged(self: ISharedNotebook, change: NotebookChange) {
    let currpos = 0;
    // We differ emitting the list changes to ensure cell model for all current shared cell have been created.
    const events = new Array<IObservableList.IChangedArgs<ICellModel>>();
    change.cellsChange?.forEach(delta => {
      if (delta.insert != null) {
        this._insertCells(currpos, delta.insert);
        events.push({
          type: 'add',
          newIndex: currpos,
          newValues: delta.insert.map(c => this._cellMap.get(c)!),
          oldIndex: -2,
          oldValues: []
        });

        currpos += delta.insert.length;
      } else if (delta.delete != null) {
        events.push({
          type: 'remove',
          newIndex: -1,
          newValues: [],
          oldIndex: currpos,
          // Cells have been disposed, so we don't know which one are gone.
          oldValues: new Array(delta.delete).fill(undefined)
        });
      } else if (delta.retain != null) {
        currpos += delta.retain;
      }
    });

    events.forEach(msg => this._changed.emit(msg));
  }

  private _cellMap = new WeakMap<ISharedCell, ICellModel>();
  private _changed = new Signal<this, IObservableList.IChangedArgs<ICellModel>>(
    this
  );
  private _isDisposed = false;
}
