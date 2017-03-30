// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JSONValue
} from '@phosphor/coreutils';

import {
  IterableOrArrayLike, each, toArray
} from '@phosphor/algorithm';

import {
  IObservableList, ObservableList
} from './observablelist';


/**
 * An observable vector that supports undo/redo.
 */
export
interface IObservableUndoableList<T> extends IObservableList<T> {
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
 * The namespace for IObservableUndoableList related interfaces.
 */
export
namespace IObservableUndoableList {
  /**
   * An object which knows how to serialize and
   * deserialize the type T.
   */
  export
  interface ISerializer<T> {
    /**
     * Convert the object to JSON.
     */
    toJSON(value: T): JSONValue;

    /**
     * Deserialize the object from JSON.
     */
    fromJSON(value: JSONValue): T;
  }
}


/**
 * A concrete implementation of an observable undoable vector.
 */
export
class ObservableUndoableList<T> extends ObservableList<T> implements IObservableUndoableList<T> {
  /**
   * Construct a new undoable observable vector.
   */
  constructor(options: ObservableUndoableList.IOptions<T>) {
    super(options);
    this._serializer = options.serializer;
    this.changed.connect(this._onListChanged, this);
    this._previous = toArray(this);
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
   * Dispose of the resources held by the model.
   */
  dispose(): void {
    this._serializer = null;
    this._stack = null;
    super.dispose();
  }

  /**
   * Begin a compound operation.
   *
   * @param isUndoAble - Whether the operation is undoable.
   *   The default is `true`.
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
   * Handle a change in the vector.
   */
  private _onListChanged(list: IObservableList<T>, change: IObservableList.IChangedArgs): void {
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
  private _undoChange(change: ObservableUndoableList.IChangedArgs): void {
    let index = 0;
    let serializer = this._serializer;
    switch (change.type) {
    case 'add':
      for (let i = 0; i < change.count; i++) {
        this.remove(change.newIndex);
      }
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
  private _redoChange(change: ObservableUndoableList.IChangedArgs): void {
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
  private _copyChange(change: IObservableList.IChangedArgs): ObservableUndoableList.IChangedArgs {
    let oldValues: JSONValue[] = [];
    let newValues: JSONValue[] = [];
    let toJSON = this._serializer.toJSON;
    let { newIndex, oldIndex, type, count } = change;

    switch (type) {
    case 'add':
      for (let i = 0; i < count; i++) {
        newValues.push(toJSON(this.get(i + newIndex)));
      }
      break;
    case 'set':
    case 'move':
      newValues.push(toJSON(this.get(newIndex)));
      oldValues.push(toJSON(this._previous[oldIndex]));
      break;
    case 'remove':
      for (let i = 0; i < count; i++) {
        oldValues.push(toJSON(this._previous[i + oldIndex]));
      }
      break;
    default:
      break;
    }
    this._previous = toArray(this);
    return {
      type,
      newIndex,
      oldIndex,
      count,
      newValues,
      oldValues
    };
  }

  private _inCompound = false;
  private _isUndoable = true;
  private _madeCompoundChange = false;
  private _index = -1;
  private _stack: ObservableUndoableList.IChangedArgs[][] = [];
  private _serializer: IObservableUndoableList.ISerializer<T> = null;
  private _previous: Array<T>;
}


/**
 * The namespace for ObservableUndoableList statics.
 */
export
namespace ObservableUndoableList {
  /**
   * The options used to create an ObservableUndoableList.
   */
  export
  interface IOptions<T> {
    /**
     * The serializer object for the list.
     */
    serializer: IObservableUndoableList.ISerializer<T>;

    /**
     * The initial values for the list.
     */
    values?: IterableOrArrayLike<T>;

    /**
     * The item comparison function for change detection on `set`.
     *
     * If not given, strict `===` equality will be used.
     */
    itemCmp?: (first: T, second: T) => boolean;
  }

  /**
   * The changed args object which is emitted by an observable list.
   */
  export
  interface IChangedArgs {
    /**
     * The type of change undergone by the list.
     */
    type: IObservableList.ChangeType;

    /**
     * The new index associated with the change.
     */
    newIndex: number;

    /**
     * The old index associated with the change.
     */
    oldIndex: number;

    /**
     * The number of items added or removed.
     */
    count: number;

    /**
     * The old values associated with the change.
     */
    oldValues: Array<JSONValue>;

    /**
     * The new values associated with the change.
     */
    newValues: Array<JSONValue>;
  }
}
