// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IModelDB,
  ICollaboratorMap,
  IObservable,
  IObservableString,
  IObservableUndoableList,
  IObservableValue,
  IObservableJSON
} from '@jupyterlab/observables';

import { toArray } from '@phosphor/algorithm';

import { ReadonlyJSONValue } from '@phosphor/coreutils';

import { Schema } from '@phosphor/datastore';

import { DisposableSet } from '@phosphor/disposable';

import {
  ObservableJSON,
  ObservableString,
  ObservableUndoableList,
  ObservableValue
} from './observables';

import { iterValues } from './objiter';

import { DatastoreManager } from './manager';

/**
 *
 */
export class DSModelDB implements IModelDB {
  /**
   *
   */
  constructor(options: DSModelDB.ICreateOptions) {
    this._schemaId = options.schemaId;
    if (options.baseDB) {
      this._baseDB = options.baseDB;
    } else {
      this._baseDB = new Map<string, IObservable>();
      this._toDispose = true;
    }
    this._schemas = {};
    this._recordId = options.recordId;
    for (let s of options.schemas) {
      this._schemas[s.id] = s;
    }
    if (options.baseDB) {
      this.manager = options.baseDB.manager;
    } else {
      this.manager = options.manager;
    }
    this.connected = this.manager.connected;
  }

  /**
   * Get a value for a path.
   *
   * @param path: the path for the object.
   *
   * @returns an `IObservable`.
   */
  get(path: string, resolved = false): IObservable | undefined {
    if (!resolved) {
      path = this._resolvePath(path);
    }
    return this._baseDB.get(path, true);
  }

  /**
   * Whether the `IModelDB` has an object at this path.
   *
   * @param path: the path for the object.
   *
   * @returns a boolean for whether an object is at `path`.
   */
  has(path: string, resolved = false): boolean {
    if (!resolved) {
      path = this._resolvePath(path);
    }
    return this._baseDB.has(path, true);
  }

  /**
   * Create a string and insert it in the database.
   *
   * @param path: the path for the string.
   *
   * @returns the string that was created.
   */
  createString(path: string): IObservableString {
    const schema = this._schemas[this._schemaId];
    const field = schema.fields[path];
    if (!field || field.type !== 'text') {
      throw new Error(
        `Cannot create a string for path '${path}', incompatible with schema.`
      );
    }
    let str = new ObservableString(this.manager, schema, this._recordId, path);
    this._disposables.add(str);
    this.set(path, str);
    return str;
  }

  /**
   * Create an undoable list and insert it in the database.
   *
   * @param path: the path for the list.
   *
   * @returns the list that was created.
   *
   * #### Notes
   * The list can only store objects that are simple
   * JSON Objects and primitives.
   */
  createList<T extends ReadonlyJSONValue>(
    path: string
  ): IObservableUndoableList<T> {
    const schema = this._schemas[this._schemaId];
    const field = schema.fields[path];
    if (!field || field.type !== 'list') {
      throw new Error(
        `Cannot create a list for path '${path}', incompatible with schema.`
      );
    }
    let vec = new ObservableUndoableList(
      this.manager,
      schema,
      this._recordId,
      path,
      new ObservableUndoableList.IdentitySerializer<T>()
    );
    this._disposables.add(vec);
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
  createMap(path: string): IObservableJSON {
    const schema = this._schemas[this._schemaId];
    const field = schema.fields[path];
    if (!field || field.type !== 'map') {
      throw new Error(
        `Cannot create a map for path '${path}', incompatible with schema.`
      );
    }
    let map = new ObservableJSON(this.manager, schema, this._recordId, path);
    this._disposables.add(map);
    this.set(path, map);
    return map;
  }

  /**
   * Create an opaque value and insert it in the database.
   *
   * @param path: the path for the value.
   *
   * @returns the value that was created.
   */
  createValue(path: string): IObservableValue {
    const schema = this._schemas[this._schemaId];
    const field = schema.fields[path];
    if (!field || field.type !== 'register') {
      throw new Error(
        `Cannot create a value for path '${path}', incompatible with schema.`
      );
    }
    let val = new ObservableValue(this.manager, schema, this._recordId, path);
    this._disposables.add(val);
    this.set(path, val);
    return val;
  }

  /**
   * Get a value at a path, or `undefined` if it has not been set
   * That value must already have been created using `createValue`.
   *
   * @param path: the path for the value.
   */
  getValue(path: string): ReadonlyJSONValue | undefined {
    const ds = this.manager.datastore;
    if (!ds) {
      throw new Error('Cannot use model db before connection completed!');
    }
    const schema = this._schemas[this._schemaId];
    const record = ds.get(schema).get(this._recordId);
    return record && record[path];
  }

  /**
   * Set a value at a path. That value must already have
   * been created using `createValue`.
   *
   * @param path: the path for the value.
   *
   * @param value: the new value.
   */
  setValue(path: string, value: ReadonlyJSONValue): void {
    const ds = this.manager.datastore;
    if (!ds) {
      throw new Error('Cannot use model db before connection completed!');
    }
    const table = ds.get(this._schemas[this._schemaId]);
    this.withTransaction(() => {
      table.update({
        [this._recordId]: {
          [path]: value
        }
      } as any);
    });
  }

  /**
   * Create a view onto a subtree of the model database.
   *
   * @param path: the path for the root of the subtree.
   *
   * @returns an `IModelDB` with a view onto the original
   *   `IModelDB`, with `basePath` prepended to all paths.
   */
  view(path: string): IModelDB {
    // If path does not resolve to a schema name
    // append it to the recordId instead
    let resolved = this._resolvePath(path, false);
    let recordId = this._recordId;
    if (this._schemas[resolved] === undefined) {
      resolved = this._schemaId;
      recordId = `${this._recordId}.${path}`;
    }
    const schemas = toArray(iterValues(this._schemas));
    const manager = this.manager;
    // TODO: resolve path?
    return new DSModelDB({
      schemas,
      manager,
      schemaId: resolved,
      baseDB: this,
      recordId: recordId
    });
  }

  withTransaction(fn: (transactionId?: string) => void): void {
    const ds = this.manager.datastore;
    if (!ds) {
      throw new Error('Cannot use model db before connection completed!');
    }
    if (ds.inTransaction) {
      return fn();
    }
    const transactionId = ds.beginTransaction();
    try {
      fn(transactionId);
    } finally {
      ds.endTransaction();
    }
  }

  /**
   * Set a value at a path. Not intended to
   * be called by user code, instead use the
   * `create*` factory methods.
   *
   * @param path: the path to set the value at.
   *
   * @param value: the value to set at the path.
   */
  set(path: string, value: IObservable, resolved = false): void {
    if (!resolved) {
      path = this._resolvePath(path);
    }
    this._baseDB.set(path, value, true);
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
      (this._baseDB as Map<any, any>).clear();
    }
    this._disposables.dispose();
  }

  /**
   * The base path for the `IModelDB`. This is prepended
   * to all the paths that are passed in to the member
   * functions of the object.
   */
  get basePath(): string {
    return this._schemaId;
  }

  /**
   * Whether the database has been disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Whether the database has been populated
   * with model values prior to connection.
   */
  get isPrepopulated(): boolean {
    return this.manager.isPrepopulated;
  }

  /**
   * Whether the database is collaborative.
   */
  get isCollaborative(): boolean {
    return true;
  }

  /**
   * A promise that resolves when the database
   * has connected to its backend, if any.
   */
  readonly connected: Promise<void>;

  /**
   * A map of the currently active collaborators
   * for the database, including the local user.
   */
  collaborators: ICollaboratorMap;

  /**
   * The underlying datastore manager.
   */
  readonly manager: DatastoreManager;

  /**
   * Compute the fully resolved path for a path argument.
   */
  private _resolvePath(path: string, includeRecord = true): string {
    if (this._schemaId) {
      path = `${this._schemaId}.${path}`;
    }
    if (includeRecord && this._recordId) {
      path = `${path}:${this._recordId}`;
    }
    return path;
  }

  private _schemaId: string;
  private _baseDB: DSModelDB | Map<string, IObservable>;
  private _schemas: { [key: string]: Schema };
  private _recordId: string;
  private _toDispose = false;
  private _isDisposed = false;
  private _disposables = new DisposableSet();
}

/**
 *
 */
export namespace DSModelDB {
  export interface ICreateOptions {
    manager: DatastoreManager;
    schemas: ReadonlyArray<Schema>;
    schemaId: string;
    recordId: string;
    baseDB?: DSModelDB;
  }
}
