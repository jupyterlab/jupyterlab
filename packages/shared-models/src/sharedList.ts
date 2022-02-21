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
import { IShared, ISharedType, SharedDoc } from './model';

/**
 * A list which can be observed for changes.
 */
export interface ISharedList<T extends ISharedType> extends IShared {
  /**
   * The type of this object.
   */
  readonly type: 'List';

  /**
   * The specific model behind the ISharedString abstraction.
   *
   * Note: The default implementation is based on Yjs so the underlying
   * model is a YText.
   */
  readonly underlyingModel: any;

  readonly undoManager: any;

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
   * Dispose of the resources held by the list.
   */
  dispose(): void;

  /**
   * Whether the SharedMap can undo changes.
   */
  canUndo(): boolean;

  /**
   * Whether the SharedMap can redo changes.
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
   * The change types which occur on an observable list.
   */
  export type ChangeType =
    /**
     * Item(s) were added to the list.
     */
    | 'add'

    /**
     * An item was moved within the list.
     */
    | 'move'

    /**
     * Item(s) were removed from the list.
     */
    | 'remove'

    /**
     * An item was set in the list.
     */
    | 'set';

  /**
   * The changed args object which is emitted by an observable list.
   */
  export interface IChangedArgs<T> {
    /**
     * The type of change undergone by the vector.
     */
    type: ChangeType;

    /**
     * The new index associated with the change.
     */
    newIndex: number;

    /**
     * The new values associated with the change.
     *
     * #### Notes
     * The values will be contiguous starting at the `newIndex`.
     */
    newValues: T[];

    /**
     * The old index associated with the change.
     */
    oldIndex: number;

    /**
     * The old values associated with the change.
     *
     * #### Notes
     * The values will be contiguous starting at the `oldIndex`.
     */
    oldValues: T[];
  }
}

/**
 * A concrete implementation of ISharedList.
 */
export class SharedList<T extends ISharedType> implements ISharedList<T> {
  private _yarray: Y.Array<any>;
  private _doc: SharedDoc;
  private _undoManager: Y.UndoManager;
  private _isDisposed: boolean = false;
  private _oldLength = 0;
  private _changed = new Signal<this, ISharedList.IChangedArgs<T>>(this);

  /**
   * Construct a new SharedMap.
   */
  constructor(options: SharedList.IOptions) {
    if (options.yarray) {
      this._yarray = options.yarray;
    } else {
      this._yarray = new Y.Array<any>();
    }

    this._doc = options.doc;

    if (options.initialize !== false) {
      this.initialize();
    }

    this._yarray.observe(this._onArrayChanged);
  }

  /**
   * The type of this object.
   */
  get type(): 'List' {
    return 'List';
  }

  get underlyingModel(): Y.Array<any> {
    return this._yarray;
  }

  get undoManager(): any {
    return this._undoManager;
  }

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
    return this._yarray.length;
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
    this._yarray.unobserve(this._onArrayChanged);
  }

  initialize(): void {
    this._undoManager = new Y.UndoManager(this._yarray, {
      trackedOrigins: new Set([this])
    });
  }

  /**
   * Whether the SharedMap can undo changes.
   */
  canUndo(): boolean {
    return this._undoManager.undoStack.length > 0;
  }

  /**
   * Whether the SharedMap can redo changes.
   */
  canRedo(): boolean {
    return this._undoManager.redoStack.length > 0;
  }

  /**
   * Undo an operation.
   */
  undo(): void {
    this._undoManager.undo();
  }

  /**
   * Redo an operation.
   */
  redo(): void {
    this._undoManager.redo();
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
    this._yarray.forEach((v: any, i: number) => {
      values.push(SharedDoc.abstractTypeToISharedType(v, this._doc) as T);
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
      this._yarray.get(index),
      this._doc
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
    this._doc.transact(() => {
      this._yarray.delete(index);
      this._yarray.insert(index, [SharedDoc.sharedTypeToAbstractType(value)]);
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
    this._doc.transact(() => {
      this._yarray.push([SharedDoc.sharedTypeToAbstractType(value)]);
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
    this._doc.transact(() => {
      this._yarray.insert(index, [SharedDoc.sharedTypeToAbstractType(value)]);
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
    // TODO: make sure it is comparing properly
    const index = ArrayExt.findFirstIndex(this._yarray.toArray(), item => {
      return item === SharedDoc.sharedTypeToAbstractType(value);
    });
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
    this._doc.transact(() => {
      oldVal = SharedDoc.abstractTypeToISharedType(
        this._yarray.get(index),
        this._doc
      );
      this._yarray.delete(index);
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
    this._doc.transact(() => {
      this._yarray.delete(0, this.length);
    });
  }

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
  move(fromIndex: number, toIndex: number): void {
    // TODO: use the new move feature from yjs
    if (this.length <= 1 || fromIndex === toIndex) {
      return;
    }
    this._doc.transact(() => {
      const value = this._yarray.get(fromIndex);
      this._yarray.delete(fromIndex);
      this._yarray.insert(toIndex, [value]);
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
    this._doc.transact(() => {
      this._yarray.push(types);
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
    this._doc.transact(() => {
      this._yarray.insert(index, types);
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
    this._doc.transact(() => {
      this._yarray.delete(startIndex, endIndex - startIndex);
    });
    return this.length;
  }

  private _onArrayChanged = (event: Y.YArrayEvent<any>): void => {
    let currpos = 0;
    let args: ISharedList.IChangedArgs<ISharedType> | any = {};

    const oldValues: any[] = [];
    event.changes.deleted.forEach(item => {
      // Y.Text: type._start!.content.str
      // Y.Array: type._start!.content.arr
      // Y.Map type._map!.get('test').content.arr
      const content = item.content.getContent();
      content.forEach(type => {
        oldValues.push(
          SharedDoc.abstractTypeToISharedType(type, this._doc) as T
        );
      });
    });

    event.changes.delta.forEach(delta => {
      //console.debug(args);
      //console.debug(delta);

      if (
        args.type === 'add' &&
        args.newValues.length === 1 &&
        delta.delete === 1 &&
        args.newIndex === currpos - 1
      ) {
        //console.debug('SET:');
        /* TODO:
         * ModelDb returns the old value, but we can not extract
         * the old value from the YTextEvent. Should we return undefined?
         */
        args = {
          type: 'set',
          oldIndex: args.newIndex,
          newIndex: args.newIndex,
          oldValues,
          newValues: args.newValues
        };
      } else if (
        args.type === 'remove' &&
        delta.insert !== undefined &&
        delta.insert.length === 1 &&
        args.oldIndex !== currpos
      ) {
        //console.debug('MOVE:');
        const value = SharedDoc.abstractTypeToISharedType(
          delta.insert[0],
          this._doc
        ) as T;
        args = {
          type: 'move',
          oldIndex: args.oldIndex,
          newIndex: currpos,
          oldValues: [value],
          newValues: [value]
        };
      } else if (delta.insert != null) {
        const values = (delta.insert as any[]).map(
          type => SharedDoc.abstractTypeToISharedType(type, this._doc) as T
        );
        let oldIndex = -2;
        if (currpos + delta.insert.length === this._yarray.length) {
          oldIndex = -1;
        }
        //console.debug(oldIndex === -1 ? "PUSH" : "INSERT");
        // PUSH: oldIndex: -1, newIndex: this.length - 1
        // INSERT: oldIndex: -2, newIndex: currpos
        args = {
          type: 'add',
          oldIndex,
          newIndex: currpos,
          oldValues,
          newValues: values
        };
        currpos += delta.insert.length;
      } else if (delta.delete != null) {
        /* TODO:
         * ModelDb returns the old value, but we can not extract
         * the old value from the YTextEvent. Should we return undefined?
         */
        let newIndex = -1;
        if (currpos === 0 && delta.delete === this._oldLength) {
          newIndex = 0;
        }
        //console.debug(newIndex === -1 ? "REMOVE" : "CLEAR");
        // REMOVE: oldIndex: currpos, newIndex: -1
        // CLEAR: oldIndex: 0, newIndex: 0
        args = {
          type: 'remove',
          oldIndex: currpos,
          newIndex,
          oldValues,
          newValues: []
        };
      } else if (delta.retain != null) {
        currpos += delta.retain;
      }
    });

    //console.debug("_onArrayChanged:");
    //console.debug("DELTA:", event.changes.delta);
    //console.debug("EMIT:", args);
    this._oldLength = this._yarray.length;
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
  export interface IOptions {
    /**
     * A specific document to use as the store for this
     * SharedDoc.
     */
    doc: SharedDoc;

    /**
     * The underlying Y.Array for the SharedList.
     */
    yarray?: Y.Array<any>;

    initialize?: boolean;
  }
}
