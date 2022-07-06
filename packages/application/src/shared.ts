// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ArrayIterator, IIterator } from '@lumino/algorithm';
import { JSONValue } from '@lumino/coreutils';
import { IDisposable } from '@lumino/disposable';
import { ISignal, Signal } from '@lumino/signaling';
import { Awareness } from 'y-protocols/awareness';
import * as Y from 'yjs';

/**
 * An abstract class for shared primitives accessible by multiple clients.
 *
 * @typeparam T - The primitive type implemented: `list`, `map`, or `string`.
 *
 * @typeparam U - The `changed` arguments emitted by the implementation.
 */
export abstract class Shared<T extends 'list' | 'map' | 'string', U = any>
  implements IDisposable
{
  constructor(options: Shared.IOptions<any>) {
    const { doc } = options;
    this.doc = doc;
    this._undoManager = options.undoManager || null;
  }

  /**
   * Whether the shared object is disposed.
   */
  abstract readonly isDisposed: boolean;

  /**
   * The underlying model of the shared object.
   */
  abstract readonly model: any;

  /**
   * The primitive type of this shared object.
   */
  abstract readonly type: T;

  /**
   * Clear the shared object to an empty state.
   */
  abstract clear(): void;

  /**
   * A signal emitted when the shared object has changed.
   */
  get changed(): ISignal<this, U> {
    return this._changed;
  }

  /**
   * The undo manager for the shared object.
   */
  get undoManager(): Shared.UndoManager | null {
    return this._undoManager;
  }
  set undoManager(undoManager: Shared.UndoManager | null) {
    this._undoManager = undoManager;
  }

  /**
   * Whether the shared object can redo changes.
   */
  canRedo(): boolean {
    const manager = this.undoManager;
    return manager !== null && !!manager.redoStack.length;
  }

  /**
   * Whether the shared object can undo changes.
   */
  canUndo(): boolean {
    const manager = this.undoManager;
    return manager !== null && !!manager.undoStack.length;
  }

  /**
   * Clear the change stack.
   */
  clearUndo(): void {
    this.undoManager?.clear();
  }

  /**
   * Dispose of resources held by the shared object.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    Signal.clearData(this);
  }

  /**
   * Redo an operation.
   */
  redo(): void {
    this.undoManager?.redo();
  }

  /**
   * Perform a transaction.
   *
   * @param fn - The transformation function to transact.
   */
  transact(fn: () => void): void {
    this.doc.transact(fn, this);
  }

  /**
   * Undo an operation.
   */
  undo(): void {
    this.undoManager?.undo();
  }

  /**
   * The document containing the shared object.
   */
  protected doc: Shared.Document;

  /**
   * Emit a change of the shared object.
   */
  protected emit(change: U): void {
    this._changed.emit(change);
  }

  private _changed = new Signal<this, U>(this);
  private _undoManager: Shared.UndoManager | null = null;
}

/**
 * A namespace for `Shared` interfaces, type definitions, and classes.
 */
export namespace Shared {
  /**
   * Changes on sequence-like data are expressed as Quill-inspired deltas.
   *
   * @source https://quilljs.com/docs/delta/
   */
  export type Delta<T> = { insert?: T; delete?: number; retain?: number };

  /**
   * A generic serializable object that can be added to a shared item.
   */
  export type Serializable = JSONValue | Shared<any, any>;

  /**
   * An undo manager type.
   */
  export type UndoManager = Private.IEmpty & Y.UndoManager;

  /**
   * Instantiation options for creating a shared object.
   *
   * @typeparam T - The underlying model type.
   */
  export interface IOptions<T> {
    /**
     * The shared document containing this shared item.
     */
    doc: Shared.Document;

    /**
     * The underlying implementation of the shared primitive.
     */
    model?: T;

    /**
     * The undo manager class behind the shared abstraction.
     */
    undoManager?: UndoManager;
  }

  /**
   * A concrete implementation of a shared document.
   */
  export class Document implements IDisposable {
    /**
     * Create a new shared document.
     */
    constructor(options: Document.IOptions = {}) {
      this._path = options.path || '';
    }

    /**
     * The base path for the document.
     */
    get path(): string {
      return this._path;
    }

    /**
     * Whether the shared document is disposed.
     */
    get isDisposed(): boolean {
      return this._isDisposed;
    }

    /**
     * Whether the document is collaborative.
     */
    readonly isCollaborative: boolean = true;

    /**
     * The specific document behind the ISharedDoc abstraction.
     */
    get underlyingDoc(): Y.Doc {
      return this._ydoc;
    }

    /**
     * The specific awareness class behind the shared document abstraction.
     */
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
     * Perform a transaction.
     */
    transact(fn: () => void, origin: any = null): void {
      this._ydoc.transact(fn, origin);
    }

    /**
     * Whether the shared document has an object with this name.
     *
     * @param name - the name for the object.
     *
     * @returns a boolean for whether an object exists with the given `name`.
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
    createString(name: string): Shared.String {
      return new Shared.String({ doc: this, model: this._ydoc.getText(name) });
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
    createList<T extends Shared.Serializable>(name: string): Shared.List<T> {
      return new Shared.List({
        doc: this,
        model: this._ydoc.getArray<T>(name)
      });
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
    createMap<T extends Shared.Serializable>(name: string): Shared.Map<T> {
      return new Shared.Map<T>({ doc: this, model: this._ydoc.getMap(name) });
    }

    private _path: string;
    private _ydoc: Y.Doc = new Y.Doc();
    private _awareness: Awareness = new Awareness(this._ydoc);
    private _isDisposed = false;
  }

  /**
   * A namespace for `Document` class statics.
   */
  export namespace Document {
    export interface IOptions {
      /**
       * The base path to prepend to all the path arguments.
       */
      path?: string;

      /**
       * An existing document if available to underly this shared document.
       */
      doc?: Y.Doc;
    }

    export function createUndoManager(
      type: Y.AbstractType<any>,
      origins: any[]
    ): Y.UndoManager {
      return new Y.UndoManager(type, { trackedOrigins: new Set(origins) });
    }
  }

  /**
   * A concrete implementation of a shared list.
   */
  export class List<T extends Serializable> extends Shared<
    'list',
    List.IChangedArgs<T>
  > {
    /**
     * Construct a new shared list.
     */
    constructor(options: IOptions<Y.Array<T>>) {
      super(options);
      this.model = options.model || new Y.Array<T>();
      this.model.observe(this._onArrayChanged);
    }

    /**
     * The underlying shared model of the list.
     */
    readonly model: Y.Array<T>;

    /**
     * The shared list primitive type.
     */
    readonly type = 'list';

    /**
     * The length of the list.
     */
    get length(): number {
      return this.model.length;
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
      super.dispose();
      this._isDisposed = true;
      this.model.unobserve(this._onArrayChanged);
    }

    /**
     * Create an iterator over the values in the list.
     *
     * @returns A new iterator starting at the front of the list.
     */
    iter(): IIterator<T> {
      return new ArrayIterator(this.model.toArray());
    }

    /**
     * Get the value at the specified index.
     *
     * @param index - The positive integer index of interest.
     *
     * @returns The value at the specified index.
     */
    get(index: number): T {
      return this.model.get(index);
    }

    /**
     * Set the value at the specified index.
     *
     * @param index - The positive integer index of interest.
     *
     * @param value - The value to set at the specified index.
     */
    set(index: number, value: T): void {
      if (value === undefined) {
        throw new Error('Cannot set an undefined item');
      }
      this.transact(() => {
        this.model.delete(index);
        this.model.insert(index, [value]);
      });
    }

    /**
     * Add a value to the end of the list.
     *
     * @param value - The value to add to the end of the list.
     *
     * @returns The new length of the list.
     */
    push(value: T): number {
      this.transact(() => {
        this.model.push([value]);
      });
      return this.length;
    }

    /**
     * Insert a value into the list at a specific index.
     *
     * @param index - The index at which to insert the value.
     *
     * @param value - The value to set at the specified index.
     */
    insert(index: number, value: T): void {
      this.transact(() => {
        this.model.insert(index, [value]);
      });
    }

    /**
     * Remove the first occurrence of a value from the list.
     *
     * @param value - The value of interest.
     *
     * @returns The index of the removed value or `-1` if it is not found in list.
     */
    removeValue(value: T): number {
      let index = 0;
      this.transact(() => {
        while (value !== this.model.get(index)) {
          index++;
        }
        if (index === this.model.length) {
          index = -1;
          return;
        }
        this.model.delete(index);
      });
      return index;
    }

    /**
     * Remove and return the value at a specific index.
     *
     * @param index - The index of the value of interest.
     *
     * @returns The value at the specified index, or `undefined` if out of range.
     */
    remove(index: number): T | undefined {
      let value: T | undefined;
      this.transact(() => {
        value = this.model.get(index);
        this.model.delete(index);
      });
      return value;
    }

    /**
     * Remove all values from the list.
     */
    clear(): void {
      this.transact(() => {
        this.model.delete(0, this.length);
      });
    }

    /**
     * Push a set of values to the back of the list.
     *
     * @param values - An iterable or array-like set of values to add.
     *
     * @returns The new length of the list.
     */
    pushAll(values: Array<T>): number {
      this.transact(() => {
        this.model.push(values);
      });
      return this.length;
    }

    /**
     * Insert a set of items into the list at the specified index.
     *
     * @param index - The index at which to insert the values.
     *
     * @param values - The values to insert at the specified index.
     */
    insertAll(index: number, values: Array<T>): void {
      this.transact(() => {
        this.model.insert(index, values);
      });
    }

    /**
     * Move a value from one index to another.
     *
     * @parm fromIndex - The index of the element to move.
     *
     * @param toIndex - The index to move the element to.
     */
    move(fromIndex: number, toIndex: number): void {
      throw new Error('List#move is not yet implemented');
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
      throw new Error('List#moveRange is not yet implemented');
    }

    /**
     * Remove a range of items from the list.
     *
     * @param startIndex - The start index of the range to remove (inclusive).
     *
     * @param endIndex - The end index of the range to remove (exclusive).
     *
     * @returns The new length of the list.
     */
    removeRange(startIndex: number, endIndex: number): number {
      this.transact(() => {
        this.model.delete(startIndex, endIndex - startIndex);
      });
      return this.length;
    }

    /**
     * Handle changes to the shared list.
     */
    private _onArrayChanged = (event: Y.YArrayEvent<T>): void => {
      const args: List.IChangedArgs<T> = {
        added: new Set<T>(),
        deleted: new Set<T>(),
        delta: new Array<Delta<Array<T>>>()
      };
      event.changes.deleted.forEach(item => {
        item.content.getContent().forEach(item => {
          args.deleted.add(item);
        });
      });
      event.changes.added.forEach(item => {
        item.content.getContent().forEach(item => {
          args.added.add(item);
        });
      });
      event.changes.delta.forEach(delta => {
        if (delta.insert) {
          if (Array.isArray(delta.insert)) {
            delta.insert.forEach(item => {
              args.added.add(item);
            });
            args.delta.push({ insert: delta.insert });
          }
        }
        if (delta.delete !== undefined) {
          args.delta.push({ delete: delta.delete });
        }
        if (delta.retain !== undefined) {
          args.delta.push({ retain: delta.retain });
        }
      });
      this.emit(args);
    };

    private _isDisposed = false;
  }

  /**
   * The namespace for `List` related interfaces.
   */
  export namespace List {
    /**
     * The changed args object which is emitted by a shared list.
     */
    export interface IChangedArgs<T> {
      /**
       * Added elements.
       */
      added: Set<T>;

      /**
       * Deleted elements.
       */
      deleted: Set<T>;

      /**
       * A list of deltas describing the change.
       */
      delta: Array<Delta<Array<T>>>;
    }
  }

  /**
   * A map that can be shared by multiple clients.
   */
  export class Map<T extends Serializable> extends Shared<
    'map',
    Map.IChangedArgs<T>
  > {
    /**
     * Construct a new shared map.
     */
    constructor(options: IOptions<Y.Map<T>>) {
      super(options);
      this.model = options.model || new Y.Map<T>();
      this.model.observe(this._onMapChanged);
    }

    /**
     * The underlying shared model of the map.
     */
    readonly model: Y.Map<T>;

    /**
     * The shared map primitive type.
     */
    readonly type = 'map';

    /**
     * The number of key-value pairs in the map.
     */
    get size(): number {
      return this.model.size;
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
      super.dispose();
      this._isDisposed = true;
      this.model.unobserve(this._onMapChanged);
    }

    /**
     * Set a key-value pair in the map
     *
     * @param key - The key to set.
     *
     * @param value - The value for the key.
     *
     * @returns the old value for the key, or `undefined` if it did not exist.
     *
     * @throws if the new value is `undefined`.
     */
    set(key: string, value: T): T | undefined {
      if (value === undefined) {
        throw new Error('Cannot set an undefined value, use remove');
      }
      let previous: T | undefined;
      this.transact(() => {
        previous = this.model.get(key);
        if (previous !== value) {
          this.model.set(key, value);
        }
      });
      return previous;
    }

    /**
     * Get a value for a given key.
     *
     * @param key - the key.
     *
     * @returns the value for that key.
     */
    get(key: string): T | undefined {
      return this.model.get(key);
    }

    /**
     * Check whether the map has a key.
     *
     * @param key - the key to check.
     *
     * @returns `true` if the map has the key, `false` otherwise.
     */
    has(key: string): boolean {
      return this.model.has(key);
    }

    /**
     * Get a list of the keys in the map.
     *
     * @returns - a list of keys.
     */
    keys(): string[] {
      const keys: string[] = [];
      for (const key of this.model.keys()) {
        keys.push(key);
      }
      return keys;
    }

    /**
     * Get a list of the values in the map.
     *
     * @returns - a list of values.
     */
    values(): T[] {
      const values: T[] = [];
      for (const value of this.model.values()) {
        values.push(value);
      }
      return values;
    }

    /**
     * Remove a key from the map
     *
     * @param key - the key to remove.
     *
     * @returns the value of the given key or `undefined` if that does not exist.
     */
    delete(key: string): T | undefined {
      let value: T | undefined;
      this.transact(() => {
        value = this.model.get(key);
        this.model.delete(key);
      });
      return value;
    }

    /**
     * Clear the shared map.
     */
    clear(): void {
      this.transact(() => {
        this.model.clear();
      });
    }

    /**
     * Handle changes to the shared map.
     */
    private _onMapChanged(event: Y.YMapEvent<T>): void {
      const args: Map.IChangedArgs<T> = [];
      event.keysChanged.forEach(key => {
        const change = event.changes.keys.get(key);
        if (change === undefined) {
          return;
        }
        switch (change.action) {
          case 'add':
            args.push({
              key,
              type: 'add',
              oldValue: undefined,
              newValue: this.model.get(key)
            });
            break;
          case 'delete':
            args.push({
              key,
              type: 'remove',
              oldValue: change.oldValue,
              newValue: undefined
            });
            break;
          case 'update':
            args.push({
              key,
              type: 'change',
              oldValue: change.oldValue,
              newValue: this.model.get(key)
            });
            break;
        }
      });
      this.emit(args);
    }

    private _isDisposed = false;
  }

  /**
   * The namespace for `Map` related interfaces.
   */
  export namespace Map {
    /**
     * A list of changes emitted by a shared map.
     */
    export type IChangedArgs<T> = {
      /**
       * The type of change applied to the map.
       */
      type: 'add' | 'change' | 'remove';

      /**
       * The key of the relevant item being changed.
       */
      key: string;

      /**
       * The old value of the item.
       */
      oldValue: T | undefined;

      /**
       * The new value of the item.
       */
      newValue: T | undefined;
    }[];
  }

  /**
   * A concrete implementation of a shared string.
   */
  export class String extends Shared<'string', String.IChangedArgs> {
    /**
     * Construct a new shared string.
     */
    constructor(options: IOptions<Y.Text>) {
      super(options);
      this.model = options.model || new Y.Text();
      this.model.observe(this._onTextChanged);
    }

    /**
     * The underlying shared model of the string.
     */
    readonly model: Y.Text;

    /**
     * The shared string primitive type.
     */
    readonly type = 'string';

    /**
     * Set the value of the string.
     */
    set text(value: string) {
      this.transact(() => {
        this.model.delete(0, this.model.length);
        this.model.insert(0, value);
      });
    }

    /**
     * Get the value of the string.
     */
    get text(): string {
      return this.model.toString();
    }

    /**
     * Test whether the string has been disposed.
     */
    get isDisposed(): boolean {
      return this._isDisposed;
    }

    /**
     * Dispose of the resources held by the string.
     */
    dispose(): void {
      if (this.isDisposed) {
        return;
      }
      super.dispose();
      this._isDisposed = true;
      this.model.unobserve(this._onTextChanged);
    }

    /**
     * Insert a substring.
     *
     * @param index - The starting index.
     * @param text - The substring to insert.
     */
    insert(index: number, text: string): void {
      this.transact(() => {
        this.model.insert(index, text);
      });
    }

    /**
     * Remove a substring.
     *
     * @param start - The starting index.
     *
     * @param end - The ending index.
     */
    remove(start: number, end: number): void {
      this.transact(() => {
        this.model.delete(start, end - start);
      });
    }

    /**
     * Set the shared string to an empty string.
     */
    clear(): void {
      this.text = '';
    }

    /**
     * Handle changes to the shared string.
     */
    private _onTextChanged = (event: Y.YTextEvent): void => {
      this.emit(event.changes.delta as String.IChangedArgs);
    };

    private _isDisposed = false;
  }

  export namespace String {
    /**
     * The changed args object which is emitted by a shared string.
     */
    export type IChangedArgs = Array<Delta<string>>;
  }
}

/**
 * A namespace for private module data.
 */
namespace Private {
  export interface IEmpty {}
}
