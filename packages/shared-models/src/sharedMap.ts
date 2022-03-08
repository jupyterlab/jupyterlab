// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ISignal, Signal } from '@lumino/signaling';
import * as Y from 'yjs';
import { IShared, ISharedType, SharedDoc } from './model';

/**
 * A map which can be observed for changes.
 */
export interface ISharedMap<T extends ISharedType> extends IShared {
  /**
   * The type of the Observable.
   */
  readonly type: 'Map';

  /**
   * The specific model behind the ISharedMap abstraction.
   *
   * Note: The default implementation is based on Yjs so the underlying
   * model is a YMap.
   */
  readonly underlyingModel: any;

  readonly undoManager: any;

  /**
   * A signal emitted when the map has changed.
   */
  readonly changed: ISignal<this, ISharedMap.IChangedArgs<T>>;

  /**
   * The number of key-value pairs in the map.
   */
  readonly size: number;

  /**
   * Dispose of the resources held by the map.
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
   * Set the ObservableMap to an empty map.
   */
  clear(): void;
}

/**
 * The interfaces associated with an IObservableMap.
 */
export namespace ISharedMap {
  /**
   * The change types which occur on an observable map.
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
   * The changed args object which is emitted by an observable map.
   */
  export interface IChangedArgs<T> {
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
}

/**
 * A concrete implementation of IObservableMap<T>.
 */
export class SharedMap<T extends ISharedType> implements ISharedMap<T> {
  private _ymap: Y.Map<any>;
  private _doc: SharedDoc;
  private _origin: any;
  private _undoManager: Y.UndoManager;
  private _changed = new Signal<this, ISharedMap.IChangedArgs<T>>(this);
  private _isDisposed = false;

  /**
   * Construct a new SharedMap.
   */
  constructor(options: SharedMap.IOptions) {
    if (options.ymap) {
      this._ymap = options.ymap;
    } else {
      this._ymap = new Y.Map<any>();
    }

    this._doc = options.doc;
    this._origin = options.origin ?? this;

    if (options.undoManager) {
      this._undoManager = options.undoManager;
    } else if (options.initialize !== false) {
      this.initialize();
    }

    this._ymap.observe(this._onMapChanged);
  }

  /**
   * The type of the Observable.
   */
  get type(): 'Map' {
    return 'Map';
  }

  get underlyingModel(): Y.Map<any> {
    return this._ymap;
  }

  get undoManager(): any {
    return this._undoManager;
  }

  /**
   * A signal emitted when the map has changed.
   */
  get changed(): ISignal<this, ISharedMap.IChangedArgs<T>> {
    return this._changed;
  }

  /**
   * Whether this map has been disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * The number of key-value pairs in the map.
   */
  get size(): number {
    return this._ymap.size;
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
    this._ymap.unobserve(this._onMapChanged);
  }

  initialize(): void {
    this._undoManager = new Y.UndoManager(this._ymap, {
      trackedOrigins: new Set([this._origin])
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
   * Clear the change stack.
   */
  clearUndo(): void {
    this._undoManager.clear();
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
    let oldVal;
    this._doc.transact(() => {
      oldVal = this._ymap.get(key);
      this._ymap.set(key, SharedDoc.sharedTypeToAbstractType(value));
    }, this._origin);
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
    const value = this._ymap.get(key);
    if (value === undefined) {
      return;
    } else {
      return SharedDoc.abstractTypeToISharedType(value, this._doc) as T;
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
    return this._ymap.has(key);
  }

  /**
   * Get a list of the keys in the map.
   *
   * @returns - a list of keys.
   */
  keys(): string[] {
    const keyList: string[] = [];
    this._ymap.forEach((v: T, k: string) => {
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
    this._ymap.forEach((v: any, k: string) => {
      valList.push(SharedDoc.abstractTypeToISharedType(v, this._doc) as T);
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
    this._doc.transact(() => {
      oldVal = SharedDoc.abstractTypeToISharedType(
        this._ymap.get(key),
        this._doc
      );
      this._ymap.delete(key);
    }, this._origin);
    return oldVal;
  }

  /**
   * Set the SharedMap to an empty map.
   */
  clear(): void {
    // Delete one by one to emit the correct signals.
    this._doc.transact(() => {
      this._ymap.clear();
    }, this._origin);
  }

  private _onMapChanged = (event: Y.YMapEvent<any>): void => {
    event.keysChanged.forEach(key => {
      const change = event.changes.keys.get(key);
      if (change?.action === 'add') {
        this._changed.emit({
          type: change.action,
          key,
          oldValue: undefined,
          newValue: SharedDoc.abstractTypeToISharedType(
            this._ymap.get(key),
            this._doc
          ) as T
        });
      } else if (change?.action === 'delete') {
        this._changed.emit({
          type: 'remove',
          key,
          oldValue: SharedDoc.abstractTypeToISharedType(
            change.oldValue,
            this._doc
          ) as T,
          newValue: undefined
        });
      } else if (change?.action === 'update') {
        this._changed.emit({
          type: 'change',
          key,
          oldValue: SharedDoc.abstractTypeToISharedType(
            change.oldValue,
            this._doc
          ) as T,
          newValue: SharedDoc.abstractTypeToISharedType(
            this._ymap.get(key),
            this._doc
          ) as T
        });
      }
    });
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
    doc: SharedDoc;

    /**
     * The underlying Y.Map for the SharedMap.
     */
    ymap?: Y.Map<any>;
  }
}
