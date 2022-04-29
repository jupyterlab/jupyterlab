// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ArrayExt,
  ArrayIterator,
  IIterator,
  IterableOrArrayLike
} from '@lumino/algorithm';
import { ISignal, Signal } from '@lumino/signaling';
import * as Y from 'yjs';
import { Delta, IShared, ISharedType, IUndoManager, SharedDoc } from './model';

/**
 * A list which can be shared by multiple clients.
 */
export interface ISharedList<T extends ISharedType> extends IShared {
  /**
   * The type of this IShared.
   */
  readonly type: 'List';

  /**
   * The specific model behind the ISharedList abstraction.
   *
   * #### Notes
   * The default implementation is based on Yjs so the underlying
   * model is a YList.
   */
  readonly underlyingModel: any;

  /**
   * A signal emitted when the list has changed.
   */
  readonly changed: ISignal<this, ISharedList.IChangedArgs<T>>;

  /**
   * The length of the list.
   *
   * #### Notes
   * This is a read-only property.
   */
  readonly length: number;

  /**
   * The specific undo manager class behind the IShared abstraction.
   *
   * #### Notes
   * The default implementation is based on Yjs so the underlying
   * model is a Y.UndoManager.
   *
   * TODO: Define an API
   */
  undoManager: IUndoManager;

  /**
   * Dispose of the resources held by the list.
   */
  dispose(): void;

  /**
   * Perform a transaction. While the function f is called, all changes to the SharedList
   * document are bundled into a single event.
   */
  transact(f: () => void): void;

  /**
   * Whether the ISharedList can undo changes.
   */
  canUndo(): boolean;

  /**
   * Whether the ISharedList can redo changes.
   */
  canRedo(): boolean;

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
   * Create an iterator over the values in the list.
   *
   * @returns A new iterator starting at the front of the list.
   *
   * #### Complexity
   * Constant.
   *
   * #### Iterator Validity
   * No changes.
   */
  iter(): IIterator<T>;

  /**
   * Remove all values from the list.
   *
   * #### Complexity
   * Linear.
   *
   * #### Iterator Validity
   * All current iterators are invalidated.
   */
  clear(): void;

  /**
   * Get the value at the specified index.
   *
   * @param index - The positive integer index of interest.
   *
   * @returns The value at the specified index.
   *
   * #### Undefined Behavior
   * An `index` which is non-integral or out of range.
   */
  get(index: number): T;

  /**
   * Insert a value into the list at a specific index.
   *
   * @param index - The index at which to insert the value.
   *
   * @param value - The value to set at the specified index.
   *
   * #### Complexity
   * Linear.
   *
   * #### Iterator Validity
   * No changes.
   *
   * #### Notes
   * The `index` will be clamped to the bounds of the list.
   *
   * #### Undefined Behavior
   * An `index` which is non-integral.
   */
  insert(index: number, value: T): void;

  /**
   * Insert a set of items into the list at the specified index.
   *
   * @param index - The index at which to insert the values.
   *
   * @param values - The values to insert at the specified index.
   *
   * #### Complexity.
   * Linear.
   *
   * #### Iterator Validity
   * No changes.
   *
   * #### Notes
   * The `index` will be clamped to the bounds of the list.
   *
   * #### Undefined Behavior.
   * An `index` which is non-integral.
   */
  insertAll(index: number, values: IterableOrArrayLike<T>): void;

  /**
   * Move a value from one index to another.
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
  move(fromIndex: number, toIndex: number): void;

  /**
   * Move multiple values from one index to another.
   * NOTE: not ready yet
   *
   * @parm start - The start index of the elements to move.
   *
   * @parm end - The end index of the elements to move.
   *
   * @param toIndex - The index to move the element to.
   */
  moveRange(start: number, end: number, toIndex: number): void;

  /**
   * Add a value to the back of the list.
   *
   * @param value - The value to add to the back of the list.
   *
   * @returns The new length of the list.
   *
   * #### Complexity
   * Constant.
   *
   * #### Iterator Validity
   * No changes.
   */
  push(value: T): number;

  /**
   * Push a set of values to the back of the list.
   *
   * @param values - An iterable or array-like set of values to add.
   *
   * @returns The new length of the list.
   *
   * #### Complexity
   * Linear.
   *
   * #### Iterator Validity
   * No changes.
   */
  pushAll(values: IterableOrArrayLike<T>): number;

  /**
   * Remove and return the value at a specific index.
   *
   * @param index - The index of the value of interest.
   *
   * @returns The value at the specified index, or `undefined` if the
   *   index is out of range.
   *
   * #### Complexity
   * Constant.
   *
   * #### Iterator Validity
   * Iterators pointing at the removed value and beyond are invalidated.
   *
   * #### Undefined Behavior
   * An `index` which is non-integral.
   */
  remove(index: number): T | undefined;

  /**
   * Remove a range of items from the list.
   *
   * @param startIndex - The start index of the range to remove (inclusive).
   *
   * @param endIndex - The end index of the range to remove (exclusive).
   *
   * @returns The new length of the list.
   *
   * #### Complexity
   * Linear.
   *
   * #### Iterator Validity
   * Iterators pointing to the first removed value and beyond are invalid.
   *
   * #### Undefined Behavior
   * A `startIndex` or `endIndex` which is non-integral.
   */
  removeRange(startIndex: number, endIndex: number): number;

  /**
   * Remove the first occurrence of a value from the list.
   *
   * @param value - The value of interest.
   *
   * @returns The index of the removed value, or `-1` if the value
   *   is not contained in the list.
   *
   * #### Complexity
   * Linear.
   *
   * #### Iterator Validity
   * Iterators pointing at the removed value and beyond are invalidated.
   */
  removeValue(value: T): number;

  /**
   * Set the value at the specified index.
   *
   * @param index - The positive integer index of interest.
   *
   * @param value - The value to set at the specified index.
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
  set(index: number, value: T): void;
}

/**
 * The namespace for ISharedList related interfaces.
 */
export namespace ISharedList {
  /**
   * The changed args object which is emitted by an ISharedList.
   */
  export interface IChangedArgs<T> {
    /**
     * Added elements.
     */
    added: Set<T>;

    /**
     * Deleted elements.
     *
     * #### Notes
     * If the element is an IShare, its content
     * is not available anymore.
     */
    deleted: Set<T>;

    /**
     * A Quill-inspired delta with the changes.
     * #### Notes
     * Changes on Sequence-like data are expressed as Quill-inspired deltas.
     *
     * @source https://quilljs.com/docs/delta/
     */
    delta: Array<Delta<Array<T>>>;
  }
}

/**
 * A concrete implementation of ISharedList.
 */
export class SharedList<T extends ISharedType> implements ISharedList<T> {
  private _sharedDoc: SharedDoc;
  private _undoManager: Y.UndoManager | undefined;
  private _isDisposed: boolean = false;
  private _changed = new Signal<this, ISharedList.IChangedArgs<T>>(this);

  /**
   * Construct a new SharedList.
   */
  constructor(options: SharedList.IOptions) {
    this._sharedDoc = options.sharedDoc;

    if (options.underlyingModel) {
      this.underlyingModel = options.underlyingModel;
    } else {
      this.underlyingModel = new Y.Array<any>();
    }

    this._undoManager = options.undoManager;
    this._undoManager?.addTrackedOrigin(SharedList);

    this.underlyingModel.observe(this._onArrayChanged);
  }

  /**
   * The type of this IShared.
   */
  readonly type = 'List';

  /**
   * The specific model behind the ISharedList abstraction.
   *
   * #### Notes
   * The default implementation is based on Yjs so the underlying
   * model is a YArray.
   */
  readonly underlyingModel: Y.Array<any>;

  /**
   * A signal emitted when the list has changed.
   */
  get changed(): ISignal<this, ISharedList.IChangedArgs<T>> {
    return this._changed;
  }

  /**
   * The length of the list.
   */
  get length(): number {
    return this.underlyingModel.length;
  }

  /**
   * The specific undo manager class behind the IShared abstraction.
   *
   * #### Notes
   * The default implementation is based on Yjs so the underlying
   * model is a Y.UndoManager.
   *
   * TODO: Define an API
   */
  get undoManager(): Y.UndoManager | undefined {
    return this._undoManager;
  }
  set undoManager(undoManager: Y.UndoManager | undefined) {
    this._undoManager = undoManager;
    this._undoManager?.addTrackedOrigin(SharedList);
  }

  /**
   * Test whether the list has been disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Dispose of the resources held by the list.
   */
  dispose(): void {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    Signal.clearData(this);
    this.underlyingModel.unobserve(this._onArrayChanged);
  }

  /**
   * Perform a transaction. While the function f is called, all changes to the SharedList
   * document are bundled into a single event.
   */
  transact(f: () => void): void {
    this._sharedDoc.transact(f, this);
  }

  /**
   * Whether the ISharedList can undo changes.
   */
  canUndo(): boolean {
    return this._undoManager == undefined
      ? false
      : this._undoManager.undoStack.length > 0;
  }

  /**
   * Whether the ISharedList can redo changes.
   */
  canRedo(): boolean {
    return this._undoManager == undefined
      ? false
      : this._undoManager.redoStack.length > 0;
  }

  /**
   * Undo an operation.
   */
  undo(): void {
    this._undoManager?.undo();
  }

  /**
   * Redo an operation.
   */
  redo(): void {
    this._undoManager?.redo();
  }

  /**
   * Clear the change stack.
   */
  clearUndo(): void {
    this._undoManager?.clear();
  }

  /**
   * Create an iterator over the values in the list.
   *
   * @returns A new iterator starting at the front of the list.
   *
   * #### Complexity
   * Constant.
   *
   * #### Iterator Validity
   * No changes.
   */
  iter(): IIterator<T> {
    const values: T[] = [];
    this.underlyingModel.forEach((v: any, i: number) => {
      values.push(SharedDoc.abstractTypeToISharedType(v, this._sharedDoc) as T);
    });
    return new ArrayIterator(values);
  }

  /**
   * Get the value at the specified index.
   *
   * @param index - The positive integer index of interest.
   *
   * @returns The value at the specified index.
   *
   * #### Undefined Behavior
   * An `index` which is non-integral or out of range.
   */
  get(index: number): T {
    return SharedDoc.abstractTypeToISharedType(
      this.underlyingModel.get(index),
      this._sharedDoc
    ) as T;
  }

  /**
   * Set the value at the specified index.
   *
   * @param index - The positive integer index of interest.
   *
   * @param value - The value to set at the specified index.
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
  set(index: number, value: T): void {
    if (value === undefined) {
      throw new Error('Cannot set an undefined item');
    }
    this.transact(() => {
      this.underlyingModel.delete(index);
      this.underlyingModel.insert(index, [
        SharedDoc.sharedTypeToAbstractType(value)
      ]);
    });
  }

  /**
   * Add a value to the end of the list.
   *
   * @param value - The value to add to the end of the list.
   *
   * @returns The new length of the list.
   *
   * #### Complexity
   * Constant.
   *
   * #### Notes
   * By convention, the oldIndex is set to -1 to indicate
   * an push operation.
   *
   * #### Iterator Validity
   * No changes.
   */
  push(value: T): number {
    this.transact(() => {
      this.underlyingModel.push([SharedDoc.sharedTypeToAbstractType(value)]);
    });
    return this.length;
  }

  /**
   * Insert a value into the list at a specific index.
   *
   * @param index - The index at which to insert the value.
   *
   * @param value - The value to set at the specified index.
   *
   * #### Complexity
   * Linear.
   *
   * #### Iterator Validity
   * No changes.
   *
   * #### Notes
   * The `index` will be clamped to the bounds of the list.
   *
   * By convention, the oldIndex is set to -2 to indicate
   * an insert operation.
   *
   * The value -2 as oldIndex can be used to distinguish from the push
   * method which will use a value -1.
   *
   * #### Undefined Behavior
   * An `index` which is non-integral.
   */
  insert(index: number, value: T): void {
    this.transact(() => {
      this.underlyingModel.insert(index, [
        SharedDoc.sharedTypeToAbstractType(value)
      ]);
    });
  }

  /**
   * Remove the first occurrence of a value from the list.
   *
   * @param value - The value of interest.
   *
   * @returns The index of the removed value, or `-1` if the value
   *   is not contained in the list.
   *
   * #### Complexity
   * Linear.
   *
   * #### Iterator Validity
   * Iterators pointing at the removed value and beyond are invalidated.
   */
  removeValue(value: T): number {
    const index = ArrayExt.findFirstIndex(
      this.underlyingModel.toArray(),
      item => {
        return item === SharedDoc.sharedTypeToAbstractType(value);
      }
    );
    const val = this.remove(index);
    return val === undefined ? -1 : index;
  }

  /**
   * Remove and return the value at a specific index.
   *
   * @param index - The index of the value of interest.
   *
   * @returns The value at the specified index, or `undefined` if the
   *   index is out of range.
   *
   * #### Complexity
   * Constant.
   *
   * #### Iterator Validity
   * Iterators pointing at the removed value and beyond are invalidated.
   *
   * #### Undefined Behavior
   * An `index` which is non-integral.
   */
  remove(index: number): T | undefined {
    let oldVal;
    this.transact(() => {
      oldVal = SharedDoc.abstractTypeToISharedType(
        this.underlyingModel.get(index),
        this._sharedDoc
      );
      this.underlyingModel.delete(index);
    });
    return oldVal;
  }

  /**
   * Remove all values from the list.
   *
   * #### Complexity
   * Linear.
   *
   * #### Iterator Validity
   * All current iterators are invalidated.
   */
  clear(): void {
    this.transact(() => {
      this.underlyingModel.delete(0, this.length);
    });
  }

  /**
   * Push a set of values to the back of the list.
   *
   * @param values - An iterable or array-like set of values to add.
   *
   * @returns The new length of the list.
   *
   * #### Complexity
   * Linear.
   *
   * #### Notes
   * By convention, the oldIndex is set to -1 to indicate
   * an push operation.
   *
   * #### Iterator Validity
   * No changes.
   */
  pushAll(values: Array<T>): number {
    const types = values.map((value: T) =>
      SharedDoc.sharedTypeToAbstractType(value)
    );
    this.transact(() => {
      this.underlyingModel.push(types);
    });
    return this.length;
  }

  /**
   * Insert a set of items into the list at the specified index.
   *
   * @param index - The index at which to insert the values.
   *
   * @param values - The values to insert at the specified index.
   *
   * #### Complexity.
   * Linear.
   *
   * #### Iterator Validity
   * No changes.
   *
   * #### Notes
   * The `index` will be clamped to the bounds of the list.
   * By convention, the oldIndex is set to -2 to indicate
   * an insert operation.
   *
   * #### Undefined Behavior.
   * An `index` which is non-integral.
   */
  insertAll(index: number, values: Array<T>): void {
    const types = values.map((value: T) =>
      SharedDoc.sharedTypeToAbstractType(value)
    );
    this.transact(() => {
      this.underlyingModel.insert(index, types);
    });
  }

  /**
   * Move a value from one index to another.
   *
   * @parm fromIndex - The index of the element to move.
   *
   * @param toIndex - The index to move the element to.
   *
   * #### Iterator Validity
   * Iterators pointing at the lesser of the `fromIndex` and the `toIndex`
   * and beyond are invalidated.
   *
   * #### Undefined Behavior
   * A `fromIndex` or a `toIndex` which is non-integral.
   */
  move(fromIndex: number, toIndex: number): void {
    // TODO: use the new move feature from yjs
    if (this.length <= 1 || fromIndex === toIndex) {
      return;
    }
    //const adaptionIncrease = fromIndex < toIndex ? 1 : 0;
    this.transact(() => {
      //this.underlyingModel.move(fromIndex, toIndex + adaptionIncrease);
    });
  }

  /**
   * Move multiple values from one index to another.
   *
   * @parm start - The start index of the elements to move.
   *
   * @parm end - The end index of the elements to move.
   *
   * @param toIndex - The index to move the element to.
   */
  moveRange(start: number, end: number, toIndex: number): void {
    this.transact(() => {
      //const adaptionIncrease = start < toIndex ? end - start : 0;
      //this.underlyingModel.moveRange(start, end, toIndex + adaptionIncrease);
    });
  }

  /**
   * Remove a range of items from the list.
   *
   * @param startIndex - The start index of the range to remove (inclusive).
   *
   * @param endIndex - The end index of the range to remove (exclusive).
   *
   * @returns The new length of the list.
   *
   * #### Complexity
   * Linear.
   *
   * #### Iterator Validity
   * Iterators pointing to the first removed value and beyond are invalid.
   *
   * #### Undefined Behavior
   * A `startIndex` or `endIndex` which is non-integral.
   */
  removeRange(startIndex: number, endIndex: number): number {
    this.transact(() => {
      this.underlyingModel.delete(startIndex, endIndex - startIndex);
    });
    return this.length;
  }

  private _onArrayChanged = (event: Y.YArrayEvent<T>): void => {
    let args: ISharedList.IChangedArgs<T> = {
      added: new Set<T>(),
      deleted: new Set<T>(),
      delta: new Array<Delta<Array<T>>>()
    };

    // Y.Text: type._start!.content.str
    // Y.Array: type._start!.content.arr
    // Y.Map type._map!.get('test').content.arr
    event.changes.deleted.forEach(item => {
      const content = item.content.getContent();
      content.forEach(type => {
        args.deleted.add(
          SharedDoc.abstractTypeToISharedType(type, this._sharedDoc) as T
        );
      });
    });

    event.changes.delta.forEach(delta => {
      if (delta.insert != null) {
        const values = (delta.insert as any[]).map(type => {
          const item = SharedDoc.abstractTypeToISharedType(
            type,
            this._sharedDoc
          ) as T;
          args.added.add(item);
          return item;
        });
        args.delta.push({ insert: values });
      } else if (delta.delete != null) {
        args.delta.push({ delete: delta.delete });
      } else if (delta.retain != null) {
        args.delta.push({ retain: delta.retain });
      }
    });

    this._changed.emit(args);
  };
}

/**
 * The namespace for SharedList related interfaces.
 */
export namespace SharedList {
  /**
   * Options for creating a `SharedList` object.
   */
  export interface IOptions extends SharedDoc.IModelOptions {
    /**
     * A specific document to use as the store for this
     * SharedDoc.
     */
    sharedDoc: SharedDoc;

    /**
     * The underlying Y.Array for the SharedList.
     */
    underlyingModel?: Y.Array<any>;
  }
}
