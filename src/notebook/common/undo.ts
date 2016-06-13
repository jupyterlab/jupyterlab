// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IObservableList, ListChangeType, IListChangedArgs, ObservableList
} from 'phosphor-observablelist';


/**
 * An object which is JSON-able.
 */
export
interface IJSONable {
  /**
   * Convert the object to JSON.
   */
  toJSON(): any;
}


/**
 * An observable list that supports undo/redo.
 */
export
class ObservableUndoableList<T extends IJSONable> extends ObservableList<T> {
  /**
   * Construct a new undoable observable list.
   */
  constructor(factory: (value: any) => T) {
    super();
    this._factory = factory;
    this.changed.connect(this._onListChanged, this);
  }

  /**
   * Whether the object can redo changes.
   *
   * #### Notes
   * This is a read-only property.
   */
  get canRedo(): boolean {
    return this._index < this._stack.length - 1;
  }

  /**
   * Whether the object can undo changes.
   *
   * #### Notes
   * This is a read-only property.
   */
  get canUndo(): boolean {
    return this._index >= 0;
  }

  /**
   * Get whether the object is disposed.
   *
   * #### Notes
   * This is a read-only property.
   */
  get isDisposed(): boolean {
    return this._stack === null;
  }

  /**
   * Dispose of the resources held by the model.
   */
  dispose(): void {
    // Do nothing if already disposed.
    if (this.isDisposed) {
      return;
    }
    this._factory = null;
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
  clearUndo(): void {
    this._index = -1;
    this._stack = [];
  }

  /**
   * Handle a change in the list.
   */
  private _onListChanged(list: IObservableList<T>, change: IListChangedArgs<T>): void {
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
  private _undoChange(change: IListChangedArgs<any>): void {
    let value: T;
    switch (change.type) {
    case ListChangeType.Add:
      this.removeAt(change.newIndex);
      break;
    case ListChangeType.Set:
      value = this._createValue(change.oldValue as any);
      this.set(change.oldIndex, value);
      break;
    case ListChangeType.Remove:
      value = this._createValue(change.oldValue as any);
      this.insert(change.oldIndex, value);
      break;
    case ListChangeType.Move:
      this.move(change.newIndex, change.oldIndex);
      break;
    case ListChangeType.Replace:
      let len = (change.newValue as any[]).length;
      let values = this._createValues(change.oldValue as any[]);
      this.replace(change.oldIndex, len, values);
      break;
    default:
      return;
    }
  }

  /**
   * Redo a change event.
   */
  private _redoChange(change: IListChangedArgs<any>): void {
    let value: T;
    switch (change.type) {
    case ListChangeType.Add:
      value = this._createValue(change.newValue as any);
      this.insert(change.newIndex, value);
      break;
    case ListChangeType.Set:
      value = this._createValue(change.newValue as any);
      this.set(change.newIndex, value);
      break;
    case ListChangeType.Remove:
      this.removeAt(change.oldIndex);
      break;
    case ListChangeType.Move:
      this.move(change.oldIndex, change.newIndex);
      break;
    case ListChangeType.Replace:
      let len = (change.oldValue as any[]).length;
      let cells = this._createValues(change.newValue as any[]);
      this.replace(change.oldIndex, len, cells);
      break;
    default:
      return;
    }
  }

  /**
   * Create a value from JSON.
   */
  private _createValue(data: any): T {
    let factory = this._factory;
    return factory(data);
  }

  /**
   * Create a list of cell models from JSON.
   */
  private _createValues(bundles: any[]): T[] {
    let values: T[] = [];
    for (let bundle of bundles) {
      values.push(this._createValue(bundle));
    }
    return values;
  }

  /**
   * Copy a change as JSON.
   */
  private _copyChange(change: IListChangedArgs<T>): IListChangedArgs<any> {
    if (change.type === ListChangeType.Replace) {
      return this._copyReplace(change);
    }
    let oldValue: any = null;
    let newValue: any = null;
    switch (change.type) {
    case ListChangeType.Add:
    case ListChangeType.Set:
    case ListChangeType.Remove:
      if (change.oldValue) {
        oldValue = (change.oldValue as T).toJSON();
      }
      if (change.newValue) {
        newValue = (change.newValue as T).toJSON();
      }
      break;
    case ListChangeType.Move:
      // Only need the indices.
      break;
    default:
      return;
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
   * Copy a replace change as JSON.
   */
  private _copyReplace(change: IListChangedArgs<T>): IListChangedArgs<any> {
    let oldValue: any[] = [];
    for (let value of (change.oldValue as T[])) {
      oldValue.push(value.toJSON());
    }
    let newValue: any[] = [];
    for (let value of (change.newValue as T[])) {
      newValue.push(value.toJSON());
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
  private _stack: IListChangedArgs<any>[][] = [];
  private _factory: (value: any) => T = null;
}
