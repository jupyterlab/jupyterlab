// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JSONExt,
  JSONObject,
  JSONValue,
  PartialJSONValue
} from '@lumino/coreutils';
import { DisposableSet, IDisposable } from '@lumino/disposable';
import { ISignal, Signal } from '@lumino/signaling';
import { IObservableJSON, ObservableJSON } from './observablejson';
import { IObservableMap, ObservableMap } from './observablemap';
import { IObservableString, ObservableString } from './observablestring';
import {
  IObservableUndoableList,
  ObservableUndoableList
} from './undoablelist';

/**
 * String type annotations for Observable objects that can be
 * created and placed in the IModelDB interface.
 */
export type ObservableType = 'Map' | 'List' | 'String' | 'Value';

/**
 * Base interface for Observable objects.
 */
export interface IObservable extends IDisposable {
  /**
   * The type of this object.
   */
  readonly type: ObservableType;
}

/**
 * Interface for an Observable object that represents
 * an opaque JSON value.
 */
export interface IObservableValue extends IObservable {
  /**
   * The type of this object.
   */
  readonly type: 'Value';

  /**
   * The changed signal.
   */
  readonly changed: ISignal<IObservableValue, ObservableValue.IChangedArgs>;

  /**
   * Get the current value, or `undefined` if it has not been set.
   */
  get(): PartialJSONValue | undefined;

  /**
   * Set the value.
   */
  set(value: PartialJSONValue): void;
}

/**
 * Interface for an object representing a single collaborator
 * on a realtime model.
 */
export interface ICollaborator extends JSONObject {
  /**
   * A user id for the collaborator.
   * This might not be unique, if the user has more than
   * one editing session at a time.
   */
  readonly userId: string;

  /**
   * A session id, which should be unique to a
   * particular view on a collaborative model.
   */
  readonly sessionId: string;

  /**
   * A human-readable display name for a collaborator.
   */
  readonly displayName: string;

  /**
   * A color to be used to identify the collaborator in
   * UI elements.
   */
  readonly color: string;

  /**
   * A human-readable short name for a collaborator, for
   * use in places where the full `displayName` would take
   * too much space.
   */
  readonly shortName: string;
}

/**
 * Interface for an IObservableMap that tracks collaborators.
 */
export interface ICollaboratorMap extends IObservableMap<ICollaborator> {
  /**
   * The local collaborator on a model.
   */
  readonly localCollaborator: ICollaborator;
}

/**
 * An interface for a path based database for
 * creating and storing values, which is agnostic
 * to the particular type of store in the backend.
 */
export interface IModelDB extends IDisposable {
  /**
   * The base path for the `IModelDB`. This is prepended
   * to all the paths that are passed in to the member
   * functions of the object.
   */
  readonly basePath: string;

  /**
   * Whether the database has been disposed.
   */
  readonly isDisposed: boolean;

  /**
   * Whether the database has been populated
   * with model values prior to connection.
   */
  readonly isPrepopulated: boolean;

  /**
   * Whether the database is collaborative.
   */
  readonly isCollaborative: boolean;

  /**
   * A promise that resolves when the database
   * has connected to its backend, if any.
   */
  readonly connected: Promise<void>;

  /**
   * A map of the currently active collaborators
   * for the database, including the local user.
   */
  readonly collaborators?: ICollaboratorMap;

  /**
   * Get a value for a path.
   *
   * @param path the path for the object.
   *
   * @returns an `IObservable`.
   */
  get(path: string): IObservable | undefined;

  /**
   * Whether the `IModelDB` has an object at this path.
   *
   * @param path the path for the object.
   *
   * @returns a boolean for whether an object is at `path`.
   */
  has(path: string): boolean;

  /**
   * Create a string and insert it in the database.
   *
   * @param path the path for the string.
   *
   * @returns the string that was created.
   */
  createString(path: string): IObservableString;

  /**
   * Create an undoable list and insert it in the database.
   *
   * @param path the path for the list.
   *
   * @returns the list that was created.
   *
   * #### Notes
   * The list can only store objects that are simple
   * JSON Objects and primitives.
   */
  createList<T extends JSONValue>(path: string): IObservableUndoableList<T>;

  /**
   * Create a map and insert it in the database.
   *
   * @param path the path for the map.
   *
   * @returns the map that was created.
   *
   * #### Notes
   * The map can only store objects that are simple
   * JSON Objects and primitives.
   */
  createMap(path: string): IObservableJSON;

  /**
   * Create an opaque value and insert it in the database.
   *
   * @param path the path for the value.
   *
   * @returns the value that was created.
   */
  createValue(path: string): IObservableValue;

  /**
   * Get a value at a path, or `undefined if it has not been set
   * That value must already have been created using `createValue`.
   *
   * @param path the path for the value.
   */
  getValue(path: string): JSONValue | undefined;

  /**
   * Set a value at a path. That value must already have
   * been created using `createValue`.
   *
   * @param path the path for the value.
   *
   * @param value the new value.
   */
  setValue(path: string, value: JSONValue): void;

  /**
   * Create a view onto a subtree of the model database.
   *
   * @param basePath the path for the root of the subtree.
   *
   * @returns an `IModelDB` with a view onto the original
   *   `IModelDB`, with `basePath` prepended to all paths.
   */
  view(basePath: string): IModelDB;

  /**
   * Dispose of the resources held by the database.
   */
  dispose(): void;
}

/**
 * A concrete implementation of an `IObservableValue`.
 */
export class ObservableValue implements IObservableValue {
  /**
   * Constructor for the value.
   *
   * @param initialValue the starting value for the `ObservableValue`.
   */
  constructor(initialValue: JSONValue = null) {
    this._value = initialValue;
  }

  /**
   * The observable type.
   */
  get type(): 'Value' {
    return 'Value';
  }

  /**
   * Whether the value has been disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * The changed signal.
   */
  get changed(): ISignal<this, ObservableValue.IChangedArgs> {
    return this._changed;
  }

  /**
   * Get the current value, or `undefined` if it has not been set.
   */
  get(): JSONValue {
    return this._value;
  }

  /**
   * Set the current value.
   */
  set(value: JSONValue): void {
    const oldValue = this._value;
    if (JSONExt.deepEqual(oldValue, value)) {
      return;
    }
    this._value = value;
    this._changed.emit({
      oldValue: oldValue,
      newValue: value
    });
  }

  /**
   * Dispose of the resources held by the value.
   */
  dispose(): void {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    Signal.clearData(this);
    this._value = null;
  }

  private _value: JSONValue = null;
  private _changed = new Signal<this, ObservableValue.IChangedArgs>(this);
  private _isDisposed = false;
}

/**
 * The namespace for the `ObservableValue` class statics.
 */
export namespace ObservableValue {
  /**
   * The changed args object emitted by the `IObservableValue`.
   */
  export class IChangedArgs {
    /**
     * The old value.
     */
    oldValue: JSONValue | undefined;

    /**
     * The new value.
     */
    newValue: JSONValue | undefined;
  }
}

/**
 * A concrete implementation of an `IModelDB`.
 */
export class ModelDB implements IModelDB {
  /**
   * Constructor for the `ModelDB`.
   */
  constructor(options: ModelDB.ICreateOptions = {}) {
    this._basePath = options.basePath || '';
    if (options.baseDB) {
      this._db = options.baseDB;
    } else {
      this._db = new ObservableMap<IObservable>();
      this._toDispose = true;
    }
  }

  /**
   * The base path for the `ModelDB`. This is prepended
   * to all the paths that are passed in to the member
   * functions of the object.
   */
  get basePath(): string {
    return this._basePath;
  }

  /**
   * Whether the database is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Whether the model has been populated with
   * any model values.
   */
  readonly isPrepopulated: boolean = false;

  /**
   * Whether the model is collaborative.
   */
  readonly isCollaborative: boolean = false;

  /**
   * A promise resolved when the model is connected
   * to its backend. For the in-memory ModelDB it
   * is immediately resolved.
   */
  readonly connected: Promise<void> = Promise.resolve(void 0);

  /**
   * Get a value for a path.
   *
   * @param path the path for the object.
   *
   * @returns an `IObservable`.
   */
  get(path: string): IObservable | undefined {
    return this._db.get(this._resolvePath(path));
  }

  /**
   * Whether the `IModelDB` has an object at this path.
   *
   * @param path the path for the object.
   *
   * @returns a boolean for whether an object is at `path`.
   */
  has(path: string): boolean {
    return this._db.has(this._resolvePath(path));
  }

  /**
   * Create a string and insert it in the database.
   *
   * @param path the path for the string.
   *
   * @returns the string that was created.
   */
  createString(path: string): IObservableString {
    const str = new ObservableString();
    this._disposables.add(str);
    this.set(path, str);
    return str;
  }

  /**
   * Create an undoable list and insert it in the database.
   *
   * @param path the path for the list.
   *
   * @returns the list that was created.
   *
   * #### Notes
   * The list can only store objects that are simple
   * JSON Objects and primitives.
   */
  createList<T extends JSONValue>(path: string): IObservableUndoableList<T> {
    const vec = new ObservableUndoableList<T>(
      new ObservableUndoableList.IdentitySerializer<T>()
    );
    this._disposables.add(vec);
    this.set(path, vec);
    return vec;
  }

  /**
   * Create a map and insert it in the database.
   *
   * @param path the path for the map.
   *
   * @returns the map that was created.
   *
   * #### Notes
   * The map can only store objects that are simple
   * JSON Objects and primitives.
   */
  createMap(path: string): IObservableJSON {
    const map = new ObservableJSON();
    this._disposables.add(map);
    this.set(path, map);
    return map;
  }

  /**
   * Create an opaque value and insert it in the database.
   *
   * @param path the path for the value.
   *
   * @returns the value that was created.
   */
  createValue(path: string): IObservableValue {
    const val = new ObservableValue();
    this._disposables.add(val);
    this.set(path, val);
    return val;
  }

  /**
   * Get a value at a path, or `undefined if it has not been set
   * That value must already have been created using `createValue`.
   *
   * @param path the path for the value.
   */
  getValue(path: string): JSONValue | undefined {
    const val = this.get(path);
    if (!val || val.type !== 'Value') {
      throw Error('Can only call getValue for an ObservableValue');
    }
    return (val as ObservableValue).get();
  }

  /**
   * Set a value at a path. That value must already have
   * been created using `createValue`.
   *
   * @param path the path for the value.
   *
   * @param value the new value.
   */
  setValue(path: string, value: JSONValue): void {
    const val = this.get(path);
    if (!val || val.type !== 'Value') {
      throw Error('Can only call setValue on an ObservableValue');
    }
    (val as ObservableValue).set(value);
  }

  /**
   * Create a view onto a subtree of the model database.
   *
   * @param basePath the path for the root of the subtree.
   *
   * @returns an `IModelDB` with a view onto the original
   *   `IModelDB`, with `basePath` prepended to all paths.
   */
  view(basePath: string): ModelDB {
    const view = new ModelDB({ basePath, baseDB: this });
    this._disposables.add(view);
    return view;
  }

  /**
   * Set a value at a path. Not intended to
   * be called by user code, instead use the
   * `create*` factory methods.
   *
   * @param path the path to set the value at.
   *
   * @param value the value to set at the path.
   */
  set(path: string, value: IObservable): void {
    this._db.set(this._resolvePath(path), value);
  }

  /**
   * Dispose of the resources held by the database.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;
    if (this._toDispose) {
      this._db.dispose();
    }
    this._disposables.dispose();
  }

  /**
   * Compute the fully resolved path for a path argument.
   */
  private _resolvePath(path: string): string {
    if (this._basePath) {
      path = this._basePath + '.' + path;
    }
    return path;
  }

  private _basePath: string;
  private _db: ModelDB | ObservableMap<IObservable>;
  private _toDispose = false;
  private _isDisposed = false;
  private _disposables = new DisposableSet();
}

/**
 * A namespace for the `ModelDB` class statics.
 */
export namespace ModelDB {
  /**
   * Options for creating a `ModelDB` object.
   */
  export interface ICreateOptions {
    /**
     * The base path to prepend to all the path arguments.
     */
    basePath?: string;

    /**
     * A ModelDB to use as the store for this
     * ModelDB. If none is given, it uses its own store.
     */
    baseDB?: ModelDB;
  }

  /**
   * A factory interface for creating `IModelDB` objects.
   */
  export interface IFactory {
    /**
     * Create a new `IModelDB` instance.
     */
    createNew(path: string): IModelDB;
  }
}
