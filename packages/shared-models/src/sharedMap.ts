// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ISignal, Signal } from '@lumino/signaling';
import * as Y from 'yjs';
import { IShared, ISharedType, IUndoManager, SharedDoc } from './model';

/**
 * A map which can be shared by multiple clients.
 */
export interface ISharedMap<T extends ISharedType> extends IShared {
  /**
   * The type of the IShared.
   */
  readonly type: 'Map';

  /**
   * A signal emitted when the map has changed.
   */
  readonly changed: ISignal<this, ISharedMap.IChangedArgs<T>>;

  /**
   * The number of key-value pairs in the map.
   */
  readonly size: number;

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
   * Dispose of the resources held by the map.
   */
  dispose(): void;

  /**
   * Perform a transaction. While the function f is called, all changes to the SharedMap
   * document are bundled into a single event.
   */
  transact(f: () => void): void;

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
   * Clear the change stack.
   */
  clearUndo(): void;

  /**
   * Set a key-value pair in the map
   *
   * @param key - The key to set.
   *
   * @param value - The value for the key.
   *
   * @returns the old value for the key, or undefined
   *   if that did not exist.
   */
  set(key: string, value: T): T | undefined;

  /**
   * Get a value for a given key.
   *
   * @param key - the key.
   *
   * @returns the value for that key.
   */
  get(key: string): T | undefined;

  /**
   * Check whether the map has a key.
   *
   * @param key - the key to check.
   *
   * @returns `true` if the map has the key, `false` otherwise.
   */
  has(key: string): boolean;

  /**
   * Get a list of the keys in the map.
   *
   * @returns - a list of keys.
   */
  keys(): string[];

  /**
   * Get a list of the values in the map.
   *
   * @returns - a list of values.
   */
  values(): T[];

  /**
   * Remove a key from the map
   *
   * @param key - the key to remove.
   *
   * @returns the value of the given key,
   *   or undefined if that does not exist.
   */
  delete(key: string): T | undefined;

  /**
   * Set the ISharedMap to an empty map.
   */
  clear(): void;
}

/**
 * The interfaces associated with an ISharedMap.
 */
export namespace ISharedMap {
  /**
   * The change types which occur on an ISharedMap.
   */
  export type ChangeType =
    /**
     * An entry was added.
     */
    | 'add'

    /**
     * An entry was removed.
     */
    | 'remove'

    /**
     * An entry was changed.
     */
    | 'change';

  /**
   * A change emitted by a SharedMap.
   */
  export interface IChangedArg<T> {
    /**
     * The type of change undergone by the map.
     */
    type: ChangeType;

    /**
     * The key of the change.
     */
    key: string;

    /**
     * The old value of the change.
     */
    oldValue: T | undefined;

    /**
     * The new value of the change.
     */
    newValue: T | undefined;
  }

  /**
   * A list of changes emitted by an ISharedMap.
   */
  export type IChangedArgs<T> = Array<IChangedArg<T>>;
}

/**
 * A concrete implementation of ISharedMap<T>.
 */
export class SharedMap<T extends ISharedType> implements ISharedMap<T> {
  private _sharedDoc: SharedDoc;
  private _undoManager: Y.UndoManager | undefined;
  private _changed = new Signal<this, ISharedMap.IChangedArgs<T>>(this);
  private _isDisposed = false;

  /**
   * Construct a new SharedMap.
   */
  constructor(options: SharedMap.IOptions) {
    this._sharedDoc = options.sharedDoc;

    if (options.underlyingModel) {
      this.underlyingModel = options.underlyingModel;
    } else {
      this.underlyingModel = new Y.Map<any>();
    }

    this._undoManager = options.undoManager;
    this._undoManager?.addTrackedOrigin(SharedMap);

    this.underlyingModel.observe(this._onMapChanged);
  }

  /**
   * The type of the IShared.
   */
  readonly type = 'Map';

  /**
   * The specific model behind the ISharedMap abstraction.
   *
   * #### Notes
   * The default implementation is based on Yjs so the underlying
   * model is a YMap.
   */
  readonly underlyingModel: Y.Map<any>;

  /**
   * A signal emitted when the map has changed.
   */
  get changed(): ISignal<this, ISharedMap.IChangedArgs<T>> {
    return this._changed;
  }

  /**
   * The number of key-value pairs in the map.
   */
  get size(): number {
    return this.underlyingModel.size;
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
    this._undoManager?.addTrackedOrigin(SharedMap);
  }

  /**
   * Whether this map has been disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Dispose of the resources held by the map.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;
    Signal.clearData(this);
    this.underlyingModel.unobserve(this._onMapChanged);
  }

  /**
   * Perform a transaction. While the function f is called, all changes to the SharedMap
   * document are bundled into a single event.
   */
  transact(f: () => void): void {
    this._sharedDoc.transact(f, this);
  }

  /**
   * Whether the SharedMap can undo changes.
   */
  canUndo(): boolean {
    return this._undoManager == undefined
      ? false
      : this._undoManager.undoStack.length > 0;
  }

  /**
   * Whether the SharedMap can redo changes.
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
   * Set a key-value pair in the map
   *
   * @param key - The key to set.
   *
   * @param value - The value for the key.
   *
   * @returns the old value for the key, or undefined
   *   if that did not exist.
   *
   * @throws if the new value is undefined.
   *
   * #### Notes
   * This is a no-op if the value does not change.
   */
  set(key: string, value: T): T | undefined {
    if (value === undefined) {
      throw Error('Cannot set an undefined value, use remove');
    }
    let oldVal = this.underlyingModel.get(key);
    if (oldVal === value) {
      return oldVal;
    }
    this.transact(() => {
      this.underlyingModel.set(key, SharedDoc.sharedTypeToAbstractType(value));
    });
    return oldVal;
  }

  /**
   * Get a value for a given key.
   *
   * @param key - the key.
   *
   * @returns the value for that key.
   */
  get(key: string): T | undefined {
    const value = this.underlyingModel.get(key);
    if (value === undefined) {
      return;
    } else {
      return SharedDoc.abstractTypeToISharedType(value, this._sharedDoc) as T;
    }
  }

  /**
   * Check whether the map has a key.
   *
   * @param key - the key to check.
   *
   * @returns `true` if the map has the key, `false` otherwise.
   */
  has(key: string): boolean {
    return this.underlyingModel.has(key);
  }

  /**
   * Get a list of the keys in the map.
   *
   * @returns - a list of keys.
   */
  keys(): string[] {
    const keyList: string[] = [];
    this.underlyingModel.forEach((v: T, k: string) => {
      keyList.push(k);
    });
    return keyList;
  }

  /**
   * Get a list of the values in the map.
   *
   * @returns - a list of values.
   */
  values(): T[] {
    const valList: T[] = [];
    this.underlyingModel.forEach((v: any, k: string) => {
      valList.push(
        SharedDoc.abstractTypeToISharedType(v, this._sharedDoc) as T
      );
    });
    return valList;
  }

  /**
   * Remove a key from the map
   *
   * @param key - the key to remove.
   *
   * @returns the value of the given key,
   *   or undefined if that does not exist.
   *
   * #### Notes
   * This is a no-op if the value does not change.
   */
  delete(key: string): T | undefined {
    let oldVal;
    this.transact(() => {
      oldVal = SharedDoc.abstractTypeToISharedType(
        this.underlyingModel.get(key),
        this._sharedDoc
      );
      this.underlyingModel.delete(key);
    });
    return oldVal;
  }

  /**
   * Set the SharedMap to an empty map.
   */
  clear(): void {
    // Delete one by one to emit the correct signals.
    this.transact(() => {
      this.underlyingModel.clear();
    });
  }

  private _onMapChanged = (event: Y.YMapEvent<T>): void => {
    const args = new Array<ISharedMap.IChangedArg<T>>();
    event.keysChanged.forEach(key => {
      const change = event.changes.keys.get(key);
      if (change?.action === 'add') {
        args.push({
          type: change.action,
          key,
          oldValue: undefined,
          newValue: SharedDoc.abstractTypeToISharedType(
            this.underlyingModel.get(key),
            this._sharedDoc
          ) as T
        });
      } else if (change?.action === 'delete') {
        args.push({
          type: 'remove',
          key,
          oldValue: SharedDoc.abstractTypeToISharedType(
            change.oldValue,
            this._sharedDoc
          ) as T,
          newValue: undefined
        });
      } else if (change?.action === 'update') {
        args.push({
          type: 'change',
          key,
          oldValue: SharedDoc.abstractTypeToISharedType(
            change.oldValue,
            this._sharedDoc
          ) as T,
          newValue: SharedDoc.abstractTypeToISharedType(
            this.underlyingModel.get(key),
            this._sharedDoc
          ) as T
        });
      }
    });

    this._changed.emit(args);
  };
}

/**
 * The namespace for SharedMap related interfaces.
 */
export namespace SharedMap {
  /**
   * Options for creating a `SharedMap` object.
   */
  export interface IOptions extends SharedDoc.IModelOptions {
    /**
     * A specific document to use as the store for this
     * SharedDoc.
     */
    sharedDoc: SharedDoc;

    /**
     * The underlying Y.Map for the SharedMap.
     */
    underlyingModel?: Y.Map<any>;
  }
}
