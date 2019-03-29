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
    const { factory, interval, jitter, max, min, readonly, when } = options;

    this.name = options.name || 'unknown';
    this.readonly = typeof readonly === 'boolean' ? readonly : false;
    this.standby = options.standby || 'when-hidden';

    // Validate and set the initial polling frequency parameters.
    this._frequency(interval, jitter, max, min);

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
        if (this.isDisposed) {
          return;
        }

        this._schedule(this._tick, {
          interval: this.interval,
          payload: null,
          phase: 'instantiated-resolved',
          timestamp: new Date().getTime()
        });
      })
      .catch(reason => {
        if (this.isDisposed) {
          return;
        }

        this._schedule(this._tick, {
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
    this._frequency(interval, this.jitter, this.max, this.min);
  }

  /**
   * Whether the poll is disposed.
   */
  get isDisposed(): boolean {
    return this._tick === null;
  }

  /**
   * Whether poll frequency jitters if boolean and jitter factor if number.
   * Defaults to `0`.
   *
   * #### Notes
   * If set to `true` the poll jitter factor will be `Poll.DEFAULT_JITTER`.
   */
  get jitter(): boolean | number {
    return this._jitter;
  }
  set jitter(jitter: boolean | number) {
    if (this.readonly) {
      return;
    }
    this._frequency(this.interval, jitter, this.max, this.min);
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
    this._frequency(this.interval, this.jitter, max, this.min);
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
    this._frequency(this.interval, this.jitter, this.max, min);
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
   * This method schedules new ticks only when necessary.
   *
   * It is safe to call multiple times.
   *
   * If `readonly` is true, this method will not schedule a new tick.
   */
  async refresh(): Promise<this> {
    if (this.readonly) {
      return this;
    }
    if (this.state.phase === 'instantiated') {
      await this.tick;
    }
    if (this.state.phase !== 'refreshed') {
      this._schedule(this._tick, {
        interval: 0, // Immediately.
        payload: null,
        phase: 'refreshed',
        timestamp: new Date().getTime()
      });
    }
    return this;
  }

  /**
   * Starts polling.
   *
   * #### Notes
   * If the poll has been instantiated but its `when` promise has not yet
   * resolved, this call will be scheduled after the `when` promise resolves.
   *
   * This method schedules new ticks only when necessary.
   *
   * It is safe to call multiple times.
   *
   * If `readonly` is true, this method will not schedule a new tick.
   */
  async start(): Promise<this> {
    if (this.readonly) {
      return this;
    }
    if (this.state.phase === 'instantiated') {
      await this.tick;
    }
    if (this.state.phase === 'standby' || this.state.phase === 'stopped') {
      this._schedule(this._tick, {
        interval: 0, // Immediately.
        payload: null,
        phase: 'started',
        timestamp: new Date().getTime()
      });
    }
    return this;
  }

  /**
   * Stops polling.
   *
   * #### Notes
   * If the poll has been instantiated but its `when` promise has not yet
   * resolved, this will schedule a tick after the `when` promise resolves.
   *
   * This method schedules new ticks only when necessary.
   *
   * It is safe to call multiple times.
   *
   * If `readonly` is true, this method will not schedule a new tick.
   */
  async stop(): Promise<this> {
    if (this.readonly) {
      return this;
    }
    if (this.state.phase === 'instantiated') {
      await this.tick;
    }
    if (this.state.phase !== 'stopped') {
      this._schedule(this._tick, {
        interval: Infinity, // Never.
        payload: null,
        phase: 'stopped',
        timestamp: new Date().getTime()
      });
    }
    return this;
  }

  /**
   * Execute a poll request.
   */
  private _execute(outstanding: PromiseDelegate<this>): void {
    const standby =
      this.standby === 'when-hidden'
        ? !!(typeof document !== 'undefined' && document && document.hidden)
        : false;

    // If in standby mode schedule next tick without calling the factory.
    if (standby) {
      const { interval, jitter, max, min } = this;
      this._schedule(outstanding, {
        interval: Private.jitter(interval, jitter, max, min),
        payload: null,
        phase: 'standby',
        timestamp: new Date().getTime()
      });

      return;
    }

    // Execute a new promise generated by the factory.
    this._factory(this.state)
      .then((resolved: T) => {
        if (this.isDisposed || this.tick !== outstanding.promise) {
          return;
        }

        const { interval, jitter, max, min } = this;
        this._schedule(outstanding, {
          interval: Private.jitter(interval, jitter, max, min),
          payload: resolved,
          phase: this.state.phase === 'rejected' ? 'reconnected' : 'resolved',
          timestamp: new Date().getTime()
        });
      })
      .catch((rejected: U) => {
        if (this.isDisposed || this.tick !== outstanding.promise) {
          return;
        }

        const { jitter, max, min } = this;
        const increased = Math.min(this.state.interval * 2, max);
        this._schedule(outstanding, {
          interval: Private.jitter(increased, jitter, max, min),
          payload: rejected,
          phase: 'rejected',
          timestamp: new Date().getTime()
        });
      });
  }

  /**
   * Validates and sets the polling frequency parameters.
   */
  private _frequency(
    interval: number,
    jitter: boolean | number,
    max: number,
    min: number
  ): void {
    interval =
      typeof interval === 'number' ? Math.round(Math.abs(interval)) : 1000;
    jitter =
      typeof jitter === 'boolean' || typeof jitter === 'number' ? jitter : 0;
    max = typeof max === 'number' ? Math.abs(max) : 10 * interval;
    min = typeof min === 'number' ? Math.abs(min) : 100;

    if (interval > max) {
      throw new Error('Poll interval cannot exceed max interval length');
    }
    if (min > max || min > interval) {
      throw new Error('Poll min cannot exceed poll interval or poll max');
    }

    this._interval = interval;
    this._jitter = jitter;
    this._max = max;
    this._min = min;
  }

  /**
   * Schedule the next poll tick and resolve the oustanding promise.
   */
  private _schedule(
    outstanding: PromiseDelegate<this>,
    tick: Poll.Tick<T, U>
  ): void {
    const next = new PromiseDelegate<this>();
    const request = () => {
      if (this.isDisposed) {
        return;
      }
      this._execute(next);
    };

    // Clear the schedule if possible.
    if (this.state.interval === 0) {
      cancelAnimationFrame(this._timeout);
    } else {
      clearTimeout(this._timeout);
    }

    // Update poll state and schedule the next tick.
    this._state = tick;
    this._tick = next;
    this._timeout =
      tick.interval === 0
        ? requestAnimationFrame(request) // Execute request immediately.
        : tick.interval === Infinity
          ? -1 // Never execute request.
          : setTimeout(request, tick.interval); // Execute request later.

    // Resolve the outstanding poll promise and emit the ticked signal.
    void outstanding.promise.then(() => {
      this._ticked.emit(tick);
    });
    outstanding.resolve(this);
  }

  private _disposed = new Signal<this, void>(this);
  private _factory: (tick: Poll.Tick<T, U>) => Promise<T>;
  private _interval: number;
  private _jitter: boolean | number;
  private _max: number;
  private _min: number;
  private _state: Poll.Tick<T, U>;
  private _tick: PromiseDelegate<this> = new PromiseDelegate<this>();
  private _ticked = new Signal<this, Poll.Tick<T, U>>(this);
  private _timeout = -1;
}

/**
 * A namespace for `Poll` statics, types, and interfaces.
 */
export namespace Poll {
  /**
   * The jitter factor if `jitter` is set to `true`: `0.25`.
   */
  export const DEFAULT_JITTER = 0.25;

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
     * If set to `true` the poll jitter factor will be `Poll.DEFAULT_JITTER`.
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
   * @param factor - The jitter factor quantity or boolean flag.
   *
   * @param max - The largest acceptable value to return.
   *
   * @param min - The smallest acceptable value to return.
   */
  export function jitter(
    base: number,
    factor: boolean | number,
    max: number,
    min: number
  ): number {
    if (!factor) {
      return Math.round(base);
    }

    factor =
      typeof factor === 'boolean'
        ? (factor && Poll.DEFAULT_JITTER) || 0
        : typeof factor === 'number'
          ? factor
          : 0;

    const direction = Math.random() < 0.5 ? 1 : -1;
    const jitter = Math.random() * base * Math.abs(factor) * direction;
    const candidate = Math.abs(Math.round(base + jitter));

    return Math.min(Math.max(min, candidate), max);
  }
}
