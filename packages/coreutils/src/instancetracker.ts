// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { CommandRegistry } from '@phosphor/commands';

import {
  PromiseDelegate,
  ReadonlyJSONObject,
  ReadonlyJSONValue
} from '@phosphor/coreutils';

import { IDisposable, IObservableDisposable } from '@phosphor/disposable';

import { AttachedProperty } from '@phosphor/properties';

import { ISignal, Signal } from '@phosphor/signaling';

import { IDataConnector } from './interfaces';

/**
 * A tracker that tracks instances of a generic objects.
 */
export interface IInstanceTracker<T extends IObservableDisposable>
  extends IDisposable {
  /**
   * A signal emitted when an instance is added.
   *
   * #### Notes
   * This signal will only fire when an instance is added to the tracker.
   * It will not fire if an instance is injected into the tracker.
   */
  readonly added: ISignal<this, T>;

  /**
   * The current instance is the most recently focused or added instance.
   *
   * #### Notes
   * It is the most recently focused widget, or the most recently added
   * widget if no widget has taken focus.
   */
  readonly current: T | null;

  /**
   * A signal emitted when the current instance changes.
   *
   * #### Notes
   * If the last instance being tracked is disposed, `null` will be emitted.
   */
  readonly currentChanged: ISignal<this, T | null>;

  /**
   * The number of instances held by the tracker.
   */
  readonly size: number;

  /**
   * A promise that is resolved when the instance tracker has been
   * restored from a serialized state.
   *
   * #### Notes
   * Most client code will not need to use this, since they can wait
   * for the whole application to restore. However, if an extension
   * wants to perform actions during the application restoration, but
   * after the restoration of another instance tracker, they can use
   * this promise.
   */
  readonly restored: Promise<void>;

  /**
   * A signal emitted when an instance is updated.
   */
  readonly updated: ISignal<this, T>;

  /**
   * Find the first instance in the tracker that satisfies a filter function.
   *
   * @param - fn The filter function to call on each instance.
   *
   * #### Notes
   * If nothing is found, the value returned is `undefined`.
   */
  find(fn: (obj: T) => boolean): T | undefined;

  /**
   * Iterate through each instance in the tracker.
   *
   * @param fn - The function to call on each instance.
   */
  forEach(fn: (obj: T) => void): void;

  /**
   * Filter the instances in the tracker based on a predicate.
   *
   * @param fn - The function by which to filter.
   */
  filter(fn: (obj: T) => boolean): T[];

  /**
   * Check if this tracker has the specified instance.
   *
   * @param obj - The object whose existence is being checked.
   */
  has(obj: T): boolean;

  /**
   * Inject an instance into the instance tracker without the tracker handling
   * its restoration lifecycle.
   *
   * @param obj - The instance to inject into the tracker.
   */
  inject(obj: T): void;
}

/**
 * A class that keeps track of widget instances on an Application shell.
 */
export class InstanceTracker<T extends IObservableDisposable>
  implements IInstanceTracker<T> {
  /**
   * Create a new instance tracker.
   *
   * @param options - The instantiation options for an instance tracker.
   */
  constructor(options: InstanceTracker.IOptions) {
    this.namespace = options.namespace;
  }

  /**
   * A signal emitted when an object instance is added.
   *
   * #### Notes
   * This signal will only fire when an instance is added to the tracker.
   * It will not fire if an instance injected into the tracker.
   */
  get added(): ISignal<this, T> {
    return this._added;
  }

  /**
   * A namespace for all tracked instances.
   */
  readonly namespace: string;

  /**
   * The current instance.
   */
  get current(): T | null {
    return this._current;
  }
  set current(obj: T) {
    if (this._current === obj) {
      return;
    }
    this._current = obj;
    this._currentChanged.emit(this._current);
  }

  /**
   * A signal emitted when the current widget changes.
   */
  get currentChanged(): ISignal<this, T | null> {
    return this._currentChanged;
  }

  /**
   * A promise resolved when the instance tracker has been restored.
   */
  get restored(): Promise<void> {
    return this._restored.promise;
  }

  /**
   * The number of instances held by the tracker.
   */
  get size(): number {
    return this._instances.size;
  }

  /**
   * A signal emitted when an instance is updated.
   */
  get updated(): ISignal<this, T> {
    return this._updated;
  }

  /**
   * Add a new instance to the tracker.
   *
   * @param obj - The object instance being added.
   */
  async add(obj: T): Promise<void> {
    if (obj.isDisposed) {
      const warning = 'A disposed object cannot be added.';
      console.warn(warning, obj);
      throw new Error(warning);
    }

    if (this._instances.has(obj)) {
      const warning = 'This object already exists in the tracker.';
      console.warn(warning, obj);
      throw new Error(warning);
    }

    this._instances.add(obj);

    if (Private.injectedProperty.get(obj)) {
      return;
    }

    obj.disposed.connect(this._onInstanceDisposed, this);

    if (this._restore) {
      const { connector } = this._restore;
      const objName = this._restore.name(obj);

      if (objName) {
        const name = `${this.namespace}:${objName}`;
        const data = this._restore.args(obj);

        Private.nameProperty.set(obj, name);
        await connector.save(name, { data });
      }
    }

    // Emit the added signal.
    this._added.emit(obj);
  }

  /**
   * Test whether the tracker is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Dispose of the resources held by the tracker.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._current = null;
    this._instances.clear();
    this._isDisposed = true;
    Signal.clearData(this);
  }

  /**
   * Find the first instance in the tracker that satisfies a filter function.
   *
   * @param - fn The filter function to call on each instance.
   */
  find(fn: (obj: T) => boolean): T | undefined {
    const values = this._instances.values();
    for (let value of values) {
      if (fn(value)) {
        return value;
      }
    }
    return undefined;
  }

  /**
   * Iterate through each instance in the tracker.
   *
   * @param fn - The function to call on each instance.
   */
  forEach(fn: (obj: T) => void): void {
    this._instances.forEach(fn);
  }

  /**
   * Filter the instances in the tracker based on a predicate.
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
   * Inject an instance into the instance tracker without the tracker handling
   * its restoration lifecycle.
   *
   * @param obj - The instance to inject into the tracker.
   */
  inject(obj: T): Promise<void> {
    Private.injectedProperty.set(obj, true);
    return this.add(obj);
  }

  /**
   * Check if this tracker has the specified instance.
   *
   * @param obj - The object whose existence is being checked.
   */
  has(obj: T): boolean {
    return this._instances.has(obj);
  }

  /**
   * Restore the instances in this tracker's namespace.
   *
   * @param options - The configuration options that describe restoration.
   *
   * @returns A promise that resolves when restoration has completed.
   *
   * #### Notes
   * This function should almost never be invoked by client code. Its primary
   * use case is to be invoked by a layout restorer plugin that handles
   * multiple instance trackers and, when ready, asks them each to restore their
   * respective instances.
   */
  async restore(options: InstanceTracker.IRestoreOptions<T>): Promise<any> {
    if (this._hasRestored) {
      throw new Error('Instance tracker has already restored');
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
      saved.ids.map((id, index) => {
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
   * Save the restore data for a given instance.
   *
   * @param obj - The instance being saved.
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
      const data = this._restore.args(obj);
      await connector.save(newName, { data });
    }

    if (oldName !== newName) {
      this._updated.emit(obj);
    }
  }

  /**
   * Clean up after disposed instances.
   */
  private _onInstanceDisposed(obj: T): void {
    this._instances.delete(obj);

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
  private _instances = new Set<T>();
  private _isDisposed = false;
  private _restore: InstanceTracker.IRestoreOptions<T> | null = null;
  private _restored = new PromiseDelegate<void>();
  private _updated = new Signal<this, T>(this);
}

/**
 * A namespace for `InstanceTracker` statics.
 */
export namespace InstanceTracker {
  /**
   * The instantiation options for an instance tracker.
   */
  export interface IOptions {
    /**
     * A namespace for all tracked widgets, (e.g., `notebook`).
     */
    namespace: string;
  }

  /**
   * The state restoration configuration options.
   */
  export interface IRestoreOptions<T extends IObservableDisposable> {
    /**
     * The command to execute when restoring instances.
     */
    command: string;

    /**
     * The data connector to fetch restore data.
     */
    connector: IDataConnector<ReadonlyJSONValue>;

    /**
     * A function that returns the args needed to restore an instance.
     */
    args?: (obj: T) => ReadonlyJSONObject;

    /**
     * A function that returns a unique persistent name for this instance.
     */
    name: (obj: T) => string;

    /**
     * The command registry which holds the restore command.
     */
    registry: CommandRegistry;

    /**
     * The point after which it is safe to restore state.
     *
     * #### Notes
     * By definition, this promise or promises will happen after the application
     * has `started`.
     */
    when?: Promise<any> | Array<Promise<any>>;
  }
}

/*
 * A namespace for private data.
 */
namespace Private {
  /**
   * An attached property to indicate whether an instance has been injected.
   */
  export const injectedProperty = new AttachedProperty<
    IObservableDisposable,
    boolean
  >({
    name: 'injected',
    create: () => false
  });

  /**
   * An attached property for an instance's ID.
   */
  export const nameProperty = new AttachedProperty<
    IObservableDisposable,
    string
  >({
    name: 'name',
    create: () => ''
  });
}
