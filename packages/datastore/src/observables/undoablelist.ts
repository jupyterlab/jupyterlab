// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IObservableUndoableList,
  ISerializer,
  IObservableList
} from '@jupyterlab/observables';

import { each } from '@phosphor/algorithm';

import { ReadonlyJSONValue } from '@phosphor/coreutils';

import { Schema } from '@phosphor/datastore';

import { ObservableList } from './list';

import { DatastoreManager } from '../manager';

/**
 * A concrete implementation of an observable undoable list.
 */
export class ObservableUndoableList<T extends ReadonlyJSONValue>
  extends ObservableList<T>
  implements IObservableUndoableList<T> {
  /**
   * Construct a new undoable observable list.
   */
  constructor(
    manager: DatastoreManager,
    schema: Schema,
    recordId: string,
    fieldId: string,
    serializer: ISerializer<T>
  ) {
    super(manager, schema, recordId, fieldId);
    this._serializer = serializer;
    this.changed.connect(
      this._onListChanged,
      this
    );
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
  private _undoChange(
    change: IObservableList.IChangedArgs<ReadonlyJSONValue>
  ): void {
    let index = 0;
    let serializer = this._serializer;
    switch (change.type) {
      case 'add':
        each(change.newValues, () => {
          this.remove(change.newIndex);
        });
        break;
      case 'set':
        index = change.oldIndex;
        each(change.oldValues, value => {
          this.set(index++, serializer.fromJSON(value));
        });
        break;
      case 'remove':
        index = change.oldIndex;
        each(change.oldValues, value => {
          this.insert(index++, serializer.fromJSON(value));
        });
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
  private _redoChange(
    change: IObservableList.IChangedArgs<ReadonlyJSONValue>
  ): void {
    let index = 0;
    let serializer = this._serializer;
    switch (change.type) {
      case 'add':
        index = change.newIndex;
        each(change.newValues, value => {
          this.insert(index++, serializer.fromJSON(value));
        });
        break;
      case 'set':
        index = change.newIndex;
        each(change.newValues, value => {
          this.set(change.newIndex++, serializer.fromJSON(value));
        });
        break;
      case 'remove':
        each(change.oldValues, () => {
          this.remove(change.oldIndex);
        });
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
  ): IObservableList.IChangedArgs<ReadonlyJSONValue> {
    let oldValues: ReadonlyJSONValue[] = [];
    each(change.oldValues, value => {
      oldValues.push(this._serializer.toJSON(value));
    });
    let newValues: ReadonlyJSONValue[] = [];
    each(change.newValues, value => {
      newValues.push(this._serializer.toJSON(value));
    });
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
  private _stack: IObservableList.IChangedArgs<ReadonlyJSONValue>[][] = [];
  private _serializer: ISerializer<T>;
}

/**
 * Namespace for ObservableUndoableList utilities.
 */
export namespace ObservableUndoableList {
  /**
   * A default, identity serializer.
   */
  export class IdentitySerializer<T extends ReadonlyJSONValue>
    implements ISerializer<T> {
    /**
     * Identity serialize.
     */
    toJSON(value: T): ReadonlyJSONValue {
      return value;
    }

    /**
     * Identity deserialize.
     */
    fromJSON(value: ReadonlyJSONValue): T {
      return value as T;
    }
  }
}
