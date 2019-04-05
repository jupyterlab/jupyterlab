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
   *
   * ### Notes
   * We implement the "decorrelated jitter" strategy from
   * https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/.
   * Essentially, if consecutive retries are needed, we choose an integer:
   * `sleep=Math.min(max, rand_between(interval, backoff*sleep))`. This ensures
   * that the poll is never less than `interval`, and nicely spreads out retries
   * for consecutive tries. Over time, if interval<<max, the random number will
   * be above `max` about (1-1/backoff) of the time (sleeping the `max`), and
   * the rest of the time the sleep will be a random number below `max`,
   * decorrelating our trigger time from other pollers.
   */
  export type Frequency = {
    /**
     * The basic polling interval in milliseconds (integer).
     */
    readonly interval: number;

    /**
     * Whether poll frequency backs off (boolean) or the backoff growth rate (float > 1).
     *
     * #### Notes
     * If true, the default backoff growth rate is 3.
     */
    readonly backoff: boolean | number;

    /**
     * The maximum milliseconds (integer) between poll requests.
     */
    readonly max: number;
  };

  /**
   * The phase of the poll when the current tick was scheduled.
   */
  export type Phase =
    | 'constructed'
    | 'disposed'
    | 'reconnected'
    | 'refreshed'
    | 'rejected'
    | 'resolved'
    | 'standby'
    | 'started'
    | 'stopped'
    | 'when-rejected'
    | 'when-resolved';

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
    this._factory = options.factory;
    this._standby = options.standby || Private.DEFAULT_STANDBY;
    this._state = { ...Private.DEFAULT_TICK, timestamp: new Date().getTime() };

    this.frequency = {
      ...Private.DEFAULT_FREQUENCY,
      ...(options.frequency || {})
    };
    this.name = options.name || Private.DEFAULT_NAME;
    this.ready = (options.when || Promise.resolve())
      .then(() => {
        if (this.isDisposed) {
          return;
        }

        this.schedule({
          interval: Private.IMMEDIATE,
          payload: null,
          phase: 'when-resolved',
          timestamp: new Date().getTime()
        });
      })
      .catch(reason => {
        if (this.isDisposed) {
          return;
        }

        this.schedule({
          interval: Private.IMMEDIATE,
          payload: null,
          phase: 'when-rejected',
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

    let { interval, backoff, max } = frequency;

    interval = Math.round(interval);
    max = Math.round(max);

    // Delays are 32-bit integers in many browsers, so check for overflow.
    // https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/setTimeout#Maximum_delay_value
    if (max > 2147483647) {
      throw new Error('Max poll interval must be less than 2147483647');
    }
    if (interval < 0 || interval > max) {
      throw new Error('Poll interval must be between 0 and max');
    }
    if (backoff < 1) {
      throw new Error('backoff growth factor must be at least 1');
    }

    this._frequency = { interval, backoff, max };
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
    this._tick.promise.catch(_ => undefined);
    this._tick.reject(new Error(`Poll (${this.name}) is disposed.`));
    this._disposed.emit();
    Signal.clearData(this);
  }

  /**
   * Refreshes the poll. Schedules `refreshed` tick if necessary.
   *
   * @returns A promise that resolves after tick is scheduled and never rejects.
   */
  async refresh(): Promise<void> {
    if (this.isDisposed) {
      return;
    }

    if (this.state.phase === 'constructed') {
      await this.ready;
    }

    if (this.state.phase !== 'refreshed') {
      this.schedule({
        interval: Private.IMMEDIATE,
        payload: null,
        phase: 'refreshed',
        timestamp: new Date().getTime()
      });
    }
  }

  /**
   * Starts the poll. Schedules `started` tick if necessary.
   *
   * @returns A promise that resolves after tick is scheduled and never rejects.
   */
  async start(): Promise<void> {
    if (this.isDisposed) {
      return;
    }

    if (this.state.phase === 'constructed') {
      await this.ready;
    }

    if (this.state.phase === 'standby' || this.state.phase === 'stopped') {
      this.schedule({
        interval: Private.IMMEDIATE,
        payload: null,
        phase: 'started',
        timestamp: new Date().getTime()
      });
    }
  }

  /**
   * Stops the poll. Schedules `stopped` tick if necessary.
   *
   * @returns A promise that resolves after tick is scheduled and never rejects.
   */
  async stop(): Promise<void> {
    if (this.isDisposed) {
      return;
    }

    if (this.state.phase === 'constructed') {
      await this.ready;
    }

    if (this.state.phase !== 'stopped') {
      this.schedule({
        interval: Private.NEVER,
        payload: null,
        phase: 'stopped',
        timestamp: new Date().getTime()
      });
    }
  }

  /**
   * A promise that resolves after the poll has scheduled its first tick.
   *
   * #### Notes
   * This accessor is protected to allow sub-classes to implement methods that
   * can `await this.ready` if `this.state.phase === 'constructed'`.
   *
   * A poll should handle ready state without needing to expose it to clients.
   */
  protected readonly ready: Promise<void>;

  /**
   * Schedule the next poll tick.
   *
   * @param tick - The new tick data to populate the poll state.
   *
   * #### Notes
   * This method is protected to allow sub-classes to implement methods that can
   * schedule poll ticks.
   *
   * This method synchronously modifies poll state so it should be invoked with
   * consideration given to the poll state that will be overwritten. It will
   * typically be invoked in a method that returns a promise, allowing the
   * caller e.g. to `await this.ready` before scheduling a new tick.
   */
  protected schedule(tick: IPoll.Tick<T, U>): void {
    const current = new PromiseDelegate<this>();
    const pending = this._tick;
    const execute = () => {
      if (this.isDisposed || this.tick !== current.promise) {
        return;
      }

      this._execute();
    };

    // Clear the schedule if possible.
    if (this.state.interval === Private.IMMEDIATE) {
      cancelAnimationFrame(this._timeout);
    } else {
      clearTimeout(this._timeout);
    }

    // Update poll state and schedule the next tick.
    this._state = tick;
    this._tick = current;
    this._timeout =
      tick.interval === Private.IMMEDIATE
        ? requestAnimationFrame(execute)
        : tick.interval === Private.NEVER
          ? -1
          : setTimeout(execute, tick.interval);

    // Resolve the pending poll promise and emit the ticked signal.
    void pending.promise.then(() => {
      this._ticked.emit(tick);
    });
    pending.resolve(this);
  }

  /**
   * Execute a new poll factory promise or stand by if necessary.
   */
  private _execute(): void {
    let standby =
      typeof this.standby === 'function' ? this.standby() : this.standby;
    standby =
      standby === 'never'
        ? false
        : standby === 'when-hidden'
          ? !!(typeof document !== 'undefined' && document && document.hidden)
          : true;

    // If in standby mode schedule next tick without calling the factory.
    if (standby) {
      this.schedule({
        interval: this.frequency.interval,
        payload: null,
        phase: 'standby',
        timestamp: new Date().getTime()
      });
      return;
    }

    const pending = this.tick;

    this._factory(this.state)
      .then((resolved: T) => {
        if (this.isDisposed || this.tick !== pending) {
          return;
        }

        this.schedule({
          interval: this.frequency.interval,
          payload: resolved,
          phase: this.state.phase === 'rejected' ? 'reconnected' : 'resolved',
          timestamp: new Date().getTime()
        });
      })
      .catch((rejected: U) => {
        if (this.isDisposed || this.tick !== pending) {
          return;
        }

        const { backoff, max, interval } = this.frequency;
        const growth = backoff === true ? 3 : backoff === false ? 1 : backoff;
        const sleep = Math.min(
          max,
          Private.getRandomIntInclusive(interval, this.state.interval * growth)
        );

        this.schedule({
          interval: sleep,
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
  private _state: IPoll.Tick<T, U>;
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
   * An interval value that indicates the poll should tick immediately.
   */
  export const IMMEDIATE = 0;

  /**
   * An interval value that indicates the poll should never tick.
   */
  export const NEVER = Infinity;

  /**
   * The default polling frequency.
   */
  export const DEFAULT_FREQUENCY: IPoll.Frequency = {
    interval: 1000,
    backoff: true,
    max: 30 * 1000
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
    interval: NEVER,
    payload: null,
    phase: 'constructed',
    timestamp: new Date(0).getTime()
  };

  /**
   * The disposed tick values.
   */
  export const DISPOSED_TICK: IPoll.Tick = {
    interval: NEVER,
    payload: null,
    phase: 'disposed',
    timestamp: new Date(0).getTime()
  };

  /**
   * Get a random integer between min and max, inclusive of both.
   *
   * #### Notes
   * From
   * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random#Getting_a_random_integer_between_two_values_inclusive
   *
   * From the MDN page: It might be tempting to use Math.round() to accomplish
   * that, but doing so would cause your random numbers to follow a non-uniform
   * distribution, which may not be acceptable for your needs.
   */
  export function getRandomIntInclusive(min: number, max: number) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
