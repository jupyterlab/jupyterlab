// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IObservableMap } from '@jupyterlab/observables';

import { each } from '@phosphor/algorithm';

import { ReadonlyJSONValue, ReadonlyJSONObject } from '@phosphor/coreutils';

import { MapField, Schema } from '@phosphor/datastore';

import { ISignal, Signal } from '@phosphor/signaling';

import { ObservableBase } from './base';

import { iterItems } from '../objiter';

import { DatastoreManager } from '../manager';

/**
 * A concrete implementation of IObservbleMap<T>.
 */
export class ObservableMap<T extends ReadonlyJSONValue>
  extends ObservableBase<MapField.Change<T>>
  implements IObservableMap<T> {
  /**
   * Construct a new observable map.
   */
  constructor(
    manager: DatastoreManager,
    schema: Schema,
    recordId: string,
    fieldId: string,
    options: ObservableMap.IOptions<T> = {}
  ) {
    super(manager, schema, recordId, fieldId);
    this._itemCmp = options.itemCmp || Private.itemCmp;
  }

  /**
   * The type of the Observable.
   */
  get type(): 'Map' {
    return 'Map';
  }

  /**
   * A signal emitted when the map has changed.
   */
  get changed(): ISignal<this, IObservableMap.IChangedArgs<T>> {
    return this._changed;
  }

  /**
   * The number of key-value pairs in the map.
   */
  get size(): number {
    return Object.keys(this._map).length;
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
    let oldVal = this._map[key] as T | undefined;
    if (value === undefined) {
      throw Error('Cannot set an undefined value, use remove');
    }
    // Bail if the value does not change.
    let itemCmp = this._itemCmp;
    if (oldVal !== undefined && itemCmp(oldVal, value)) {
      return oldVal;
    }

    const table = this.ds!.get(this.schema);
    this.withTransaction(() => {
      table.update({
        [this.recordID]: {
          [this.fieldId]: {
            [key]: value
          }
        }
      } as any);
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
    return this._map[key] as T | undefined;
  }

  /**
   * Check whether the map has a key.
   *
   * @param key - the key to check.
   *
   * @returns `true` if the map has the key, `false` otherwise.
   */
  has(key: string): boolean {
    return this._map[key] !== undefined;
  }

  /**
   * Get a list of the keys in the map.
   *
   * @returns - a list of keys.
   */
  keys(): string[] {
    return Object.keys(this._map);
  }

  /**
   * Get a list of the values in the map.
   *
   * @returns - a list of values.
   */
  values(): T[] {
    return Object.keys(this._map).map(k => this._map[k] as T);
  }

  /**
   * Remove a key from the map
   *
   * @param key - the key to remove.
   *
   * @returns the value of the given key,
   *   or undefined if that does not exist.
   */
  delete(key: string): T | undefined {
    let oldVal = this._map[key] as T | undefined;

    const table = this.ds!.get(this.schema);
    this.withTransaction(() => {
      table.update({
        [this.recordID]: {
          [this.fieldId]: {
            [key]: null
          }
        }
      } as any);
    });
    return oldVal;
  }

  /**
   * Set the ObservableMap to an empty map.
   */
  clear(): void {
    if (this.size < 1) {
      // Nothing to clear
      return;
    }
    // Delete one by one to emit the correct signals.
    let keyList = this.keys();
    const update: { [key: string]: T | null } = {};
    for (let key of keyList) {
      update[key] = null;
    }

    const table = this.ds!.get(this.schema);
    this.withTransaction(() => {
      table.update({
        [this.recordID]: {
          [this.fieldId]: update
        }
      } as any);
    });
  }

  protected onChange(change: MapField.Change<T>): void {
    each(iterItems(change.current), ([key, cur]) => {
      const prev = change.previous[key];
      if (prev === undefined || prev === null) {
        this._changed.emit({
          type: 'add',
          key,
          oldValue: undefined,
          newValue: cur === null ? undefined : cur
        });
      }
    });
    each(iterItems(change.previous), ([key, prev]) => {
      const cur = change.current[key];
      if (cur === undefined || cur === null) {
        this._changed.emit({
          type: 'remove',
          key,
          oldValue: prev === null ? undefined : prev,
          newValue: undefined
        });
      } else if (!this._itemCmp(cur, prev)) {
        this._changed.emit({
          type: 'change',
          key,
          oldValue: prev === null ? undefined : prev,
          newValue: cur
        });
      }
    });
  }

  private get _map(): ReadonlyJSONObject {
    this.ensureBackend();
    const record = this.ds!.get(this.schema).get(this.recordID);
    return record ? (record[this.fieldId] as ReadonlyJSONObject) : {};
  }
  private _itemCmp: (first: T | null, second: T | null) => boolean;
  private _changed = new Signal<this, IObservableMap.IChangedArgs<T>>(this);
}

/**
 * The namespace for `ObservableMap` class statics.
 */
export namespace ObservableMap {
  /**
   * The options used to initialize an observable map.
   */
  export interface IOptions<T> {
    /**
     * The item comparison function for change detection on `set`.
     *
     * If not given, strict `===` equality will be used.
     */
    itemCmp?: (first: T, second: T) => boolean;
  }
}

/**
 * The namespace for module private data.
 */
namespace Private {
  /**
   * The default strict equality item comparator.
   */
  export function itemCmp(first: any, second: any): boolean {
    return first === second;
  }
}
