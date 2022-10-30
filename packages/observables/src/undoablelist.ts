// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { JSONValue } from '@lumino/coreutils';
import { IObservableList, ObservableList } from './observablelist';

/**
 * An object which knows how to serialize and
 * deserialize the type T.
 */
export interface ISerializer<T> {
  /**
   * Convert the object to JSON.
   */
  toJSON(value: T): JSONValue;

  /**
   * Deserialize the object from JSON.
   */
  fromJSON(value: JSONValue): T;
}

/**
 * An observable list that supports undo/redo.
 */
export interface IObservableUndoableList<T> extends IObservableList<T> {
  /**
   * Whether the object can redo changes.
   */
  readonly canRedo: boolean;

  /**
   * Whether the object can undo changes.
   */
  readonly canUndo: boolean;

  /**
   * Begin a compound operation.
   *
   * @param isUndoAble - Whether the operation is undoable.
   *   The default is `false`.
   */
  beginCompoundOperation(isUndoAble?: boolean): void;

  /**
   * End a compound operation.
   */
  endCompoundOperation(): void;

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
}

/**
 * A concrete implementation of an observable undoable list.
 */
export class ObservableUndoableList<T>
  extends ObservableList<T>
  implements IObservableUndoableList<T>
{
  /**
   * Construct a new undoable observable list.
   */
  constructor(serializer: ISerializer<T>) {
    super();
    this._serializer = serializer;
    this.changed.connect(this._onListChanged, this);
  }

  /**
   * Whether the object can redo changes.
   */
  get canRedo(): boolean {
    return this._index < this._stack.length - 1;
  }

  /**
   * Whether the object can undo changes.
   */
  get canUndo(): boolean {
    return this._index >= 0;
  }

  /**
   * Begin a compound operation.
   *
   * @param isUndoAble - Whether the operation is undoable.
   *   The default is `true`.
   */
  beginCompoundOperation(isUndoAble?: boolean): void {
    this._inCompound = true;
    this._isUndoable = isUndoAble !== false;
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
    const changes = this._stack[this._index];
    this._isUndoable = false;
    for (const change of changes.reverse()) {
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
    const changes = this._stack[this._index];
    this._isUndoable = false;
    for (const change of changes) {
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
  private _onListChanged(
    list: IObservableList<T>,
    change: IObservableList.IChangedArgs<T>
  ): void {
    if (this.isDisposed || !this._isUndoable) {
      return;
    }
    // Clear everything after this position if necessary.
    if (!this._inCompound || !this._madeCompoundChange) {
      this._stack = this._stack.slice(0, this._index + 1);
    }
    // Copy the change.
    const evt = this._copyChange(change);
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
  private _undoChange(change: IObservableList.IChangedArgs<JSONValue>): void {
    let index = 0;
    const serializer = this._serializer;
    switch (change.type) {
      case 'add':
        for (let length = change.newValues.length; length > 0; length--) {
          this.remove(change.newIndex);
        }
        break;
      case 'set':
        index = change.oldIndex;
        for (const value of change.oldValues) {
          this.set(index++, serializer.fromJSON(value));
        }
        break;
      case 'remove':
        index = change.oldIndex;
        for (const value of change.oldValues) {
          this.insert(index++, serializer.fromJSON(value));
        }
        break;
      case 'move':
        this.move(change.newIndex, change.oldIndex);
        break;
      default:
        return;
    }
  }

  /**
   * Redo a change event.
   */
  private _redoChange(change: IObservableList.IChangedArgs<JSONValue>): void {
    let index = 0;
    const serializer = this._serializer;
    switch (change.type) {
      case 'add':
        index = change.newIndex;
        for (const value of change.newValues) {
          this.insert(index++, serializer.fromJSON(value));
        }
        break;
      case 'set':
        index = change.newIndex;
        for (const value of change.newValues) {
          this.set(change.newIndex++, serializer.fromJSON(value));
        }
        break;
      case 'remove':
        for (let length = change.oldValues.length; length > 0; length--) {
          this.remove(change.oldIndex);
        }
        break;
      case 'move':
        this.move(change.oldIndex, change.newIndex);
        break;
      default:
        return;
    }
  }

  /**
   * Copy a change as JSON.
   */
  private _copyChange(
    change: IObservableList.IChangedArgs<T>
  ): IObservableList.IChangedArgs<JSONValue> {
    const oldValues: JSONValue[] = [];
    for (const value of change.oldValues) {
      oldValues.push(this._serializer.toJSON(value));
    }
    const newValues: JSONValue[] = [];
    for (const value of change.newValues) {
      newValues.push(this._serializer.toJSON(value));
    }
    return {
      type: change.type,
      oldIndex: change.oldIndex,
      newIndex: change.newIndex,
      oldValues,
      newValues
    };
  }

  private _inCompound = false;
  private _isUndoable = true;
  private _madeCompoundChange = false;
  private _index = -1;
  private _stack: IObservableList.IChangedArgs<JSONValue>[][] = [];
  private _serializer: ISerializer<T>;
}

/**
 * Namespace for ObservableUndoableList utilities.
 */
export namespace ObservableUndoableList {
  /**
   * A default, identity serializer.
   */
  export class IdentitySerializer<T extends JSONValue>
    implements ISerializer<T>
  {
    /**
     * Identity serialize.
     */
    toJSON(value: T): JSONValue {
      return value;
    }

    /**
     * Identity deserialize.
     */
    fromJSON(value: JSONValue): T {
      return value as T;
    }
  }
}
