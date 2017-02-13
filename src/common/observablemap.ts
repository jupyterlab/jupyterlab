// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IDisposable
} from 'phosphor/lib/core/disposable';

import {
  clearSignalData, defineSignal, ISignal
} from 'phosphor/lib/core/signaling';


/**
 * A map which can be observed for changes.
 */
export
interface IObservableMap<T> extends IDisposable {
  /**
   * A signal emitted when the map has changed.
   */
  changed: ISignal<IObservableMap<T>, ObservableMap.IChangedArgs<T>>;

  /**
   * Get whether this map can be linked to another.
   * If so, the functions `link` and `unlink` will perform
   * that. Otherwise, they are no-op functions.
   *
   * @returns `true` if the map may be linked to another,
   *   `false` otherwise.
   */
  readonly isLinkable: boolean;


  /**
   * The number of key-value pairs in the map.
   */
  readonly size: number;

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
  set(key: string, value: T): T;

  /**
   * Get a value for a given key.
   *
   * @param key - the key.
   *
   * @returns the value for that key.
   */
  get(key: string): T;

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
  delete(key: string): T;

  /**
   * Link the map to another map.
   * Any changes to either are mirrored in the other.
   *
   * @param map: the parent map.
   */
  link(map: IObservableMap<T>): void;

  /**
   * Unlink the map from its parent map.
   */
  unlink(): void;

  /**
   * Set the ObservableMap to an empty map.
   */
  clear(): void;

  /**
   * Dispose of the resources held by the map.
   */
  dispose(): void;
}


/**
 * The namespace for `ObservableMap` class statics.
 */
export
namespace ObservableMap {
  /**
   * The change types which occur on an observable map.
   */
  export
  type ChangeType =
    /**
     * An entry was added.
     */
    'add' |

    /**
     * An entry was removed.
     */
    'remove' |

    /**
     * An entry was changed.
     */
    'change';

  /**
   * The changed args object which is emitted by an observable map.
   */
  export
  interface IChangedArgs<T> {
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
    oldValue: T;

    /**
     * The new value of the change.
     */
    newValue: T;
  }
}
