// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IDisposable, IObservableDisposable } from '@phosphor/disposable';

import { ISignal } from '@phosphor/signaling';

/**
 * A generic interface for change emitter payloads.
 */
export interface IChangedArgs<T> {
  /**
   * The name of the changed attribute.
   */
  name: string;

  /**
   * The old value of the changed attribute.
   */
  oldValue: T;

  /**
   * The new value of the changed attribute.
   */
  newValue: T;
}

/**
 * The description of a general purpose data connector.
 *
 * @typeparam T - The basic entity response type a service's connector.
 *
 * @typeparam U - The basic entity request type, which is conventionally the
 * same as the response type but may be different if a service's implementation
 * requires input data to be different from output responses. Defaults to `T`.
 *
 * @typeparam V - The basic token applied to a request, conventionally a string
 * ID or filter, but may be set to a different type when an implementation
 * requires it. Defaults to `string`.
 */
export interface IDataConnector<T, U = T, V = string> {
  /**
   * Retrieve an item from the data connector.
   *
   * @param id - The identifier used to retrieve an item.
   *
   * @returns A promise that bears a data payload if available.
   *
   * #### Notes
   * The promise returned by this method may be rejected if an error occurs in
   * retrieving the data. Nonexistence of an `id` resolves with `undefined`.
   */
  fetch(id: V): Promise<T | undefined>;

  /**
   * Retrieve the list of items available from the data connector.
   *
   * @param query - The optional query filter to apply to the connector request.
   *
   * @returns A promise that bears a list of `values` and an associated list of
   * fetch `ids`.
   *
   * #### Notes
   * The promise returned by this method may be rejected if an error occurs in
   * retrieving the data. The two lists will always be the same size. If there
   * is no data, this method will succeed with empty `ids` and `values`.
   */
  list(query?: any): Promise<{ ids: V[]; values: T[] }>;

  /**
   * Remove a value using the data connector.
   *
   * @param id - The identifier for the data being removed.
   *
   * @returns A promise that is rejected if remove fails and succeeds otherwise.
   *
   * #### Notes
   * This promise may resolve with a back-end response or `undefined`.
   * Existence of resolved content in the promise is not prescribed and must be
   * tested for. For example, some back-ends may return a copy of the item of
   * type `T` being removed while others may return no content.
   */
  remove(id: V): Promise<any>;

  /**
   * Save a value using the data connector.
   *
   * @param id - The identifier for the data being saved.
   *
   * @param value - The data being saved.
   *
   * @returns A promise that is rejected if saving fails and succeeds otherwise.
   *
   * #### Notes
   * This promise may resolve with a back-end response or `undefined`.
   * Existence of resolved content in the promise is not prescribed and must be
   * tested for. For example, some back-ends may return a copy of the item of
   * type `T` being saved while others may return no content.
   */
  save(id: V, value: U): Promise<any>;
}

/**
 * A tracker that tracks instances of a generic objects.
 *
 * @typeparam T - The type of object being tracked.
 */
export interface IInstanceTracker<T extends IObservableDisposable>
  extends IDisposable {
  /**
   * A signal emitted when an instance is added.
   *
   * ####
   * This signal does not emit if an instance is added using `inject()`.
   */
  readonly added: ISignal<this, T>;

  /**
   * The current object instance.
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
 * A function whose invocations are rate limited and can be stopped after
 * invocation before it has fired.
 *
 * @typeparam T - The resolved type of the underlying function. Defaults to any.
 *
 * @typeparam U - The rejected type of the underlying function. Defaults to any.
 */
export interface IRateLimiter<T = any, U = any> extends IDisposable {
  /**
   * The rate limit in milliseconds.
   */
  readonly limit: number;

  /**
   * Invoke the rate limited function.
   */
  invoke(): Promise<T>;

  /**
   * Stop the function if it is mid-flight.
   */
  stop(): Promise<void>;
}
