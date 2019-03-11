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
    this._state = {
      interval: this.interval,
      payload: null,
      phase: 'instantiated',
      timestamp: new Date().getTime()
    };

    // Schedule a poll tick after the `when` promise is resolved.
    (when || Promise.resolve())
      .then(() => {
        // Bail if disposed while `when` promise was in flight.
        if (this.isDisposed) {
          return;
        }

        // Resolve the poll and schedule the next tick.
        this._resolve(this._tick, {
          interval: this.interval,
          payload: null,
          phase: 'instantiated-resolved',
          timestamp: new Date().getTime()
        });
      })
      .catch(reason => {
        // Bail if disposed while `when` promise was in flight.
        if (this.isDisposed) {
          return;
        }

        // Resolve the poll and schedule the next tick.
        this._resolve(this._tick, {
          interval: this.interval,
          payload: null,
          phase: 'instantiated-rejected',
          timestamp: new Date().getTime()
        });

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
    return this._tick === null;
  }

  /**
   * A promise that resolves when the poll next ticks.
   */
  get tick(): Promise<this> {
    return this._tick.promise;
  }

  /**
   * The poll state, which is the content of the current poll tick.
   */
  get state(): Poll.Tick<T, U> {
    return this._state;
  }

  /**
   * A signal emitted when the poll ticks and fires off a new request.
   */
  get ticked(): ISignal<this, Poll.Tick<T, U>> {
    return this._ticked;
  }

  /**
   * Dispose the poll, stop executing future poll requests.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }

    this._tick.promise.catch(_ => undefined);
    this._tick.reject(new Error(`Poll (${this.name}) is disposed.`));
    this._tick = null;
    this._disposed.emit();
    Signal.clearData(this);
  }

  /**
   * Resolves the outstanding poll and schedules the next tick immediately.
   *
   * #### Notes
   * If the poll has been instantiated but its `when` promise has not yet
   * resolved, this call will be scheduled after the `when` promise resolves.
   *
   * It is safe to call this method multiple times. It returns the outstanding
   * poll request if the current tick phase is `'refreshed'`.
   */
  async refresh(): Promise<this> {
    if (this._state.phase === 'instantiated') {
      await this._tick.promise;
    }

    if (this._state.phase === 'refreshed') {
      return this._tick.promise;
    }

    return this._resolve(this._tick, {
      interval: 0, // Immediately.
      payload: null,
      phase: 'refreshed',
      timestamp: new Date().getTime()
    }).promise;
  }

  /**
   * Starts polling.
   *
   * #### Notes
   * If the poll has been instantiated but its `when` promise has not yet
   * resolved, this call will be scheduled after the `when` promise resolves.
   *
   * It is safe to call this method multiple times. The poll will only start
   * if its current tick phase is `'standby'` or `'stopped'`.
   */
  async start(): Promise<this> {
    if (this._state.phase === 'instantiated') {
      await this._tick.promise;
    }

    if (this._state.phase !== 'standby' && this._state.phase !== 'stopped') {
      return this._tick.promise;
    }

    return this._resolve(this._tick, {
      interval: 0, // Immediately.
      payload: null,
      phase: 'started',
      timestamp: new Date().getTime()
    }).promise;
  }

  /**
   * Stops polling.
   *
   * #### Notes
   * If the poll has been instantiated but its `when` promise has not yet
   * resolved, this call will be scheduled after the `when` promise resolves.
   *
   * It is safe to call this method multiple times. The poll will only stop if
   * its current tick phase is not `'stopped'`.
   */
  async stop(): Promise<this> {
    if (this._state.phase === 'instantiated') {
      await this._tick.promise;
    }

    if (this._state.phase === 'stopped') {
      return this;
    }

    this._resolve(this._tick, {
      interval: Infinity, // Never.
      payload: null,
      phase: 'stopped',
      timestamp: new Date().getTime()
    });

    return this;
  }

  /**
   * Execute a poll request.
   */
  private _request(poll: PromiseDelegate<this>): void {
    const { max, min, variance } = this;

    // Reschedule without executing poll promise if application is hidden.
    if (typeof document !== 'undefined' && document && document.hidden) {
      this._resolve(poll, {
        interval: Private.jitter(this.interval, variance, min, max),
        payload: null,
        phase: 'standby',
        timestamp: new Date().getTime()
      });
      return;
    }

    this._factory(this._state)
      .then((resolved: T) => {
        // Bail if poll was disposed or superseded while promise was in flight.
        if (this.isDisposed || poll !== this._tick) {
          return;
        }

        this._resolve(poll, {
          interval: Private.jitter(this.interval, variance, min, max),
          payload: resolved,
          phase: this._state.phase === 'rejected' ? 'reconnected' : 'resolved',
          timestamp: new Date().getTime()
        });
      })
      .catch((rejected: U) => {
        // Bail if poll was disposed or superseded while promise was in flight.
        if (this.isDisposed || poll !== this._tick) {
          return;
        }

        const increased = Math.min(this._state.interval * 2, max);
        this._resolve(poll, {
          interval: Private.jitter(increased, variance, min, max),
          payload: rejected,
          phase: 'rejected',
          timestamp: new Date().getTime()
        });
      });
  }

  /**
   * Resolve an outstanding poll and schedule the next poll tick.
   */
  private _resolve(
    outstanding: PromiseDelegate<this>,
    tick: Poll.Tick<T, U>
  ): PromiseDelegate<this> {
    const { interval } = tick;
    const poll = new PromiseDelegate<this>();
    const request = () => {
      if (this.isDisposed) {
        return;
      }
      this._request(poll);
    };

    // Clear the schedule if possible.
    clearTimeout(this._timeout);

    // Update poll state and schedule the next tick.
    this._state = tick;
    this._tick = poll;
    this._timeout = interval
      ? interval === Infinity
        ? -1 // Never execute request.
        : setTimeout(request, interval) // Execute request later.
      : requestAnimationFrame(request); // Execute request immediately.

    // Resolve the outstanding poll promise and emit the ticked signal.
    outstanding.promise.then(() => {
      this._ticked.emit(tick);
    });
    outstanding.resolve(this);

    return poll;
  }

  private _disposed = new Signal<this, void>(this);
  private _factory: (tick: Poll.Tick<T, U>) => Promise<T>;
  private _state: Poll.Tick<T, U>;
  private _tick: PromiseDelegate<this> | null = new PromiseDelegate<this>();
  private _ticked = new Signal<this, Poll.Tick<T, U>>(this);
  private _timeout = -1;
}

/**
 * A namespace for `Poll` class statics, types, and interfaces.
 */
export namespace Poll {
  /**
   * The phase of the poll when the current tick was scheduled.
   */
  export type Phase =
    | 'instantiated'
    | 'instantiated-rejected'
    | 'instantiated-resolved'
    | 'reconnected'
    | 'refreshed'
    | 'rejected'
    | 'resolved'
    | 'standby'
    | 'started'
    | 'stopped';

  /**
   * Definition of poll state at any given tick.
   */
  export type Tick<T, U> = {
    /**
     * The number of milliseconds until the next poll request.
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
    readonly phase: Phase;

    /**
     * The timestamp of the poll tick.
     */
    readonly timestamp: number;
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
     * A factory function that is passed a poll tick and returns a poll promise.
     *
     * #### Notes
     * The generic arguments are as follows:
     *  - `T` indicates the resolved type of the factory's promises.
     *  - `U` indicates the rejected type of the factory's promises.
     */
    factory: (tick: Tick<T, U>) => Promise<T>;

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
