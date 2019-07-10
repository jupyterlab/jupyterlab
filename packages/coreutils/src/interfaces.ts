// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { CommandRegistry } from '@phosphor/commands';

import { ReadonlyJSONObject, ReadonlyJSONValue } from '@phosphor/coreutils';

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
 * A pool of objects whose disposable lifecycle is tracked.
 *
 * @typeparam T - The type of object held in the pool.
 */
export interface IObjectPool<T extends IObservableDisposable>
  extends IDisposable {
  /**
   * A signal emitted when an object is added.
   *
   * ####
   * This signal does not emit if an object is added using `inject()`.
   */
  readonly added: ISignal<this, T>;

  /**
   * The current object.
   */
  readonly current: T | null;

  /**
   * A signal emitted when the current object changes.
   *
   * #### Notes
   * If the last object being tracked is disposed, `null` will be emitted.
   */
  readonly currentChanged: ISignal<this, T | null>;

  /**
   * The number of objects held by the pool.
   */
  readonly size: number;

  /**
   * A signal emitted when an object is updated.
   */
  readonly updated: ISignal<this, T>;

  /**
   * Find the first object in the pool that satisfies a filter function.
   *
   * @param - fn The filter function to call on each object.
   *
   * #### Notes
   * If nothing is found, the value returned is `undefined`.
   */
  find(fn: (obj: T) => boolean): T | undefined;

  /**
   * Iterate through each object in the pool.
   *
   * @param fn - The function to call on each object.
   */
  forEach(fn: (obj: T) => void): void;

  /**
   * Filter the objects in the pool based on a predicate.
   *
   * @param fn - The function by which to filter.
   */
  filter(fn: (obj: T) => boolean): T[];

  /**
   * Check if this pool has the specified object.
   *
   * @param obj - The object whose existence is being checked.
   */
  has(obj: T): boolean;
}

/**
 * A readonly poll that calls an asynchronous function with each tick.
 *
 * @typeparam T - The resolved type of the factory's promises.
 *
 * @typeparam U - The rejected type of the factory's promises.
 *
 * @typeparam V - The type to extend the phases supported by a poll.
 */
export interface IPoll<T, U, V extends string> {
  /**
   * A signal emitted when the poll is disposed.
   */
  readonly disposed: ISignal<this, void>;

  /**
   * The polling frequency data.
   */
  readonly frequency: IPoll.Frequency;

  /**
   * Whether the poll is disposed.
   */
  readonly isDisposed: boolean;

  /**
   * The name of the poll.
   */
  readonly name: string;

  /**
   * The poll state, which is the content of the currently-scheduled poll tick.
   */
  readonly state: IPoll.State<T, U, V>;

  /**
   * A promise that resolves when the currently-scheduled tick completes.
   *
   * #### Notes
   * Usually this will resolve after `state.interval` milliseconds from
   * `state.timestamp`. It can resolve earlier if the user starts or refreshes the
   * poll, etc.
   */
  readonly tick: Promise<IPoll<T, U, V>>;

  /**
   * A signal emitted when the poll state changes, i.e., a new tick is scheduled.
   */
  readonly ticked: ISignal<IPoll<T, U, V>, IPoll.State<T, U, V>>;
}

/**
 * A namespace for `IPoll` types.
 */
export namespace IPoll {
  /**
   * The polling frequency parameters.
   *
   * #### Notes
   * We implement the "decorrelated jitter" strategy from
   * https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/.
   * Essentially, if consecutive retries are needed, we choose an integer:
   * `sleep = min(max, rand(interval, backoff * sleep))`
   * This ensures that the poll is never less than `interval`, and nicely
   * spreads out retries for consecutive tries. Over time, if (interval < max),
   * the random number will be above `max` about (1 - 1/backoff) of the time
   * (sleeping the `max`), and the rest of the time the sleep will be a random
   * number below `max`, decorrelating our trigger time from other pollers.
   */
  export type Frequency = {
    /**
     * Whether poll frequency backs off (boolean) or the backoff growth rate
     * (float > 1).
     *
     * #### Notes
     * If `true`, the default backoff growth rate is `3`.
     */
    readonly backoff: boolean | number;

    /**
     * The basic polling interval in milliseconds (integer).
     */
    readonly interval: number;

    /**
     * The maximum milliseconds (integer) between poll requests.
     */
    readonly max: number;
  };

  /**
   * The phase of the poll when the current tick was scheduled.
   *
   * @typeparam T - A type for any additional tick phases a poll supports.
   */
  export type Phase<T extends string> =
    | T
    | 'constructed'
    | 'disposed'
    | 'reconnected'
    | 'refreshed'
    | 'rejected'
    | 'resolved'
    | 'standby'
    | 'started'
    | 'stopped';

  /**
   * Definition of poll state at any given time.
   *
   * @typeparam T - The resolved type of the factory's promises.
   *
   * @typeparam U - The rejected type of the factory's promises.
   *
   * @typeparam V - The type to extend the phases supported by a poll.
   */
  export type State<T, U, V extends string> = {
    /**
     * The number of milliseconds until the current tick resolves.
     */
    readonly interval: number;

    /**
     * The payload of the last poll resolution or rejection.
     *
     * #### Notes
     * The payload is `null` unless the `phase` is `'reconnected`, `'resolved'`,
     * or `'rejected'`. Its type is `T` for resolutions and `U` for rejections.
     */
    readonly payload: T | U | null;

    /**
     * The current poll phase.
     */
    readonly phase: Phase<V>;

    /**
     * The timestamp for when this tick was scheduled.
     */
    readonly timestamp: number;
  };
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

/**
 * An interface for a state restorer.
 *
 * @typeparam T - The restorable collection's type.
 *
 * @typeparam U - The type of object held by the restorable collection.
 *
 * @typeparam V - The `restored` promise resolution type. Defaults to `any`.
 */
export interface IRestorer<
  T extends IRestorable<U> = IRestorable<IObservableDisposable>,
  U extends IObservableDisposable = IObservableDisposable,
  V = any
> {
  /**
   * Restore the objects in a given restorable collection.
   *
   * @param restorable - The restorable collection being restored.
   *
   * @param options - The configuration options that describe restoration.
   *
   * @returns A promise that settles when restored with `any` results.
   *
   */
  restore(restorable: T, options: IRestorable.IOptions<U>): Promise<V>;

  /**
   * A promise that settles when the collection has been restored.
   */
  readonly restored: Promise<V>;
}

/**
 * A namespace for `IRestorer` interface definitions.
 */
export namespace IRestorer {
  /**
   * The state restoration configuration options.
   *
   * @typeparam T - The type of object held by the restorable collection.
   */
  export interface IOptions<T extends IObservableDisposable> {
    /**
     * The command to execute when restoring instances.
     */
    command: string;

    /**
     * A function that returns the args needed to restore an instance.
     */
    args?: (obj: T) => ReadonlyJSONObject;

    /**
     * A function that returns a unique persistent name for this instance.
     */
    name: (obj: T) => string;

    /**
     * The point after which it is safe to restore state.
     */
    when?: Promise<any> | Array<Promise<any>>;
  }
}

/**
 * An interface for objects that can be restored.
 *
 * @typeparam T - The type of object held by the restorable collection.
 *
 * @typeparam U - The `restored` promise resolution type. Defaults to `any`.
 */
export interface IRestorable<T extends IObservableDisposable, U = any> {
  /**
   * Restore the objects in this restorable collection.
   *
   * @param options - The configuration options that describe restoration.
   *
   * @returns A promise that settles when restored with `any` results.
   *
   */
  restore(options: IRestorable.IOptions<T>): Promise<U>;

  /**
   * A promise that settles when the collection has been restored.
   */
  readonly restored: Promise<U>;
}

/**
 * A namespace for `IRestorable` interface definitions.
 */
export namespace IRestorable {
  /**
   * The state restoration configuration options.
   *
   * @typeparam T - The type of object held by the restorable collection.
   */
  export interface IOptions<T extends IObservableDisposable>
    extends IRestorer.IOptions<T> {
    /**
     * The data connector to fetch restore data.
     */
    connector: IDataConnector<ReadonlyJSONValue>;

    /**
     * The command registry which holds the restore command.
     */
    registry: CommandRegistry;
  }
}
