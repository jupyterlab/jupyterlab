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
    const { factory, interval, max, min, readonly, when } = options;
    const jitter =
      typeof options.jitter === 'boolean'
        ? (options.jitter && 0.25) || 0
        : typeof options.jitter === 'number'
          ? options.jitter
          : 0;

    this.name = options.name || 'unknown';
    this.readonly = typeof readonly === 'boolean' ? readonly : false;
    this.standby = options.standby || 'when-hidden';

    // Initialize and validate poll frequency parameters.
    this._setup(interval, jitter, max, min);

    this._factory = factory;
    this._state = {
      interval: this._interval,
      payload: null,
      phase: 'instantiated',
      timestamp: new Date().getTime()
    };

    // Schedule a poll tick after the `when` promise is resolved.
    (when || Promise.resolve())
      .then(() => {
        if (this.isDisposed) {
          return;
        }

        // Resolve the poll and schedule the next tick.
        this._resolve(this._tick, {
          interval: this._interval,
          payload: null,
          phase: 'instantiated-resolved',
          timestamp: new Date().getTime()
        });
      })
      .catch(reason => {
        if (this.isDisposed) {
          return;
        }

        // Resolve the poll and schedule the next tick.
        this._resolve(this._tick, {
          interval: this._interval,
          payload: null,
          phase: 'instantiated-rejected',
          timestamp: new Date().getTime()
        });

        // Warn that `when` promise was rejected but starting anyway.
        console.warn(`Poll (${this.name}) starting despite rejection.`, reason);
      });
  }

  /**
   * The name of the poll. Defaults to `'unknown'`.
   */
  readonly name: string;

  /**
   * Whether the poll is readonly or can be modified. Defaults to `false`.
   */
  readonly readonly: boolean;

  /**
   * Indicates when the poll switches to standby. Defaults to `'when-hidden'`.
   */
  readonly standby: 'when-hidden' | 'never';

  /**
   * A signal emitted when the poll is disposed.
   */
  get disposed(): ISignal<this, void> {
    return this._disposed;
  }

  /**
   * The polling interval.
   */
  get interval(): number {
    return this._interval;
  }
  set interval(interval: number) {
    if (this.readonly) {
      return;
    }
    this._setup(interval, this._jitter, this._max, this._min);
  }

  /**
   * Whether the poll is disposed.
   */
  get isDisposed(): boolean {
    return this._tick === null;
  }
  /**
   * The range within which the poll interval jitters.
   */
  get jitter(): number {
    return this._jitter;
  }
  set jitter(jitter: number) {
    if (this.readonly) {
      return;
    }
    this._setup(this._interval, jitter, this._max, this._min);
  }

  /**
   * The maximum interval between poll requests.
   */
  get max(): number {
    return this._max;
  }
  set max(max: number) {
    if (this.readonly) {
      return;
    }
    this._setup(this._interval, this._jitter, max, this._min);
  }

  /**
   * The minimum interval between poll requests.
   */
  get min(): number {
    return this._min;
  }
  set min(min: number) {
    if (this.readonly) {
      return;
    }
    this._setup(this._interval, this._jitter, this._max, min);
  }

  /**
   * The poll state, which is the content of the current poll tick.
   */
  get state(): Poll.Tick<T, U> {
    return this._state;
  }

  /**
   * A promise that resolves when the poll next ticks.
   */
  get tick(): Promise<this> {
    return this._tick.promise;
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
      await this.tick;
    }

    if (this._state.phase === 'refreshed') {
      return this.tick;
    }

    this._resolve(this._tick, {
      interval: 0, // Immediately.
      payload: null,
      phase: 'refreshed',
      timestamp: new Date().getTime()
    });

    return this.tick;
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
      await this.tick;
    }

    if (this._state.phase !== 'standby' && this._state.phase !== 'stopped') {
      return this.tick;
    }

    this._resolve(this._tick, {
      interval: 0, // Immediately.
      payload: null,
      phase: 'started',
      timestamp: new Date().getTime()
    });

    return this.tick;
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
      await this.tick;
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
  private _execute(outstanding: PromiseDelegate<this>): void {
    // If poll is in standby mode, schedule tick without firing a request.
    if (this._standby()) {
      const { interval, jitter, max, min } = this;
      this._resolve(outstanding, {
        interval: Private.jitter(interval, jitter, min, max),
        payload: null,
        phase: 'standby',
        timestamp: new Date().getTime()
      });
      return;
    }

    // Execute a new promise generated by the factory.
    this._factory(this._state)
      .then((resolved: T) => {
        if (this.isDisposed || this._tick !== outstanding) {
          return;
        }

        const { interval, jitter, max, min } = this;
        this._resolve(outstanding, {
          interval: Private.jitter(interval, jitter, min, max),
          payload: resolved,
          phase: this._state.phase === 'rejected' ? 'reconnected' : 'resolved',
          timestamp: new Date().getTime()
        });
      })
      .catch((rejected: U) => {
        if (this.isDisposed || this._tick !== outstanding) {
          return;
        }

        const { jitter, max, min } = this;
        const increased = Math.min(this._state.interval * 2, max);
        this._resolve(outstanding, {
          interval: Private.jitter(increased, jitter, min, max),
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
  ): void {
    const { interval } = tick;
    const next = new PromiseDelegate<this>();
    const request = () => {
      if (this.isDisposed) {
        return;
      }
      this._execute(next);
    };

    // Clear the schedule if possible.
    if (this._state.interval) {
      clearTimeout(this._timeout);
    } else {
      cancelAnimationFrame(this._timeout);
    }

    // Update poll state and schedule the next tick.
    this._state = tick;
    this._tick = next;
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
  }

  /**
   * Validates and sets the polling frequency configuration.
   */
  private _setup(
    interval: number,
    jitter: number,
    max: number,
    min: number
  ): void {
    if (interval > max) {
      throw new Error('Poll interval cannot exceed max interval length');
    }
    if (min > max || min > interval) {
      throw new Error('Poll min cannot exceed poll interval or poll max');
    }

    this._interval =
      typeof interval === 'number' ? Math.round(Math.abs(interval)) : 1000;
    this._jitter = typeof jitter === 'number' ? jitter : 0;
    this._max = typeof max === 'number' ? Math.abs(max) : 10 * this._interval;
    this._min = typeof min === 'number' ? Math.abs(min) : 100;
  }

  /**
   * Returns whether the poll is in standby mode.
   */
  private _standby(): boolean {
    return this.standby === 'never'
      ? false
      : !!(typeof document !== 'undefined' && document && document.hidden);
  }

  private _disposed = new Signal<this, void>(this);
  private _factory: (tick: Poll.Tick<T, U>) => Promise<T>;
  private _interval: number;
  private _jitter: number;
  private _max: number;
  private _min: number;
  private _state: Poll.Tick<T, U>;
  private _tick: PromiseDelegate<this> | null = new PromiseDelegate<this>();
  private _ticked = new Signal<this, Poll.Tick<T, U>>(this);
  private _timeout = -1;
}

/**
 * A namespace for `Poll` types and interfaces.
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
   * Indicates when the poll switches to standby.
   */
  export type Standby = 'never' | 'when-hidden';

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
     * A factory function that is passed a poll tick and returns a poll promise.
     *
     * #### Notes
     * The generic arguments are as follows:
     *  - `T` indicates the resolved type of the factory's promises.
     *  - `U` indicates the rejected type of the factory's promises.
     */
    factory: (tick: Tick<T, U>) => Promise<T>;

    /**
     * The millisecond interval between poll requests. Defaults to `1000`.
     *
     * #### Notes
     * If set to `0`, the poll will schedule an animation frame after each
     * promise resolution.
     */
    interval?: number;

    /**
     * Whether poll frequency jitters if boolean and jitter factor if number.
     * Defaults to `0`.
     *
     * #### Notes
     * If set to `true` the poll jitter factor will default to `0.25`.
     */
    jitter?: boolean | number;

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
     * Whether the poll is readonly or can be modified. Defaults to `false`.
     */
    readonly?: boolean;

    /**
     * Indicates when the poll switches to standby. Defaults to `'when-hidden'`.
     */
    standby?: Poll.Standby;

    /**
     * If set, a promise which must resolve (or reject) before polling begins.
     */
    when?: Promise<any>;
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
