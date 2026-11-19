// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { ICellModel } from '@jupyterlab/cells';
import {
  CellModel,
  CodeCellModel,
  MarkdownCellModel,
  RawCellModel
} from '@jupyterlab/cells';
import type { IObservableList } from '@jupyterlab/observables';
import type {
  ISharedCell,
  ISharedCodeCell,
  ISharedMarkdownCell,
  ISharedNotebook,
  ISharedRawCell,
  NotebookChange
} from '@jupyter/ydoc';
import type { ISignal } from '@lumino/signaling';
import { Signal } from '@lumino/signaling';

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
    for (const cell of this._cellList) {
      yield cell;
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
    for (const cell of this._cellList) {
      cell.dispose();
    }
    this._cellList.length = 0;
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
    return this._cellList[index] ?? this._cellMap.get(this.model.cells[index])!;
  }

  private _createCellModel(sharedModel: ISharedCell): CellModel {
    switch (sharedModel.cell_type) {
      case 'code':
        return new CodeCellModel({
          sharedModel: sharedModel as ISharedCodeCell
        });
      case 'markdown':
        return new MarkdownCellModel({
          sharedModel: sharedModel as ISharedMarkdownCell
        });
      default:
        return new RawCellModel({
          sharedModel: sharedModel as ISharedRawCell
        });
    }
  }

  private _insertCells(index: number, cells: Array<ISharedCell>) {
    cells.forEach((sharedModel, offset) => {
      const cellModel = this._createCellModel(sharedModel);
      this._cellMap.set(sharedModel, cellModel);
      this._cellList.splice(index + offset, 0, cellModel);
      sharedModel.disposed.connect(() => {
        this._cellMap.delete(sharedModel);
      });
    });

    return this.length;
  }

  private _onSharedModelChanged(self: ISharedNotebook, change: NotebookChange) {
    if (!change.cellsChange) {
      return;
    }

    let curr = 0;
    let delIndex = -1;
    let delCount = 0;
    let insIndex = -1;
    let insCount = 0;
    let insSharedCells: ISharedCell[] = [];

    for (const delta of change.cellsChange) {
      if (delta.retain != null) {
        curr += delta.retain;
      } else if (delta.delete != null) {
        delIndex = curr;
        delCount = delta.delete;
      } else if (delta.insert != null) {
        insIndex = curr;
        insCount = delta.insert.length;
        insSharedCells = delta.insert;
        curr += delta.insert.length;
      }
    }

    const events = new Array<IObservableList.IChangedArgs<ICellModel>>();

    // Check if this change represents a move operation
    if (delCount > 0 && insCount === delCount) {
      const origDelIndex = insIndex < delIndex ? delIndex - insCount : delIndex;
      const delCellModels = this._cellList.slice(
        origDelIndex,
        origDelIndex + delCount
      );
      const delIds = delCellModels.map(c => c.id);
      const insIds = insSharedCells.map(c => c.getId());

      const isMove =
        origDelIndex !== insIndex &&
        delIds.length === insIds.length &&
        delIds.every((id, i) => id === insIds[i]) &&
        delCellModels.every(
          (model, i) => model.type === insSharedCells[i].cell_type
        );

      if (isMove) {
        // Rewire existing cell models to the new shared models
        for (let i = 0; i < insCount; i++) {
          const cellModel = delCellModels[i];
          const newSharedModel = insSharedCells[i];
          if (cellModel instanceof CellModel) {
            cellModel.switchSharedModel(newSharedModel);
          }
          this._cellMap.set(newSharedModel, cellModel);
          newSharedModel.disposed.connect(() => {
            this._cellMap.delete(newSharedModel);
          });
        }

        // Update _cellList positions
        const moved = this._cellList.splice(origDelIndex, delCount);
        this._cellList.splice(insIndex, 0, ...moved);

        events.push({
          type: 'move',
          oldIndex: origDelIndex,
          newIndex: insIndex,
          oldValues: moved,
          newValues: moved
        });

        events.forEach(msg => this._changed.emit(msg));
        return;
      }
    }

    let currpos = 0;
    change.cellsChange.forEach(delta => {
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
        const removed = this._cellList.splice(currpos, delta.delete);
        removed.forEach(c => c.dispose());
        events.push({
          type: 'remove',
          newIndex: -1,
          newValues: [],
          oldIndex: currpos,
          oldValues: removed
        });
      } else if (delta.retain != null) {
        currpos += delta.retain;
      }
    });

    events.forEach(msg => this._changed.emit(msg));
  }

  private _cellList: ICellModel[] = [];
  private _cellMap = new WeakMap<ISharedCell, ICellModel>();
  private _changed = new Signal<this, IObservableList.IChangedArgs<ICellModel>>(
    this
  );
  private _isDisposed = false;
}
