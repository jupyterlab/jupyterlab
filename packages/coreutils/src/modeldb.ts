// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ISignal, Signal
} from '@phosphor/signaling';

import {
  JSONValue
} from '@phosphor/coreutils';

import {
  PathExt
} from './path';

import {
  IObservableMap, ObservableMap
} from './observablemap';

import {
  IObservableString, ObservableString
} from './observablestring';

import {
  IObservableVector, ObservableVector
} from './observablevector';

import {
  IObservableUndoableVector, ObservableUndoableVector
} from './undoablevector';


/**
 * String type annotations for Observable objects that can be
 * created and placed in the IModelDB interface.
 */
export
type ObservableType = 'JSONValue' | 'Map' | 'Vector' | 'String' | 'JSONObject'

/**
 * Base interface for Observable objects.
 */
export
interface IObservable {
  /**
   * The type of this object.
   */
  readonly type: ObservableType;
}

/**
 * Interface for an Observable object that represents
 * an opaque JSON value.
 */
export
interface IObservableValue extends IObservable {
  /**
   * The type of this object.
   */
  type: 'JSONValue';

  /**
   * The changed signal.
   */
  readonly changed: ISignal<IObservableValue, ObservableValue.IChangedArgs>;

  /**
   * Get the current value.
   */
  get(): JSONValue;

  /**
   * Set the value.
   */
  set(value: JSONValue): void;
}

/**
 * An interface for a path based database for
 * creating and storing values, which is agnostic
 * to the particular type of store in the backend.
 */
export
interface IModelDB {
  /**
   * The base path for the `IModelDB`. This is prepended
   * to all the paths that are passed in to the member
   * functions of the object.
   */
  readonly basePath: string;

  /**
   * Get a value for a path.
   *
   * @param path: the path for the object.
   *
   * @returns an `IObservable`.
   */
  get(path: string): IObservable;

  /**
   * Whether the `IModelDB` has an object at this path.
   *
   * @param path: the path for the object.
   *
   * @returns a boolean for whether an object is at `path`.
   */
  has(path: string): boolean;

  /**
   * Create a string and insert it in the database.
   *
   * @param path: the path for the string.
   *
   * @returns the string that was created.
   */
  createString(path: string): IObservableString;

  /**
   * Create a vector and insert it in the database.
   *
   * @param path: the path for the vector.
   *
   * @returns the vector that was created.
   *
   * #### Notes
   * The vector can only store objects that are simple
   * JSON Objects and primitives.
   */
  createVector<T extends JSONValue>(path: string): IObservableVector<T>;

  /**
   * Create an undoable vector and insert it in the database.
   *
   * @param path: the path for the vector.
   *
   * @returns the vector that was created.
   *
   * #### Notes
   * The vector can only store objects that are simple
   * JSON Objects and primitives.
   */
  createUndoableVector<T extends JSONValue>(path: string): IObservableUndoableVector<T>;

  /**
   * Create a map and insert it in the database.
   *
   * @param path: the path for the map.
   *
   * @returns the map that was created.
   *
   * #### Notes
   * The map can only store objects that are simple
   * JSON Objects and primitives.
   */
  createMap<T extends JSONValue>(path: string): IObservableMap<T>;

  /**
   * Create a string and insert it in the database.
   *
   * @param path: the path for the string.
   *
   * @returns the string that was created.
   */
  createValue(path: string): IObservableValue;

  /**
   * Create a view onto a subtree of the model database.
   *
   * @param basePath: the path for the root of the subtree.
   *
   * @returns an `IModelDB` with a view onto the original
   *   `IModelDB`, with `basePath` prepended to all paths.
   */
  view(basePath: string): IModelDB;

  /**
   * Set a value at a path.
   */
  set(path: string, value: IObservable): void;
}

/**
 * A concrete implementation of an `IObservableValue`.
 */
export
class ObservableValue implements IObservableValue {
  /**
   * Constructor for the value.
   *
   * @param initialValue: the starting value for the `ObservableValue`.
   */
  constructor(initialValue?: JSONValue) {
    this._value = initialValue;
  }

  /**
   * The observable type.
   */
  readonly type: 'JSONValue';

  /**
   * The changed signal.
   */
  get changed(): ISignal<this, ObservableValue.IChangedArgs> {
    return this._changed;
  }

  /**
   * Get the current value.
   */
  get(): JSONValue {
    return this._value;
  }

  /**
   * Set the current value.
   */
  set(value: JSONValue): void {
    let oldValue = this._value;
    this._value = value;
    this._changed.emit({
      oldValue: oldValue,
      newValue: value
    });
  }

  private _value: JSONValue = null;
  private _changed = new Signal<ObservableValue, ObservableValue.IChangedArgs>(this);
}

/**
 * The namespace for the `ObservableValue` class statics.
 */
export
namespace ObservableValue {
  /**
   * The changed args object emitted by the `IObservableValue`.
   */
  export
  class IChangedArgs {
    /**
     * The old value.
     */
    oldValue: JSONValue;

    /**
     * The new value.
     */
    newValue: JSONValue;
  }
}


/**
 * A concrete implementation of an `IModelDB`.
 */
export
class ModelDB implements IModelDB {
  /**
   * Constructor for the `ModelDB`.
   */
  constructor(options: ModelDB.ICreateOptions = {}) {
    this._basePath = options.basePath || '';
    if(options.baseDB) {
      this._db = options.baseDB;
    } else {
      this._db = new ObservableMap<IObservable>();
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
   * Get a value for a path.
   *
   * @param path: the path for the object.
   *
   * @returns an `IObservable`.
   */
  get(path: string): IObservable {
    return this._db.get(this._resolvePath(path));
  }

  /**
   * Whether the `IModelDB` has an object at this path.
   *
   * @param path: the path for the object.
   *
   * @returns a boolean for whether an object is at `path`.
   */
  has(path: string): boolean {
    return this._db.has(this._resolvePath(path));
  }

  /**
   * Create a string and insert it in the database.
   *
   * @param path: the path for the string.
   *
   * @returns the string that was created.
   */
  createString(path: string): IObservableString {
    let str = new ObservableString();
    this.set(path, str);
    return str;
  }

  /**
   * Create a vector and insert it in the database.
   *
   * @param path: the path for the vector.
   *
   * @returns the vector that was created.
   *
   * #### Notes
   * The vector can only store objects that are simple
   * JSON Objects and primitives.
   */
  createVector(path: string): IObservableVector<JSONValue> {
    let vec = new ObservableVector<JSONValue>();
    this.set(path, vec);
    return vec;
  }

  /**
   * Create an undoable vector and insert it in the database.
   *
   * @param path: the path for the vector.
   *
   * @returns the vector that was created.
   *
   * #### Notes
   * The vector can only store objects that are simple
   * JSON Objects and primitives.
   */
  createUndoableVector(path: string): IObservableUndoableVector<JSONValue> {
    let vec = new ObservableUndoableVector<JSONValue>(
      new ObservableUndoableVector.IdentitySerializer());
    this.set(path, vec);
    return vec;
  }

  /**
   * Create a map and insert it in the database.
   *
   * @param path: the path for the map.
   *
   * @returns the map that was created.
   *
   * #### Notes
   * The map can only store objects that are simple
   * JSON Objects and primitives.
   */
  createMap(path: string): IObservableMap<JSONValue> {
    let map = new ObservableMap<JSONValue>();
    this.set(path, map);
    return map;
  }

  /**
   * Create a string and insert it in the database.
   *
   * @param path: the path for the string.
   *
   * @returns the string that was created.
   */
  createValue(path: string): IObservableValue {
    let val = new ObservableValue();
    this.set(path, val);
    return val;
  }

  /**
   * Create a view onto a subtree of the model database.
   *
   * @param basePath: the path for the root of the subtree.
   *
   * @returns an `IModelDB` with a view onto the original
   *   `IModelDB`, with `basePath` prepended to all paths.
   */
  view(basePath: string): ModelDB {
    return new ModelDB({basePath, baseDB: this});
  }

  /**
   * Set a value at a path.
   */
  set(path: string, value: IObservable): void {
    this._db.set(this._resolvePath(path), value);
  }

  /**
   * Compute the fully resolved path for a path argument.
   */
  private _resolvePath(path: string): string {
    if (this._basePath) {
      path = this._basePath + '/' + path;
    }
    return PathExt.normalize(path)
  }

  private _basePath: string;
  private _db: IModelDB | ObservableMap<IObservable> = null;
}

/**
 * A namespace for the `ModelDB` class statics.
 */
export
namespace ModelDB {
  /**
   * Options for creating a `ModelDB` object.
   */
  export
  interface ICreateOptions {
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
}
