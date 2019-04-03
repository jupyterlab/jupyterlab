// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { JSONExt, PromiseDelegate } from '@phosphor/coreutils';

import { IDisposable } from '@phosphor/disposable';

import { ISignal, Signal } from '@phosphor/signaling';

/**
 * A readonly poll that calls an asynchronous function with each tick.
 *
 * @typeparam T - The resolved type of the factory's promises.
 * Defaults to `any`.
 *
 * @typeparam U - The rejected type of the factory's promises.
 * Defaults to `any`.
 */
export interface IPoll<T = any, U = any> {
  /**
   * A signal emitted when the poll is disposed.
   */
  readonly disposed: ISignal<this, void>;

  /**
   * The polling frequency.
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
   * The poll state, which is the content of the current poll tick.
   */
  readonly state: IPoll.Tick<T, U>;

  /**
   * A promise that resolves when the poll next ticks.
   */
  readonly tick: Promise<IPoll<T, U>>;

  /**
   * A signal emitted when the poll ticks and fires off a new request.
   */
  readonly ticked: ISignal<IPoll<T, U>, IPoll.Tick<T, U>>;
}

/**
 * A namespace for `IPoll` types.
 */
export namespace IPoll {
  /**
   * The polling frequency parameters.
   */
  export type Frequency = {
    /**
     * The polling interval in milliseconds (integer).
     */
    readonly interval: number;

    /**
     * Whether poll frequency jitters if boolean or jitter (float) quantity.
     */
    readonly jitter: boolean | number;

    /**
     * The maximum milliseconds (integer) between poll requests.
     */
    readonly max: number;

    /**
     * The minimum milliseconds (integer) between poll requests.
     */
    readonly min: number;
  };

  /**
   * The phase of the poll when the current tick was scheduled.
   */
  export type Phase =
    | 'disposed'
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
   *
   * @typeparam T - The resolved type of the factory's promises.
   * Defaults to `any`.
   *
   * @typeparam U - The rejected type of the factory's promises.
   * Defaults to `any`.
   */
  export type Tick<T = any, U = any> = {
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
}

/**
 * A class that wraps an asynchronous function to poll at a regular interval
 * with exponential increases to the interval length if the poll fails.
 *
 * @typeparam T - The resolved type of the factory's promises.
 * Defaults to `any`.
 *
 * @typeparam U - The rejected type of the factory's promises.
 * Defaults to `any`.
 */
export class Poll<T = any, U = any> implements IDisposable, IPoll<T, U> {
  /**
   * Instantiate a new poll with exponential back-off in case of failure.
   *
   * @param options - The poll instantiation options.
   */
  constructor(options: Poll.IOptions<T, U>) {
    const base = Private.DEFAULT_FREQUENCY;
    const override: Partial<IPoll.Frequency> = options.frequency || {};
    const interval = 'interval' in override ? override.interval : base.interval;
    const jitter = 'jitter' in override ? override.jitter : base.jitter;
    const max =
      'max' in override
        ? override.max
        : 'interval' in override
          ? 10 * interval
          : base.max;
    const min = 'min' in override ? override.min : base.min;

    this.frequency = { interval, jitter, max, min };
    this.name = options.name || Private.DEFAULT_NAME;

    this._factory = options.factory;
    this._standby = options.standby || Private.DEFAULT_STANDBY;
    this._state = {
      ...this.state,
      timestamp: new Date().getTime()
    };

    // Schedule a poll tick after the `when` promise is resolved.
    (options.when || Promise.resolve())
      .then(() => {
        if (this.isDisposed) {
          return;
        }

        this.schedule({
          interval: 0, // Immediately.
          payload: null,
          phase: 'instantiated-resolved',
          timestamp: new Date().getTime()
        });
      })
      .catch(reason => {
        if (this.isDisposed) {
          return;
        }

        this.schedule({
          interval: 0, // Immediately.
          payload: null,
          phase: 'instantiated-rejected',
          timestamp: new Date().getTime()
        });

        console.warn(`Poll (${this.name}) started despite rejection.`, reason);
      });
  }

  /**
   * The name of the poll.
   */
  readonly name: string;

  /**
   * A signal emitted when the poll is disposed.
   */
  get disposed(): ISignal<this, void> {
    return this._disposed;
  }

  /**
   * The polling frequency parameters.
   */
  get frequency(): IPoll.Frequency {
    return this._frequency;
  }
  set frequency(frequency: IPoll.Frequency) {
    if (this.isDisposed || JSONExt.deepEqual(frequency, this.frequency || {})) {
      return;
    }

    let { interval, jitter, max, min } = frequency;

    interval = Math.round(Math.abs(interval));
    max = Math.round(Math.abs(max));
    min = Math.round(Math.abs(min));

    if (interval > max) {
      throw new Error('Poll interval cannot exceed max interval length');
    }

    if (min > max || min > interval) {
      throw new Error('Poll min cannot exceed poll interval or poll max');
    }

    this._frequency = { interval, jitter, max, min };
  }

  /**
   * Whether the poll is disposed.
   */
  get isDisposed(): boolean {
    return this.state.phase === 'disposed';
  }

  /**
   * Indicates when the poll switches to standby.
   */
  get standby(): Poll.Standby | (() => boolean | Poll.Standby) {
    return this._standby;
  }
  set standby(standby: Poll.Standby | (() => boolean | Poll.Standby)) {
    if (this.isDisposed || this.standby === standby) {
      return;
    }
    this._standby = standby;
  }

  /**
   * The poll state, which is the content of the current poll tick.
   */
  get state(): IPoll.Tick<T, U> {
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
  get ticked(): ISignal<this, IPoll.Tick<T, U>> {
    return this._ticked;
  }

  /**
   * Dispose the poll.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }

    this._state = { ...Private.DISPOSED_TICK, timestamp: new Date().getTime() };
    this.tick.catch(_ => undefined);
    this._tick.reject(new Error(`Poll (${this.name}) is disposed.`));
    this._disposed.emit();
    Signal.clearData(this);
  }

  /**
   * Refreshes the poll; schedules a `refreshed` tick when necessary.
   *
   * #### Notes
   * It is safe to call multiple times. The returned promise never rejects.
   */
  async refresh(): Promise<this> {
    const { phase } = this.state;

    if (phase === 'disposed') {
      return this;
    }

    if (phase === 'instantiated') {
      return this.tick.then(_ => this.refresh()).catch(_ => this);
    }

    if (phase !== 'refreshed') {
      this.schedule({
        interval: 0, // Immediately.
        payload: null,
        phase: 'refreshed',
        timestamp: new Date().getTime()
      });
    }

    return this;
  }

  /**
   * Starts the poll; schedules a `started` tick when necessary.
   *
   * #### Notes
   * It is safe to call multiple times. The returned promise never rejects.
   */
  async start(): Promise<this> {
    const { phase } = this.state;

    if (phase === 'disposed') {
      return this;
    }

    if (phase === 'instantiated') {
      return this.tick.then(_ => this.start()).catch(_ => this);
    }

    if (phase === 'standby' || phase === 'stopped') {
      this.schedule({
        interval: 0, // Immediately.
        payload: null,
        phase: 'started',
        timestamp: new Date().getTime()
      });
    }

    return this;
  }

  /**
   * Stops the poll; schedules a `stopped` tick when necessary.
   *
   * #### Notes
   * It is safe to call multiple times. The returned promise never rejects.
   */
  async stop(): Promise<this> {
    const { phase } = this.state;

    if (phase === 'disposed') {
      return this;
    }

    if (phase === 'instantiated') {
      return this.tick.then(_ => this.stop()).catch(_ => this);
    }

    if (phase !== 'stopped') {
      this.schedule({
        interval: Infinity, // Never.
        payload: null,
        phase: 'stopped',
        timestamp: new Date().getTime()
      });
    }

    return this;
  }

  /**
   * Schedule the next poll tick and resolve the outstanding promise.
   *
   * @param tick - The new tick data to populate the poll state.
   *
   * @param outstanding - The outstanding poll promise to resolve.
   * Defaults to currently outstanding promise.
   *
   * #### Notes
   * This method is protected to allow sub-classes to implement methods that can
   * schedule poll ticks.
   *
   * This method synchronously modifies poll state so it should be invoked with
   * consideration given to the poll state that will be overwritten. It will
   * typically be invoked in a method that returns a promise, allowing the
   * caller to e.g. `await this.tick` if `this.state.phase === 'instantiated'`
   * before scheduling a new tick.
   */
  protected schedule(tick: IPoll.Tick<T, U>): void {
    const outstanding = this._tick;
    const next = new PromiseDelegate<this>();
    const execution = () => {
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
        ? requestAnimationFrame(execution) // Execute immediately.
        : tick.interval === Infinity
          ? -1 // Never execute.
          : setTimeout(execution, tick.interval); // Execute later.

    // Resolve the outstanding poll promise and emit the ticked signal.
    void outstanding.promise.then(() => {
      this._ticked.emit(tick);
    });
    outstanding.resolve(this);
  }

  /**
   * Execute an outstanding poll tick promise.
   *
   * @param outstanding - The outstanding promise to resolve after execution.
   */
  private _execute(outstanding: PromiseDelegate<this>): void {
    // If in standby mode schedule next tick without calling the factory.
    let standby =
      typeof this.standby === 'function' ? this.standby() : this.standby;
    standby =
      standby === 'never'
        ? false
        : standby === 'when-hidden'
          ? !!(typeof document !== 'undefined' && document && document.hidden)
          : true;
    if (standby) {
      const { interval, jitter, max, min } = this.frequency;
      this.schedule({
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

        const { interval, jitter, max, min } = this.frequency;
        this.schedule({
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

        const { jitter, max, min } = this.frequency;
        const increased = Math.min(this.state.interval * 2, max);
        this.schedule({
          interval: Private.jitter(increased, jitter, max, min),
          payload: rejected,
          phase: 'rejected',
          timestamp: new Date().getTime()
        });
      });
  }

  private _disposed = new Signal<this, void>(this);
  private _factory: Poll.Factory<T, U>;
  private _frequency: IPoll.Frequency;
  private _standby: Poll.Standby | (() => boolean | Poll.Standby);
  private _state: IPoll.Tick<T, U> = Private.DEFAULT_TICK;
  private _tick = new PromiseDelegate<this>();
  private _ticked = new Signal<this, IPoll.Tick<T, U>>(this);
  private _timeout = -1;
}

/**
 * A namespace for `Poll` types and interfaces.
 */
export namespace Poll {
  /**
   * A promise factory that returns an individual poll request.
   *
   * @typeparam T - The resolved type of the factory's promises.
   *
   * @typeparam U - The rejected type of the factory's promises.
   */
  export type Factory<T, U> = (tick: IPoll.Tick<T, U>) => Promise<T>;

  /**
   * Indicates when the poll switches to standby.
   */
  export type Standby = 'never' | 'when-hidden';

  /**
   * Instantiation options for polls.
   *
   * @typeparam T - The resolved type of the factory's promises.
   * Defaults to `any`.
   *
   * @typeparam U - The rejected type of the factory's promises.
   * Defaults to `any`.
   */
  export interface IOptions<T = any, U = any> {
    /**
     * A factory function that is passed a poll tick and returns a poll promise.
     */
    factory: Factory<T, U>;

    /**
     * The polling frequency parameters.
     *
     * #### Notes
     * _interval_ defaults to `1000`.
     * If set to `0`, the poll will schedule an animation frame after each
     * promise resolution.
     *
     * _jitter_ defaults to `0`.
     * If set to `true` jitter quantity is `0.25`.
     * If set to `false` jitter quantity to `0`.
     *
     * _max_ defaults to `10 * interval`.
     *
     * _min_ defaults to `100`.
     */
    frequency?: Partial<IPoll.Frequency>;

    /**
     * The name of the poll.
     * Defaults to `'unknown'`.
     */
    name?: string;

    /**
     * Indicates when the poll switches to standby or a function that returns
     * a boolean or a `Poll.Standby` value to indicate whether to stand by.
     * Defaults to `'when-hidden'`.
     *
     * #### Notes
     * If a function is passed in, for any given context, it should be
     * idempotent and safe to call multiple times. It will be called before each
     * tick execution, but may be called by clients as well.
     */
    standby?: Standby | (() => boolean | Standby);

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
   * The default polling frequency.
   */
  export const DEFAULT_FREQUENCY: IPoll.Frequency = {
    interval: 1000,
    jitter: 0,
    max: 10 * 1000,
    min: 100
  };

  /**
   * The default poll name.
   */
  export const DEFAULT_NAME = 'unknown';

  /**
   * The default poll standby behavior.
   */
  export const DEFAULT_STANDBY: Poll.Standby = 'when-hidden';

  /**
   * The first tick's default values superseded in constructor.
   */
  export const DEFAULT_TICK: IPoll.Tick = {
    interval: Infinity, // Never.
    payload: null,
    phase: 'instantiated',
    timestamp: new Date(0).getTime()
  };

  /**
   * The disposed tick values.
   */
  export const DISPOSED_TICK: IPoll.Tick = {
    interval: Infinity, // Never.
    payload: null,
    phase: 'disposed',
    timestamp: new Date(0).getTime()
  };

  /**
   * The jitter quantity if `jitter` is set to `true`.
   */
  const DEFAULT_JITTER = 0.25;

  /**
   * Returns a randomly jittered (integer) value.
   *
   * @param base - The base (integer) value that is being wobbled.
   *
   * @param quantity - The jitter (float) quantity or boolean flag.
   *
   * @param max - The largest acceptable (integer) value to return.
   *
   * @param min - The smallest acceptable (integer) value to return.
   */
  export function jitter(
    base: number,
    quantity: boolean | number,
    max: number,
    min: number
  ): number {
    if (!quantity) {
      return Math.round(base);
    }

    base = Math.round(base);
    quantity =
      typeof quantity === 'boolean'
        ? (quantity || 0) && DEFAULT_JITTER
        : typeof quantity === 'number'
          ? quantity
          : 0;
    quantity = Math.abs(quantity);

    const direction = Math.random() < 0.5 ? 1 : -1;
    const jitter = Math.round(Math.random() * base * quantity * direction);

    return Math.min(Math.max(base + jitter, min), max);
  }
}
