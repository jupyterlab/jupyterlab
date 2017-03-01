// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IDisposable
} from '@phosphor/disposable';

import {
  ISignal, Signal
} from '@phosphor/signaling';

import {
  IRealtimeConverter, Synchronizable
} from './realtime';


/**
 * A map which can be observed for changes.
 */
export
interface IObservableMap<T> extends IDisposable {
  /**
   * A signal emitted when the map has changed.
   */
  readonly changed: ISignal<this, ObservableMap.IChangedArgs<T>>;

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
   * Whether this map is linked to another.
   */
  readonly isLinked: boolean;

  /**
   * The number of key-value pairs in the map.
   */
  readonly size: number;

  /**
   * Converters for realtime synchronization.
   */
  readonly converters: Map<string, IRealtimeConverter<T>>;

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
   * Set the ObservableMap to an empty map.
   */
  clear(): void;

  /**
   * Dispose of the resources held by the map.
   */
  dispose(): void;

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
}


/**
 * A concrete implementation of IObservbleMap<T>.
 */
export
class ObservableMap<T> implements IObservableMap<T> {
  /**
   * Construct a new observable map.
   */
  constructor(options: ObservableMap.IOptions<T> = {}) {
    this._itemCmp = options.itemCmp || Private.itemCmp;
    this._converters = options.converters || new Map<string, IRealtimeConverter<T>>();
    if (options.values) {
      for (let key in options.values) {
        this._map.set(key, options.values[key]);
      }
    }
  }

  /**
   * Get whether this map can be linked to another.
   * If so, the functions `link` and `unlink` will perform
   * that. Otherwise, they are no-op functions.
   *
   * @returns `true`. 
   */
  readonly isLinkable: boolean = true;

  /**
   * A signal emitted when the map has changed.
   */
  get changed(): ISignal<this, ObservableMap.IChangedArgs<T>> {
    return this._changed;
  }

  /**
   * Whether this map has been disposed.
   */
  get isDisposed(): boolean {
    return this._map === null;
  }

  /**
   * Whether this map is linked to another.
   */
  get isLinked(): boolean {
    return this._parent !== null;
  }

  /**
   * The number of key-value pairs in the map.
   */
  get size(): number {
    if(this.isLinked) {
      return this._parent.keys().length;
    } else {
      return this._map.size;
    }
  }

  /**
   * Get the converter for realtime synchronization.
   */
  get converters(): Map<string, IRealtimeConverter<T>> {
    return this._converters;
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
  set(key: string, value: T): T {
    if(this.isLinked) {
      return this._parent.set(key, value);
    } else {
      let oldVal = this._map.get(key);
      if (value === undefined) {
        throw Error('Cannot set an undefined value, use remove');
      }
      // Bail if the value does not change.
      let itemCmp = this._itemCmp;
      if (oldVal !== undefined && itemCmp(oldVal, value)) {
        return;
      }
      this._map.set(key, value);
      this._changed.emit({
        type: oldVal ? 'change' : 'add',
        key: key,
        oldValue: oldVal,
        newValue: value
      });
      return oldVal;
    }
  }

  /**
   * Get a value for a given key.
   *
   * @param key - the key.
   *
   * @returns the value for that key.
   */
  get(key: string): T {
    if(this.isLinked) {
      return this._parent.get(key);
    } else {
      return this._map.get(key);
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
    if(this.isLinked) {
      return this._parent.has(key);
    } else {
      return this._map.has(key);
    }
  }

  /**
   * Get a list of the keys in the map.
   *
   * @returns - a list of keys.
   */
  keys(): string[] {
    if(this.isLinked) {
      return this._parent.keys();
    } else {
      let keyList: string[] = [];
      this._map.forEach((v: T, k: string) => {
        keyList.push(k);
      });
      return keyList;
    }
  }


  /**
   * Get a list of the values in the map.
   *
   * @returns - a list of values.
   */
  values(): T[] {
    if(this.isLinked) {
      return this._parent.values();
    } else {
      let valList: T[] = [];
      this._map.forEach((v: T, k: string) => {
        valList.push(v);
      });
      return valList;
    }
  }

  /**
   * Remove a key from the map
   *
   * @param key - the key to remove.
   *
   * @returns the value of the given key,
   *   or undefined if that does not exist.
   */
  delete(key: string): T {
    if(this.isLinked) {
      return this._parent.delete(key);
    } else {
      let oldVal = this._map.get(key);
      this._map.delete(key);
      this._changed.emit({
        type: 'remove',
        key: key,
        oldValue: oldVal,
        newValue: undefined
      });
      return oldVal;
    }
  }

  /**
   * Link the map to another map.
   * Any changes to either are mirrored in the other.
   *
   * @param map: the parent map.
   */
  link(map: IObservableMap<T>): void {
    let keyList = map.keys();
    let oldKeyList = this.keys();

    //Remove values not in the parent map
    for(let i = 0; i<oldKeyList.length; i++) {
      if(!map.has(oldKeyList[i])) {
        this.delete(oldKeyList[i]);
      }
    }
    //Insert new key-value pairs as necessary
    for(let i=0; i<keyList.length; i++) {
      let key = keyList[i];
      let oldValue = this._map.get(key);
      let newValue = map.get(key);
      if(oldValue && (oldValue as any).link) {
        (oldValue as any).link(newValue);
      } else {
        this.set(key, map.get(key));
      }
    }
    //Now that we have mirrored the two maps,
    //clear the local one and forward the signals
    this._map.clear();
    this._parent = map;
    this._parent.changed.connect(this._forwardSignal, this);
  }

  /**
   * Unlink the map from its parent map.
   */
  unlink(): void {
    if(this.isLinked) {
      if(!this._parent.isDisposed) {
        //Recreate the map locally
        let keyList = this._parent.keys();
        for(let i=0; i < keyList.length; i++) {
          this._map.set(keyList[i], this._parent.get(keyList[i]));
        }
      }
      this._parent.changed.disconnect(this._forwardSignal, this);
      this._parent = null;
    }
  }


  /**
   * Set the ObservableMap to an empty map.
   */
  clear(): void {
    if(this.isLinked) {
      this._parent.clear();
    } else {
      // Delete one by one to emit the correct signals.
      let keyList = this.keys();
      for(let i=0; i<keyList.length; i++) {
        this.delete(keyList[i]);
      }
    }
  }

  /**
   * Dispose of the resources held by the map.
   */
  dispose(): void {
    if (this._map === null) {
      return;
    }
    Signal.clearData(this);
    if(this.isLinked) {
      this.unlink();
    }
    this._map.clear();
    this._map = null;
  }

  /**
   * Catch a signal from the parent map and pass it on.
   */
  private _forwardSignal(s: IObservableMap<T>,
                         c: ObservableMap.IChangedArgs<T>) {
    this._changed.emit(c);
  }

  private _parent: IObservableMap<T> = null;
  private _map: Map<string, T> = new Map<string, T>();
  private _itemCmp: (first: T, second: T) => boolean;
  private _changed = new Signal<this, ObservableMap.IChangedArgs<T>>(this);
  private _converters: Map<string, IRealtimeConverter<T>> = null;
}


/**
 * The namespace for `ObservableMap` class statics.
 */
export
namespace ObservableMap {
  /**
   * The options used to initialize an observable map.
   */
  export
  interface IOptions<T> {
    /**
     * An optional intial set of values.
     */
    values?: { [key: string]: T };

    /**
     * The item comparison function for change detection on `set`.
     *
     * If not given, strict `===` equality will be used.
     */
    itemCmp?: (first: T, second: T) => boolean;

    converters?: Map<string, IRealtimeConverter<T>>;
  }

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


/**
 * The namespace for module private data.
 */
namespace Private {
  /**
   * The default strict equality item comparator.
   */
  export
  function itemCmp(first: any, second: any): boolean {
    return first === second;
  }
}
