// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { PromiseDelegate } from '@lumino/coreutils';
import { IObservableDisposable } from '@lumino/disposable';
import { AttachedProperty } from '@lumino/properties';
import { ISignal, Signal } from '@lumino/signaling';
import { IObjectPool, IRestorable } from './interfaces';

/**
 * An object pool that supports restoration.
 *
 * @typeparam T - The type of object being tracked.
 */
export class RestorablePool<
    T extends IObservableDisposable = IObservableDisposable
  >
  implements IObjectPool<T>, IRestorable<T>
{
  /**
   * Create a new restorable pool.
   *
   * @param options - The instantiation options for a restorable pool.
   */
  constructor(options: RestorablePool.IOptions) {
    this.namespace = options.namespace;
  }

  /**
   * A namespace for all tracked objects.
   */
  readonly namespace: string;

  /**
   * A signal emitted when an object object is added.
   *
   * #### Notes
   * This signal will only fire when an object is added to the pool.
   * It will not fire if an object injected into the pool.
   */
  get added(): ISignal<this, T> {
    return this._added;
  }

  /**
   * The current object.
   *
   * #### Notes
   * The restorable pool does not set `current`. It is intended for client use.
   *
   * If `current` is set to an object that does not exist in the pool, it is a
   * no-op.
   */
  get current(): T | null {
    return this._current;
  }
  set current(obj: T | null) {
    if (this._current === obj) {
      return;
    }
    if (obj !== null && this._objects.has(obj)) {
      this._current = obj;
      this._currentChanged.emit(this._current);
    }
  }

  /**
   * A signal emitted when the current widget changes.
   */
  get currentChanged(): ISignal<this, T | null> {
    return this._currentChanged;
  }

  /**
   * Test whether the pool is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * A promise resolved when the restorable pool has been restored.
   */
  get restored(): Promise<void> {
    return this._restored.promise;
  }

  /**
   * The number of objects held by the pool.
   */
  get size(): number {
    return this._objects.size;
  }

  /**
   * A signal emitted when an object is updated.
   */
  get updated(): ISignal<this, T> {
    return this._updated;
  }

  /**
   * Add a new object to the pool.
   *
   * @param obj - The object object being added.
   *
   * #### Notes
   * The object passed into the pool is added synchronously; its existence in
   * the pool can be checked with the `has()` method. The promise this method
   * returns resolves after the object has been added and saved to an underlying
   * restoration connector, if one is available.
   */
  async add(obj: T): Promise<void> {
    if (obj.isDisposed) {
      const warning = 'A disposed object cannot be added.';
      console.warn(warning, obj);
      throw new Error(warning);
    }

    if (this._objects.has(obj)) {
      const warning = 'This object already exists in the pool.';
      console.warn(warning, obj);
      throw new Error(warning);
    }

    this._objects.add(obj);
    obj.disposed.connect(this._onInstanceDisposed, this);

    if (Private.injectedProperty.get(obj)) {
      return;
    }

    if (this._restore) {
      const { connector } = this._restore;
      const objName = this._restore.name(obj);

      if (objName) {
        const name = `${this.namespace}:${objName}`;
        const data = this._restore.args?.(obj);

        Private.nameProperty.set(obj, name);
        await connector.save(name, { data });
      }
    }

    // Emit the added signal.
    this._added.emit(obj);
  }

  /**
   * Dispose of the resources held by the pool.
   *
   * #### Notes
   * Disposing a pool does not affect the underlying data in the data connector,
   * it simply disposes the client-side pool without making any connector calls.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._current = null;
    this._isDisposed = true;
    this._objects.clear();
    Signal.clearData(this);
  }

  /**
   * Find the first object in the pool that satisfies a filter function.
   *
   * @param fn The filter function to call on each object.
   */
  find(fn: (obj: T) => boolean): T | undefined {
    const values = this._objects.values();
    for (const value of values) {
      if (fn(value)) {
        return value;
      }
    }
    return undefined;
  }

  /**
   * Iterate through each object in the pool.
   *
   * @param fn - The function to call on each object.
   */
  forEach(fn: (obj: T) => void): void {
    this._objects.forEach(fn);
  }

  /**
   * Filter the objects in the pool based on a predicate.
   *
   * @param fn - The function by which to filter.
   */
  filter(fn: (obj: T) => boolean): T[] {
    const filtered: T[] = [];
    this.forEach(obj => {
      if (fn(obj)) {
        filtered.push(obj);
      }
    });
    return filtered;
  }

  /**
   * Inject an object into the restorable pool without the pool handling its
   * restoration lifecycle.
   *
   * @param obj - The object to inject into the pool.
   */
  inject(obj: T): Promise<void> {
    Private.injectedProperty.set(obj, true);
    return this.add(obj);
  }

  /**
   * Check if this pool has the specified object.
   *
   * @param obj - The object whose existence is being checked.
   */
  has(obj: T): boolean {
    return this._objects.has(obj);
  }

  /**
   * Restore the objects in this pool's namespace.
   *
   * @param options - The configuration options that describe restoration.
   *
   * @returns A promise that resolves when restoration has completed.
   *
   * #### Notes
   * This function should almost never be invoked by client code. Its primary
   * use case is to be invoked by a layout restorer plugin that handles
   * multiple restorable pools and, when ready, asks them each to restore their
   * respective objects.
   */
  async restore(options: IRestorable.IOptions<T>): Promise<any> {
    if (this._hasRestored) {
      throw new Error('This pool has already been restored.');
    }

    this._hasRestored = true;

    const { command, connector, registry, when } = options;
    const namespace = this.namespace;
    const promises = when
      ? [connector.list(namespace)].concat(when)
      : [connector.list(namespace)];

    this._restore = options;

    const [saved] = await Promise.all(promises);
    const values = await Promise.all(
      saved.ids.map(async (id, index) => {
        const value = saved.values[index];
        const args = value && (value as any).data;

        if (args === undefined) {
          return connector.remove(id);
        }

        // Execute the command and if it fails, delete the state restore data.
        return registry
          .execute(command, args)
          .catch(() => connector.remove(id));
      })
    );
    this._restored.resolve();
    return values;
  }

  /**
   * Save the restore data for a given object.
   *
   * @param obj - The object being saved.
   */
  async save(obj: T): Promise<void> {
    const injected = Private.injectedProperty.get(obj);

    if (!this._restore || !this.has(obj) || injected) {
      return;
    }

    const { connector } = this._restore;
    const objName = this._restore.name(obj);
    const oldName = Private.nameProperty.get(obj);
    const newName = objName ? `${this.namespace}:${objName}` : '';

    if (oldName && oldName !== newName) {
      await connector.remove(oldName);
    }

    // Set the name property irrespective of whether the new name is null.
    Private.nameProperty.set(obj, newName);

    if (newName) {
      const data = this._restore.args?.(obj);
      await connector.save(newName, { data });
    }

    if (oldName !== newName) {
      this._updated.emit(obj);
    }
  }

  /**
   * Clean up after disposed objects.
   */
  private _onInstanceDisposed(obj: T): void {
    this._objects.delete(obj);

    if (obj === this._current) {
      this._current = null;
      this._currentChanged.emit(this._current);
    }

    if (Private.injectedProperty.get(obj)) {
      return;
    }

    if (!this._restore) {
      return;
    }

    const { connector } = this._restore;
    const name = Private.nameProperty.get(obj);

    if (name) {
      void connector.remove(name);
    }
  }

  private _added = new Signal<this, T>(this);
  private _current: T | null = null;
  private _currentChanged = new Signal<this, T | null>(this);
  private _hasRestored = false;
  private _isDisposed = false;
  private _objects = new Set<T>();
  private _restore: IRestorable.IOptions<T> | null = null;
  private _restored = new PromiseDelegate<void>();
  private _updated = new Signal<this, T>(this);
}

/**
 * A namespace for `RestorablePool` statics.
 */
export namespace RestorablePool {
  /**
   * The instantiation options for the restorable pool.
   */
  export interface IOptions {
    /**
     * A namespace designating objects from this pool.
     */
    namespace: string;
  }
}

/*
 * A namespace for private data.
 */
namespace Private {
  /**
   * An attached property to indicate whether an object has been injected.
   */
  export const injectedProperty = new AttachedProperty<
    IObservableDisposable,
    boolean
  >({
    name: 'injected',
    create: () => false
  });

  /**
   * An attached property for an object's ID.
   */
  export const nameProperty = new AttachedProperty<
    IObservableDisposable,
    string
  >({
    name: 'name',
    create: () => ''
  });
}
