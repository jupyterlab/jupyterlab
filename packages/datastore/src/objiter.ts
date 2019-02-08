/*-----------------------------------------------------------------------------
| Copyright (c) 2014-2017, PhosphorJS Contributors
|
| Distributed under the terms of the BSD 3-Clause License.
|
| The full license is in the file LICENSE, distributed with this software.
|----------------------------------------------------------------------------*/

import { IIterator } from '@phosphor/algorithm';

/**
 * Create an iterator for the keys in an object.
 *
 * @param object - The object of interest.
 *
 * @returns A new iterator for the keys in the given object.
 *
 * #### Complexity
 * Linear.
 *
 * #### Example
 * ```typescript
 * import { each, keys } from '@phosphor/algorithm';
 *
 * let data = { one: 1, two: 2, three: 3 };
 *
 * each(keys(data), key => { console.log(key); }); // 'one', 'two', 'three'
 * ```
 */
export function iterKeys<T>(object: {
  readonly [key: string]: T;
}): IIterator<string> {
  return new KeyIterator(object);
}

/**
 * Create an iterator for the values in an object.
 *
 * @param object - The object of interest.
 *
 * @returns A new iterator for the values in the given object.
 *
 * #### Complexity
 * Linear.
 *
 * #### Example
 * ```typescript
 * import { each, values } from '@phosphor/algorithm';
 *
 * let data = { one: 1, two: 2, three: 3 };
 *
 * each(values(data), value => { console.log(value); }); // 1, 2, 3
 * ```
 */
export function iterValues<T>(object: {
  readonly [key: string]: T;
}): IIterator<T> {
  return new ValueIterator<T>(object);
}

/**
 * Create an iterator for the items in an object.
 *
 * @param object - The object of interest.
 *
 * @returns A new iterator for the items in the given object.
 *
 * #### Complexity
 * Linear.
 *
 * #### Example
 * ```typescript
 * import { each, items } from '@phosphor/algorithm';
 *
 * let data = { one: 1, two: 2, three: 3 };
 *
 * each(items(data), value => { console.log(value); }); // ['one', 1], ['two', 2], ['three', 3]
 * ```
 */
export function iterItems<T>(object: {
  readonly [key: string]: T;
}): IIterator<[string, T]> {
  return new ItemIterator<T>(object);
}

/**
 * An iterator for the keys in an object.
 *
 * #### Notes
 * This iterator can be used for any JS object.
 */
export class KeyIterator implements IIterator<string> {
  /**
   * Construct a new key iterator.
   *
   * @param source - The object of interest.
   *
   * @param keys - The keys to iterate, if known.
   */
  constructor(
    source: { readonly [key: string]: any },
    keys = Object.keys(source)
  ) {
    this._source = source;
    this._keys = keys;
  }

  /**
   * Get an iterator over the object's values.
   *
   * @returns An iterator which yields the object's values.
   */
  iter(): IIterator<string> {
    return this;
  }

  /**
   * Create an independent clone of the iterator.
   *
   * @returns A new independent clone of the iterator.
   */
  clone(): IIterator<string> {
    let result = new KeyIterator(this._source, this._keys);
    result._index = this._index;
    return result;
  }

  /**
   * Get the next value from the iterator.
   *
   * @returns The next value from the iterator, or `undefined`.
   */
  next(): string | undefined {
    if (this._index >= this._keys.length) {
      return undefined;
    }
    let key = this._keys[this._index++];
    if (key in this._source) {
      return key;
    }
    return this.next();
  }

  private _index = 0;
  private _keys: string[];
  private _source: { readonly [key: string]: any };
}

/**
 * An iterator for the values in an object.
 *
 * #### Notes
 * This iterator can be used for any JS object.
 */
export class ValueIterator<T> implements IIterator<T> {
  /**
   * Construct a new value iterator.
   *
   * @param source - The object of interest.
   *
   * @param keys - The keys to iterate, if known.
   */
  constructor(
    source: { readonly [key: string]: T },
    keys = Object.keys(source)
  ) {
    this._source = source;
    this._keys = keys;
  }

  /**
   * Get an iterator over the object's values.
   *
   * @returns An iterator which yields the object's values.
   */
  iter(): IIterator<T> {
    return this;
  }

  /**
   * Create an independent clone of the iterator.
   *
   * @returns A new independent clone of the iterator.
   */
  clone(): IIterator<T> {
    let result = new ValueIterator<T>(this._source, this._keys);
    result._index = this._index;
    return result;
  }

  /**
   * Get the next value from the iterator.
   *
   * @returns The next value from the iterator, or `undefined`.
   */
  next(): T | undefined {
    if (this._index >= this._keys.length) {
      return undefined;
    }
    let key = this._keys[this._index++];
    if (key in this._source) {
      return this._source[key];
    }
    return this.next();
  }

  private _index = 0;
  private _keys: string[];
  private _source: { readonly [key: string]: T };
}

/**
 * An iterator for the items in an object.
 *
 * #### Notes
 * This iterator can be used for any JS object.
 */
export class ItemIterator<T> implements IIterator<[string, T]> {
  /**
   * Construct a new item iterator.
   *
   * @param source - The object of interest.
   *
   * @param keys - The keys to iterate, if known.
   */
  constructor(
    source: { readonly [key: string]: T },
    keys = Object.keys(source)
  ) {
    this._source = source;
    this._keys = keys;
  }

  /**
   * Get an iterator over the object's values.
   *
   * @returns An iterator which yields the object's values.
   */
  iter(): IIterator<[string, T]> {
    return this;
  }

  /**
   * Create an independent clone of the iterator.
   *
   * @returns A new independent clone of the iterator.
   */
  clone(): IIterator<[string, T]> {
    let result = new ItemIterator<T>(this._source, this._keys);
    result._index = this._index;
    return result;
  }

  /**
   * Get the next value from the iterator.
   *
   * @returns The next value from the iterator, or `undefined`.
   */
  next(): [string, T] | undefined {
    if (this._index >= this._keys.length) {
      return undefined;
    }
    let key = this._keys[this._index++];
    if (key in this._source) {
      return [key, this._source[key]];
    }
    return this.next();
  }

  private _index = 0;
  private _keys: string[];
  private _source: { readonly [key: string]: T };
}
