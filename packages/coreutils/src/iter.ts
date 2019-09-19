// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IIterable,
  IIterator,
  ArrayIterator,
  FilterIterator,
  MapIterator,
  each
} from '@phosphor/algorithm';

/**
 * A type alias for a Phosphor iterable, array-like, JS iterable, or JS iterator object.
 */
export type IterableOrArrayLike<T> =
  | IIterable<T>
  | ArrayLike<T>
  | Iterator<T>
  | Iterable<T>;

/**
 * Create an iterator for an iterable object.
 *
 * @param object - The Phosphor iterable, array-like, or JS iterable or iterator object of interest.
 *
 * @returns A new Phosphor iterator for the given object.
 *
 * #### Notes
 * This function allows iteration algorithms to operate on user-defined
 * iterable types and builtin array-like objects in a uniform fashion.
 */
export function iter<T>(object: IterableOrArrayLike<T>): ConvenientIterator<T> {
  let it: IIterator<T>;
  if (typeof (object as any).iter === 'function') {
    it = (object as IIterable<T>).iter();
  } else if (typeof (object as any).length === 'number') {
    it = new ArrayIterator<T>(object as ArrayLike<T>);
  } else if (
    typeof (object as any)[Symbol.iterator] === 'function' ||
    typeof (object as any).next === 'function'
  ) {
    it = new JSToPhosphorIterator(object as Iterable<T> | Iterator<T>);
  }
  return new ConvenientIterator(it);
}

/**
 * A Phosphor iterator and iterable that is also a JS iterable.
 */
export type FullIterable<T> = IIterator<T> & Iterable<T>;

/**
 * A convenience iterator that defines some very common iteration functions.
 */
class ConvenientIterator<T> implements FullIterable<T> {
  constructor(it: IIterator<T>) {
    this._it = it;
  }

  next(): T | undefined {
    return this._it.next();
  }

  clone(): IIterator<T> {
    return new ConvenientIterator(this._it.clone());
  }

  iter(): IIterator<T> {
    return this;
  }

  /**
   * Wrap this iterator in a JavaScript iteratable/iterator.
   */
  jsIter(): IterableIterator<T> {
    return new PhosphorToJSIterator(this);
  }

  [Symbol.iterator](): Iterator<T> {
    return this.jsIter();
  }

  filter(fn: (value: T, index: number) => boolean): ConvenientIterator<T> {
    return new ConvenientIterator(new FilterIterator<T>(this, fn));
  }

  map<U>(fn: (value: T, index: number) => U): ConvenientIterator<U> {
    return new ConvenientIterator(new MapIterator<T, U>(this, fn));
  }

  each(fn: (value: T, index: number) => boolean | void): void {
    each(this, fn);
  }

  private _it: IIterator<T>;
}

/**
 * Wraps a JavaScript iterator in a Phosphor iterator
 *
 * @param object - The iterable or array-like object of interest.
 *
 * @returns A new iterator for the given object.
 *
 * #### Notes
 * This function allows iteration algorithms to operate on user-defined
 * iterable types and builtin array-like objects in a uniform fashion.
 */
export class JSToPhosphorIterator<T> implements IIterator<T> {
  /**
   * Construct a new Phosphor iterator from a JavaScript iterator.
   *
   * @param it - The iterator-like function of interest.
   */
  constructor(it: Iterator<T> | Iterable<T>) {
    if (typeof (it as any)[Symbol.iterator] === 'function') {
      it = (it as Iterable<T>)[Symbol.iterator]();
    }
    this._it = it as Iterator<T>;
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
    throw new Error('A `JSIterator` cannot be cloned.');
  }

  /**
   * Get the next value from the iterator.
   *
   * @returns The next value from the iterator, or `undefined`.
   */
  next(): T | undefined {
    const { done, value } = this._it.next();
    if (done) {
      return undefined;
    }
    if (value === undefined) {
      throw new Error(
        "'undefined' is a Phosphor iterator value, which is not allowed"
      );
    }
    return value;
  }

  private _it: Iterator<T>;
}

/**
 * Converts a Phosphor iterator into a JS iterator.
 */
export function iterjs<T>(it: IterableOrArrayLike<T>): IterableIterator<T> {
  return new PhosphorToJSIterator(it);
}

/**
 * Converts a Phosphor iterator into a JS iterator.
 */
export class PhosphorToJSIterator<T> implements IterableIterator<T> {
  constructor(it: IterableOrArrayLike<T>) {
    this._it = iter(it);
  }

  [Symbol.iterator]: () => this;

  next(): IteratorResult<T, any> {
    const value = this._it.next();
    if (value === undefined) {
      return { done: true, value };
    } else {
      return { value };
    }
  }

  private _it: IIterator<T>;
}
