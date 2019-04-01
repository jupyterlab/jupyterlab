// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { PromiseDelegate } from '@phosphor/coreutils';

import { IDisposable } from '@phosphor/disposable';

import { ISignal, Signal } from '@phosphor/signaling';

/**
 * A poll that calls an asynchronous function with each tick.
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
   * Indicates when the poll switches to standby.
   */
  readonly standby: IPoll.Standby;

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
   * Indicates when the poll switches to standby.
   */
  export type Standby = 'never' | 'when-hidden';

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
    this.override(options.frequency);
    this.name = options.name || 'unknown';
    this.standby = options.standby || 'when-hidden';
    this._factory = options.factory;
    this._state = {
      interval: this.frequency.interval,
      payload: null,
      phase: 'instantiated',
      timestamp: new Date().getTime()
    };

    // Schedule a poll tick after the `when` promise is resolved.
    (options.when || Promise.resolve())
      .then(() => {
        if (this.isDisposed) {
          return;
        }

        this._schedule(this._tick, {
          interval: this.frequency.interval,
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
          interval: this.frequency.interval,
          payload: null,
          phase: 'instantiated-rejected',
          timestamp: new Date().getTime()
        });
        console.warn(`Poll (${this.name}) starting despite rejection.`, reason);
      });
  }

  /**
   * The name of the poll.
   */
  readonly name: string;

  /**
   * Indicates when the poll switches to standby.
   */
  readonly standby: IPoll.Standby;

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

  /**
   * Whether the poll is disposed.
   */
  get isDisposed(): boolean {
    return this.state.phase === 'disposed';
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

    this._state = {
      interval: Infinity, // Never.
      payload: null,
      phase: 'disposed',
      timestamp: new Date().getTime()
    };
    this.tick.catch(_ => undefined);
    this._tick.reject(new Error(`Poll (${this.name}) is disposed.`));
    this._disposed.emit();
    Signal.clearData(this);
  }

  /**
   * Overrides default polling frequency parameters.
   *
   * @param frequency - Overrides applied to default frequency values.
   */
  override(frequency: Partial<IPoll.Frequency> = {}): void {
    if (this.isDisposed) {
      return;
    }

    let { interval, jitter, max, min } = frequency;

    interval =
      typeof interval === 'number' ? Math.round(Math.abs(interval)) : 1000;
    jitter =
      typeof jitter === 'boolean' || typeof jitter === 'number' ? jitter : 0;
    max = typeof max === 'number' ? Math.round(Math.abs(max)) : 10 * interval;
    min = typeof min === 'number' ? Math.round(Math.abs(min)) : 100;

    if (interval > max) {
      throw new Error('Poll interval cannot exceed max interval length');
    }

    if (min > max || min > interval) {
      throw new Error('Poll min cannot exceed poll interval or poll max');
    }

    this._frequency = { interval, jitter, max, min };
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
   * It is safe to call multiple times. It will always succeed.
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
   * It is safe to call multiple times. It will always succeed.
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
   * It is safe to call multiple times. It will always succeed.
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
      const { interval, jitter, max, min } = this.frequency;
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

        const { interval, jitter, max, min } = this.frequency;
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

        const { jitter, max, min } = this.frequency;
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
   * Schedule the next poll tick and resolve the oustanding promise.
   */
  private _schedule(
    outstanding: PromiseDelegate<this>,
    tick: IPoll.Tick<T, U>
  ): void {
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

  private _disposed = new Signal<this, void>(this);
  private _factory: (tick: IPoll.Tick<T, U>) => Promise<T>;
  private _frequency: IPoll.Frequency;
  private _state: IPoll.Tick<T, U>;
  private _tick: PromiseDelegate<this> = new PromiseDelegate<this>();
  private _ticked = new Signal<this, IPoll.Tick<T, U>>(this);
  private _timeout = -1;
}

/**
 * A namespace for `Poll` statics, types, and interfaces.
 */
export namespace Poll {
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
    factory: (tick: IPoll.Tick<T, U>) => Promise<T>;

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
     * _min_ defaults to `250`.
     */
    frequency?: Partial<IPoll.Frequency>;

    /**
     * The name of the poll.
     * Defaults to `'unknown'`.
     */
    name?: string;

    /**
     * Indicates when the poll switches to standby.
     * Defaults to `'when-hidden'`.
     */
    standby?: IPoll.Standby;

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
   * The jitter quantity if `jitter` is set to `true`.
   */
  export const DEFAULT_JITTER = 0.25;

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
