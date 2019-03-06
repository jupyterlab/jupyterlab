// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { PromiseDelegate } from '@phosphor/coreutils';

import { IDisposable } from '@phosphor/disposable';

import { ISignal, Signal } from '@phosphor/signaling';

/**
 * A class that wraps an asynchronous function to poll at a regular interval
 * with exponential increases to the interval length if the poll fails.
 *
 * #### Notes
 * The generic arguments are as follows:
 *  - `T = any` indicates the resolved type of the factory's promises.
 *  - `U = any` indicates the rejected type of the factory's promises.
 */
export class Poll<T = any, U = any> implements IDisposable {
  /**
   * Instantiate a new poll with exponential back-off in case of failure.
   *
   * @param options - The poll instantiation options.
   */
  constructor(options: Poll.IOptions<T, U>) {
    const { factory, interval, max, min, name, variance, when } = options;

    if (interval > max) {
      throw new Error('Poll interval cannot exceed max interval length');
    }
    if (min > max || min > interval) {
      throw new Error('Poll min cannot exceed poll interval or poll max');
    }

    this.interval =
      typeof interval === 'number' ? Math.round(Math.abs(interval)) : 1000;
    this.max = typeof max === 'number' ? Math.abs(max) : 10 * this.interval;
    this.min = typeof min === 'number' ? Math.abs(min) : 100;
    this.name = name || 'unknown';
    this.variance = typeof variance === 'number' ? variance : 0.2;
    this._factory = factory;

    // Create the initial outstanding next poll promise.
    const next = new PromiseDelegate<this>();
    this._next = next;

    // Set the initial poll state.
    this._state = {
      interval: this.interval,
      payload: null,
      phase: 'standby',
      tick: new Date().getTime()
    };

    // Schedule the first poll execution after the `when` promise is resolved.
    (when || Promise.resolve())
      .then(() => {
        // Bail if disposed while `when` promise was in flight.
        if (this._isDisposed) {
          return;
        }
        this._next = null;
        this._schedule({
          interval: this.interval,
          payload: null,
          phase: 'when-resolved',
          tick: new Date().getTime()
        });
        this._resolve(next);
      })
      .catch(reason => {
        // Bail if disposed while `when` promise was in flight.
        if (this._isDisposed) {
          return;
        }
        this._next = null;
        this._schedule({
          interval: this.interval,
          payload: null,
          phase: 'when-rejected',
          tick: new Date().getTime()
        });
        this._resolve(next);
        // Warn that `when` promise was rejected but starting anyway.
        console.warn(`Poll (${this.name}) starting despite rejection.`, reason);
      });
  }

  /**
   * The polling interval.
   */
  readonly interval: number;

  /**
   * The maximum interval between poll requests.
   */
  readonly max: number;

  /**
   * The minimum interval between poll requests.
   */
  readonly min: number;

  /**
   * The name of the poll. Defaults to `'unknown'`.
   */
  readonly name: string;

  /**
   * The range within which the poll interval jitters.
   */
  readonly variance: number;

  /**
   * A signal emitted when the poll is disposed.
   */
  get disposed(): ISignal<this, void> {
    return this._disposed;
  }

  /**
   * Whether the poll is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * A handle to the next link in the poll promise chain.
   */
  get next(): Promise<this> {
    return this._next.promise;
  }

  /**
   * A handle to the next link in the poll promise chain.
   */
  get state(): Poll.State<T, U> {
    return this._state;
  }

  /**
   * A signal emitted when the poll ticks and fires off a new request.
   */
  get ticked(): ISignal<this, void> {
    return this._ticked;
  }

  /**
   * Dispose the poll, stop executing future poll requests.
   */
  dispose(): void {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    this._disposed.emit();
    Signal.clearData(this);
    if (this._next) {
      const outstanding = this._next;
      this._next = null;

      // Catch disposal rejection before rejecting the outstanding promise.
      outstanding.promise.catch(_ => undefined);
      outstanding.reject(new Error(`Poll (${this.name}) is disposed.`));
    }
  }

  /**
   * Refresh the poll.
   */
  refresh(): this {
    this._schedule({
      interval: 0,
      payload: null,
      phase: 'override',
      tick: new Date().getTime()
    });
    return this;
  }

  /**
   * Execute a poll request.
   */
  private _execute(delegate: PromiseDelegate<this>): void {
    if (this._isDisposed) {
      return;
    }

    const { max, min, variance } = this;

    // Reschedule without executing poll promise if application is hidden.
    if (typeof document !== 'undefined' && document.hidden) {
      this._next = null;
      this._schedule({
        interval: Private.jitter(this.interval, variance, min, max),
        payload: null,
        phase: 'standby',
        tick: new Date().getTime()
      });
      this._resolve(delegate);
      return;
    }

    // Generate a new poll promise and handle its resolution.
    this._factory(this._state)
      .then((resolved: T) => {
        // Bail if disposed while poll promise was in flight.
        if (this._isDisposed) {
          return;
        }

        // Bail if this promise has already been superseded.
        if (this._next !== delegate) {
          return;
        }

        // Schedule the next poll.
        this._next = null;
        this._schedule({
          interval: Private.jitter(this.interval, variance, min, max),
          payload: resolved,
          phase: this._state.phase === 'rejected' ? 'reconnect' : 'resolved',
          tick: new Date().getTime()
        });
        this._resolve(delegate);
      })
      .catch((rejected: U) => {
        // Bail if disposed while poll promise was in flight.
        if (this._isDisposed) {
          return;
        }

        // Bail if this promise has already been superseded.
        if (this._next !== delegate) {
          return;
        }

        // Schedule the next poll.
        const old = this._state;
        const increased = Math.min(old.interval * 2, max);
        const updated: Poll.State<T, U> = {
          interval: Private.jitter(increased, variance, min, max),
          payload: rejected,
          phase: 'rejected',
          tick: new Date().getTime()
        };
        this._next = null;
        this._schedule(updated);
        this._resolve(delegate);

        // Warn that the poll request was rejected.
        console.warn(
          `Poll (${this.name}) failed, changing interval from ${
            old.interval
          } to ${updated.interval}.`,
          rejected
        );
      });
  }

  /**
   * Resolve an outstanding delegate and emit a ticked signal.
   */
  private _resolve(delegate: PromiseDelegate<this>): void {
    delegate.promise.then(() => {
      this._ticked.emit();
    });
    delegate.resolve(this);
  }

  /**
   * Schedule a poll request and return the next link in the promise chain,
   * disrupting the outstanding poll if necessary.
   *
   * #### Notes
   * The next poll promise returned is guaranteed to always resolve with a
   * handle on the correct next link in the poll promise chain except when the
   * poll is disposed.
   *
   * This method is responsible for maintaining internal poll state.
   */
  private _schedule(state: Poll.State<T, U>): void {
    const outstanding = this._next;

    // If poll is being overridden, generate a new poll.
    if (state.phase === 'override' && outstanding) {
      // Schedule the next poll and resolve the outstanding promise.
      this._next = null;
      this._schedule(state);
      this._resolve(outstanding);
      return;
    }

    // Bail if there is already an outstanding poll.
    if (outstanding) {
      return;
    }

    // Update the state.
    this._state = state;

    // Create the next poll promise and set the outstanding reference.
    const next = new PromiseDelegate<this>();
    this._next = next;

    // Schedule the poll request.
    const request = () => {
      if (this._isDisposed) {
        return;
      }
      this._execute(next);
    };
    clearTimeout(this._timeout);
    this._timeout = state.interval
      ? setTimeout(request, state.interval)
      : requestAnimationFrame(request);
  }

  private _disposed = new Signal<this, void>(this);
  private _factory: Poll.Factory<T, U>;
  private _isDisposed = false;
  private _next: PromiseDelegate<this> | null = null;
  private _state: Poll.State<T, U>;
  private _ticked = new Signal<this, void>(this);
  private _timeout = 0;
}

/**
 * A namespace for `Poll` class statics, types, and interfaces.
 */
export namespace Poll {
  /**
   * A factory that generates poll request promises.
   *
   * #### Notes
   * The generic arguments are as follows:
   *  - `T` indicates the resolved type of the factory's promises.
   *  - `U` indicates the rejected type of the factory's promises.
   */
  export type Factory<T, U> = (state: State<T, U>) => Promise<T>;

  /**
   * The phase of tbe poll when the current request was scheduled, i.e. the end
   * state of the immediately preceding link of the promise chain.
   */
  export type Phase =
    | 'override'
    | 'reconnect'
    | 'rejected'
    | 'resolved'
    | 'standby'
    | 'when-rejected'
    | 'when-resolved';

  /**
   * Definition of poll state at any given tick.
   */
  export type State<T, U> = {
    /**
     * The number of milliseconds until the next poll request.
     */
    readonly interval: number;

    /**
     * The payload of the last poll resolution or rejection.
     *
     * #### Notes
     * `payload` is `null` unless the `phase` is `'resolved'` or `'rejected'`.
     * `payload` is of type `T` for resolutions and `U` for rejections.
     */
    readonly payload: T | U | null;

    /**
     * The current poll phase.
     */
    readonly phase: Phase;

    /**
     * The timestamp of the current poll tick.
     */
    readonly tick: number;
  };

  /**
   * Instantiation options for polls.
   *
   * #### Notes
   * The generic arguments are as follows:
   *  - `T` indicates the resolved type of the factory's promises.
   *  - `U` indicates the rejected type of the factory's promises.
   */
  export interface IOptions<T, U> {
    /**
     * The millisecond interval between poll requests. Defaults to `1000`.
     *
     * #### Notes
     * If set to `0`, the poll will schedule an animation frame after each
     * promise resolution.
     */
    interval?: number;

    /**
     * The maximum interval to wait between polls. Defaults to `10 * interval`.
     */
    max?: number;

    /**
     * The minimum interval to wait between polls. Defaults to `100`.
     */
    min?: number;

    /**
     * The name of the poll. Defaults to `'unknown'`.
     */
    name?: string;

    /**
     * A factory function that is passed poll state and returns a poll promise.
     *
     * #### Notes
     * It is safe to ignore the state argument.
     *
     * The generic arguments are as follows:
     *  - `T` indicates the resolved type of the factory's promises.
     *  - `U` indicates the rejected type of the factory's promises.
     */
    factory: Factory<T, U>;

    /**
     * If set, a promise which must resolve (or reject) before polling begins.
     */
    when?: Promise<any>;

    /**
     * The range within which the poll interval jitters. Defaults to `0.2`.
     *
     * #### Notes
     * Unless set to `0` the poll interval will be irregular.
     */
    variance?: number;
  }
}

/**
 * A namespace for private module data.
 */
namespace Private {
  /**
   * Returns a randomly jittered integer value.
   *
   * @param base - The base value that is being wobbled.
   *
   * @param factor - Factor multiplied by the base to define jitter amplitude.
   * A factor of `0` will return the nearest rounded integer to base.
   *
   * @param min - The smallest acceptable value to return.
   *
   * @param max - The largest acceptable value to return.
   *
   * #### Notes
   * This function returns only positive integers.
   */
  export function jitter(
    base: number,
    factor: number,
    min: number,
    max: number
  ): number {
    if (factor === 0) {
      return Math.round(base);
    }

    const direction = Math.random() < 0.5 ? 1 : -1;
    const jitter = Math.random() * base * Math.abs(factor) * direction;
    const candidate = Math.abs(Math.round(base + jitter));

    return Math.min(Math.max(min, candidate), max);
  }
}
