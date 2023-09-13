// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

const DEFAULT_MAX_SIZE = 128;

/** A least-recently-used cache. */
export class LruCache<T, U> {
  protected _map = new Map<T, U>();
  protected _maxSize: number;

  constructor(options: LruCache.IOptions = {}) {
    this._maxSize = options?.maxSize || DEFAULT_MAX_SIZE;
  }

  /**
   * Return the current size of the cache.
   */
  get size() {
    return this._map.size;
  }

  /**
   * Clear the values in the cache.
   */
  clear() {
    this._map.clear();
  }

  /**
   * Get a value (or null) from the cache, pushing the item to the front of the cache.
   */
  get(key: T): U | null {
    const item = this._map.get(key) || null;
    if (item != null) {
      this._map.delete(key);
      this._map.set(key, item);
    }
    return item;
  }

  /**
   * Set a value in the cache, potentially evicting an old item.
   */
  set(key: T, value: U): void {
    if (this._map.size >= this._maxSize) {
      this._map.delete(this._map.keys().next().value);
    }
    this._map.set(key, value);
  }
}

export namespace LruCache {
  export interface IOptions {
    maxSize?: number | null;
  }
}
