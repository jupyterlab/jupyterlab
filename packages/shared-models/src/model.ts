import { IDisposable } from '@lumino/disposable';
import { JSONValue } from '@lumino/coreutils';
import { Awareness } from 'y-protocols/awareness';
import * as Y from 'yjs';
import { ISharedString, SharedString } from './sharedString';
import { ISharedMap, SharedMap } from './sharedMap';
import { ISharedList, SharedList } from './sharedList';

/**
 * Base interface for Shared objects.
 */
export interface IShared extends IDisposable {
  /**
   * The type of this object.
   */
  readonly type: 'Map' | 'List' | 'String';

  /**
   * The specific model behind the IShared abstraction.
   *
   * Note: The default implementation is based on Yjs so the underlying
   * model is a YText, YArray or YMap.
   */
  readonly underlyingModel: any;
}

export type ISharedType = IShared | JSONValue;

/**
 * An interface for a path based database for
 * creating and storing values, which is agnostic
 * to the particular type of store in the backend.
 */
export interface ISharedDoc extends IDisposable {
  /**
   * The base path for the `IModelDB`. This is prepended
   * to all the paths that are passed in to the member
   * functions of the object.
   */
  readonly path: string;

  /**
   * Whether the database has been disposed.
   */
  readonly isDisposed: boolean;

  /**
   * Whether the database is collaborative.
   */
  readonly isCollaborative: boolean;

  /**
   * The specific document behind the ISharedDoc abstraction.
   *
   * Note: The default implementation is based on Yjs so the underlying
   * model is a YDoc.
   */
  readonly underlyingDoc: any;

  /**
   * The specific awareness class behind the ISharedDoc abstraction.
   *
   * Note: The default implementation is based on Yjs so the underlying
   * model is a Y.Awareness.
   */
  readonly awareness: any;

  /**
   * Dispose of the resources held by the database.
   */
  dispose(): void;

  /**
   * Perform a transaction. While the function f is called, all changes to the shared
   * document are bundled into a single event.
   */
  transact(f: () => void, undoable: boolean): void;

  /**
   * Get a value for a path.
   *
   * @param name: the name for the object.
   *
   * @returns an `IShared`.
   */
  get(name: string): IShared | undefined;

  /**
   * Whether the `IModelDB` has an object at this path.
   *
   * @param name: the name for the object.
   *
   * @returns a boolean for whether an object is at `path`.
   */
  has(name: string): boolean;

  /**
   * Create a string and insert it in the database.
   *
   * @param name: the name for the string.
   *
   * @returns the string that was created.
   */
  createString(name: string): ISharedString;

  /**
   * Create a list.
   *
   * @param path: the path for the list.
   *
   * @returns the list that was created.
   *
   * #### Notes
   * The list can only store objects that are simple
   * JSON Objects and primitives.
   */
  createList<T extends ISharedType>(path: string): ISharedList<T>;

  /**
   * Create a map.
   *
   * @param name: the path for the map.
   *
   * @returns the map that was created.
   *
   * #### Notes
   * The map can only store objects that are simple
   * JSON Objects and primitives.
   */
  createMap<T extends ISharedType>(name: string): ISharedMap<T>;
}

/**
 * A concrete implementation of an `ISharedDoc`.
 */
export class SharedDoc implements ISharedDoc {
  private _path: string;
  private _ydoc: Y.Doc = new Y.Doc();
  private _awareness: Awareness = new Awareness(this._ydoc);
  private _isDisposed = false;

  /**
   * Constructor for the `SharedDoc`.
   */
  constructor(options: SharedDoc.IOptions = {}) {
    this._path = options.path || '';
  }

  /**
   * The base path for the `ModelDB`. This is prepended
   * to all the paths that are passed in to the member
   * functions of the object.
   */
  get path(): string {
    return this._path;
  }

  /**
   * Whether the database is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Whether the model is collaborative.
   */
  readonly isCollaborative: boolean = true;

  get underlyingDoc(): Y.Doc {
    return this._ydoc;
  }

  get awareness(): Awareness {
    return this._awareness;
  }

  /**
   * Dispose of the resources held by the database.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;
    this._ydoc.destroy();
  }

  /**
   * Perform a transaction. While the function f is called, all changes to the shared
   * document are bundled into a single event.
   */
  transact(f: () => void, undoable = true): void {
    this._ydoc.transact(f, undoable ? this : null);
  }

  /**
   * Get a value for a name.
   *
   * @param name: the name for the object.
   *
   * @returns an `IShared`.
   */
  get(name: string): IShared | undefined {
    const type = this._ydoc.share.get(name);
    if (type) {
      return SharedDoc.abstractTypeToIShared(type, this);
    } else {
      return;
    }
  }

  /**
   * Whether the `ISharedDoc` has an object at this name.
   *
   * @param name: the name for the object.
   *
   * @returns a boolean for whether an object is at `name`.
   */
  has(name: string): boolean {
    return this._ydoc.share.has(name);
  }

  /**
   * Create a string and insert it in the database.
   *
   * @param name: the name for the string.
   *
   * @returns the string that was created.
   */
  createString(name: string): ISharedString {
    const ytext = this._ydoc.getText(name);
    return new SharedString({ ytext, doc: this });
  }

  /**
   * Create a shared list.
   *
   * @param name: the path for the list.
   *
   * @returns the list that was created.
   *
   * #### Notes
   * The list can only store objects that are simple
   * JSON Objects and primitives.
   */
  createList<T extends ISharedType>(name: string): ISharedList<T> {
    const yarray = this._ydoc.getArray(name);
    const vec = new SharedList<T>({ yarray, doc: this });
    return vec;
  }

  /**
   * Create a map.
   *
   * @param name: the path for the map.
   *
   * @returns the map that was created.
   *
   * #### Notes
   * The map can only store objects that are simple
   * JSON Objects and primitives.
   */
  createMap<T extends ISharedType>(name: string): ISharedMap<T> {
    const ymap = this._ydoc.getMap(name);
    const map = new SharedMap<T>({ ymap, doc: this });
    return map;
  }
}

/**
 * A namespace for the `ISharedDoc` class statics.
 */
export namespace SharedDoc {
  export interface IOptions {
    /**
     * The base path to prepend to all the path arguments.
     */
    path?: string;

    /**
     * A specific document to use as the store for this
     * ISharedDoc. If none is given, it uses its own store.
     */
    doc?: Y.Doc;
  }

  /**
   * Options for creating a `ISharedDoc` object.
   */
  export function abstractTypeToIShared(
    type: Y.AbstractType<Y.YEvent>,
    doc: SharedDoc
  ): IShared | undefined {
    if (type instanceof Y.Text) {
      return new SharedString({ ytext: type, doc });
    } else if (type instanceof Y.Array) {
      return new SharedList({ yarray: type, doc });
    } else if (type instanceof Y.Map) {
      return new SharedMap({ ymap: type, doc });
    } else {
      return;
    }
  }

  export function abstractTypeToISharedType(
    type: Y.AbstractType<Y.YEvent> | JSONValue,
    doc: SharedDoc
  ): ISharedType {
    if (type instanceof Y.Text) {
      return new SharedString({ ytext: type, doc });
    } else if (type instanceof Y.Array) {
      return new SharedList({ yarray: type, doc });
    } else if (type instanceof Y.Map) {
      return new SharedMap({ ymap: type, doc });
    } else {
      return type as JSONValue;
    }
  }

  export function sharedTypeToAbstractType(
    type: ISharedType
  ): Y.AbstractType<Y.YEvent> | JSONValue {
    if (type instanceof SharedString) {
      return type.underlyingModel;
    } else if (type instanceof SharedList) {
      return type.underlyingModel;
    } else if (type instanceof SharedMap) {
      return type.underlyingModel;
    } else {
      return type as JSONValue;
    }
  }
}
