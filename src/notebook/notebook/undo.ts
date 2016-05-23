import {
  IDisposable
} from 'phosphor-disposable';

import {
  IObservableList, ListChangeType, IListChangedArgs
} from 'phosphor-observablelist';

import {
  ICellModel
} from '../cells/model';

import {
  INotebookModel
} from './model';

import {
  IBaseCell
} from './nbformat';


/**
 * A stack that manages undo/redo for the the notebook.
 */
export
class NotebookUndo implements IDisposable {
  /**
   * Construct a new changestack.
   */
  constructor(model: INotebookModel) {
    this._model = model;
    this._model.cells.changed.connect(this._onCellsChanged, this);
  }

  /**
   * Whether the model can redo changes.
   *
   * #### Notes
   * This is a read-only property.
   */
  get canRedo(): boolean {
    return this._index < this._stack.length - 1;
  }

  /**
   * Whether the model can undo changes.
   *
   * #### Notes
   * This is a read-only property.
   */
  get canUndo(): boolean {
    return this._index >= 0;
  }

  /**
   * Get whether the model is disposed.
   *
   * #### Notes
   * This is a read-only property.
   */
  get isDisposed(): boolean {
    return this._model === null;
  }

  /**
   * Dispose of the resources held by the model.
   */
  dispose(): void {
    // Do nothing if already disposed.
    if (this.isDisposed) {
      return;
    }
    this._model = null;
    this._stack = null;
  }

  /**
   * Begin a compound operation.
   */
  beginCompoundOperation(isUndoAble?: boolean): void {
    this._inCompound = true;
    this._isUndoable = (isUndoAble !== false);
    this._madeCompoundChange = false;
  }

  /**
   * End a compound operation.
   */
  endCompoundOperation(): void {
    this._inCompound = false;
    this._isUndoable = true;
    if (this._madeCompoundChange) {
      this._index++;
    }
  }

  /**
   * Undo an operation.
   */
  undo(): void {
    if (!this.canUndo) {
      return;
    }
    let changes = this._stack[this._index];
    this._isUndoable = false;
    for (let change of changes.reverse()) {
      this._undoChange(change);
    }
    this._isUndoable = true;
    this._index--;
  }

  /**
   * Redo an operation.
   */
  redo(): void {
    if (!this.canRedo) {
      return;
    }
    this._index++;
    let changes = this._stack[this._index];
    this._isUndoable = false;
    for (let change of changes) {
      this._redoChange(change);
    }
    this._isUndoable = true;
  }

  /**
   * Clear the change stack.
   */
  clear(): void {
    this._index = -1;
    this._stack = [];
  }

  /**
   * Handle a change in the cells list.
   */
  private _onCellsChanged(list: IObservableList<ICellModel>, change: IListChangedArgs<ICellModel>): void {
    if (!this._isUndoable) {
      return;
    }
    // Clear everything after this position.
    this._stack = this._stack.slice(0, this._index + 1);
    // Copy the change.
    let evt = this._copyChange(change);
    // Put the change in the stack.
    if (this._stack[this._index + 1]) {
      this._stack[this._index + 1].push(evt);
    } else {
      this._stack.push([evt]);
    }
    // If not in a compound operation, increase index.
    if (!this._inCompound) {
      this._index++;
    } else {
      this._madeCompoundChange = true;
    }
  }

  /**
   * Undo a change event.
   */
  private _undoChange(change: IListChangedArgs<IBaseCell>): void {
    let cell: ICellModel;
    let list = this._model.cells;
    switch (change.type) {
    case ListChangeType.Add:
      list.removeAt(change.newIndex);
      break;
    case ListChangeType.Set:
      cell = this._createCell(change.oldValue as IBaseCell);
      list.set(change.oldIndex, cell);
      break;
    case ListChangeType.Remove:
      cell = this._createCell(change.oldValue as IBaseCell);
      list.insert(change.oldIndex, cell);
      break;
    case ListChangeType.Move:
      list.move(change.newIndex, change.oldIndex);
      break;
    case ListChangeType.Replace:
      let len = (change.newValue as IBaseCell[]).length;
      let cells = this._createCells(change.oldValue as IBaseCell[]);
      list.replace(change.oldIndex, len, cells);
      break;
    default:
      return;
    }
  }

  /**
   * Redo a change event.
   */
  private _redoChange(change: IListChangedArgs<IBaseCell>): void {
    let cell: ICellModel;
    let list = this._model.cells;
    switch (change.type) {
    case ListChangeType.Add:
      cell = this._createCell(change.newValue as IBaseCell);
      list.insert(change.newIndex, cell);
      break;
    case ListChangeType.Set:
      cell = this._createCell(change.newValue as IBaseCell);
      list.set(change.newIndex, cell);
      break;
    case ListChangeType.Remove:
      list.removeAt(change.oldIndex);
      break;
    case ListChangeType.Move:
      list.move(change.oldIndex, change.newIndex);
      break;
    case ListChangeType.Replace:
      let len = (change.oldValue as IBaseCell[]).length;
      let cells = this._createCells(change.newValue as IBaseCell[]);
      list.replace(change.oldIndex, len, cells);
      break;
    default:
      return;
    }
  }

  /**
   * Create a cell model from JSON.
   */
  private _createCell(data: IBaseCell): ICellModel {
    switch (data.cell_type) {
    case 'code':
      return this._model.createCodeCell(data);
    case 'markdown':
      return this._model.createMarkdownCell(data);
    default:
      return this._model.createRawCell(data);
    }
  }

  /**
   * Create a list of cell models from JSON.
   */
  private _createCells(bundles: IBaseCell[]): ICellModel[] {
    let cells: ICellModel[] = [];
    for (let bundle of bundles) {
      cells.push(this._createCell(bundle));
    }
    return cells;
  }

  /**
   * Copy a cell change as JSON.
   */
  private _copyChange(change: IListChangedArgs<ICellModel>): IListChangedArgs<IBaseCell> {
    if (change.type === ListChangeType.Replace) {
      return this._copyReplace(change);
    }
    let oldValue: IBaseCell = null;
    let newValue: IBaseCell = null;
    switch (change.type) {
    case ListChangeType.Add:
    case ListChangeType.Set:
    case ListChangeType.Remove:
      if (change.oldValue) {
        oldValue = (change.oldValue as ICellModel).toJSON();
      }
      if (change.newValue) {
        newValue = (change.newValue as ICellModel).toJSON();
      }
      break;
    case ListChangeType.Move:
      // Only need the indices.
      break;
    default:
      return;
    }
    if (oldValue) {
      (change.oldValue as ICellModel).dispose();
    }
    return {
      type: change.type,
      oldIndex: change.oldIndex,
      newIndex: change.newIndex,
      oldValue,
      newValue
    };
  }

  /**
   * Copy a cell replace change as JSON.
   */
  private _copyReplace(change: IListChangedArgs<ICellModel>): IListChangedArgs<IBaseCell> {
    let oldValue: IBaseCell[] = [];
    for (let cell of (change.oldValue as ICellModel[])) {
      oldValue.push(cell.toJSON());
      cell.dispose();
    }
    let newValue: IBaseCell[] = [];
    for (let cell of (change.newValue as ICellModel[])) {
      newValue.push(cell.toJSON());
    }
    return {
      type: ListChangeType.Replace,
      oldIndex: change.oldIndex,
      newIndex: change.newIndex,
      oldValue,
      newValue
    };
  }

  private _inCompound = false;
  private _isUndoable = true;
  private _madeCompoundChange = false;
  private _index = -1;
  private _stack: IListChangedArgs<IBaseCell>[][] = [];
  private _model: INotebookModel = null;
}
