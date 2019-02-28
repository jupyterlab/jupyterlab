// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { PromiseDelegate } from '@phosphor/coreutils';

import { IDisposable } from '@phosphor/disposable';

/**
 * A class that wraps an asynchronous function to poll at a regular interval
 * with exponential increases to the interval length if the poll fails.
 */
export class Poll implements IDisposable {
  /**
   * Instantiate a new poll with exponential back-off in case of failure.
   *
   * @param options - The poll instantiation options.
   */
  constructor(options: Poll.IOptions) {
    const { interval, max, name, poll, variance, when } = options;

    if (interval > max) {
      throw new Error('Poll interval cannot exceed max interval length');
    }

    this.interval =
      typeof interval === 'number' ? Math.round(Math.abs(interval)) : 1000;
    this.name = name || 'unknown';
    this.variance = typeof variance === 'number' ? variance : 0.2;
    this._fn = poll;
    this._max = max;

    // Cache the original interval length and start polling.
    (when || Promise.resolve())
      .then(() => {
        this._connected = true;
        this._poll(interval);
      })
      .catch(() => {
        this._poll(interval);
      });
  }

  /**
   * The polling interval.
   */
  readonly interval: number;

  /**
   * The name of the poll. Defaults to `'unknown'`.
   */
  readonly name: string;

  /**
   * The range within which the poll interval jitters.
   */
  readonly variance: number;

  /**
   * Whether the poll is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Dispose the poll, stop executing future poll requests.
   */
  dispose(): void {
    if (this._isDisposed) {
      return;
    }
    if (this._outstanding) {
      const delegate = this._outstanding;
      this._outstanding = null;
      delegate.reject(new Error(`Poll (${this.name}) is disposed.`));
    }
    this._isDisposed = true;
  }

  /**
   * Refresh the poll.
   */
  refresh(): Poll.Next {
    return this._poll(0, true);
  }

  /**
   * Schedule a poll request.
   */
  private _poll(interval: number, override = false): Poll.Next {
    // If poll is being overridden, generate a new poll.
    if (override && this._outstanding) {
      // Reset the previously outstanding poll and generate the next poll.
      const previous = this._outstanding;
      this._outstanding = null;
      const next = this._poll(0, override);

      // Short-circuit the previous poll promise and return a reference to the
      // next poll promise - which supersedes - scheduled to run immediately.
      previous.resolve(next);

      return next;
    }

    // If there is already an outstanding poll, return a reference to it.
    if (this._outstanding) {
      return this._outstanding.promise;
    }

    // Create a new and set the outstanding reference.
    const delegate = new PromiseDelegate<Poll.Next>();
    const poll = async () => {
      if (this._isDisposed) {
        return;
      }

      // Only execute promise if not in a hidden tab.
      if (typeof document === 'undefined' || !document.hidden) {
        try {
          await this._fn({
            connected: this._connected,
            interval,
            schedule: override ? 'override' : 'automatic'
          });

          // Bail if disposed while poll promise was in flight.
          if (this._isDisposed) {
            return;
          }

          // Bail if this promise has already been superseded and resolved.
          if (this._outstanding !== delegate) {
            return;
          }

          // Check if this is a reconnection before setting connected state.
          if (!this._connected) {
            console.log(`Poll (${this.name}) reconnected.`);
          }
          this._connected = true;

          // The poll succeeded. Reset the interval.
          interval = Private.jitter(this.interval, this.variance);
        } catch (error) {
          // Bail if disposed while poll promise was in flight.
          if (this._isDisposed) {
            return;
          }

          // Bail if this promise has already been superseded and resolved.
          if (this._outstanding !== delegate) {
            return;
          }

          this._connected = false;

          // The poll failed. Increase the interval.
          const old = interval;
          const max = this._max;
          interval = Private.jitter(Math.min(old * 2, max), this.variance);
          console.warn(
            `Poll (${
              this.name
            }) failed, increasing interval from ${old} to ${interval}.`,
            error
          );
        }
      }

      // Schedule the next poll and reset outstanding.
      this._outstanding = null;
      delegate.resolve(this._poll(interval));
      return;
    };

    this._outstanding = delegate;
    if (interval) {
      setTimeout(poll, interval);
    } else {
      requestAnimationFrame(poll);
    }

    return delegate.promise;
  }

  private _connected = false;
  private _fn: (state: Poll.State) => Promise<any>;
  private _isDisposed = false;
  private _max: number;
  private _outstanding: PromiseDelegate<Poll.Next> | null = null;
}

/**
 * A namespace for `Poll` class statics, types, and interfaces.
 */
export namespace Poll {
  /**
   * Definition of poll state that gets passed into the poll promise factory.
   */
  export type State = {
    /**
     * Whether the last poll succeeded.
     */
    connected: boolean;

    /**
     * The number of milliseconds that elapsed since the last poll.
     */
    interval: number;

    /**
     * Whether the poll was scheduled automatically or overridden.
     */
    schedule: 'automatic' | 'override';
  };

  /**
   * A poll promise that resolves to the next scheduled poll promise.
   */
  export type Next = INextPromise;

  /**
   * A poll promise that resolves to the next scheduled poll promise.
   */
  interface INextPromise extends Promise<Next> {}

  /**
   * Instantiation options for polls.
   */
  export interface IOptions {
    /**
     * The millisecond interval between poll requests.
     *
     * #### Notes
     * If set to `0`, the poll will schedule an animation frame after each
     * promise resolution.
     */
    interval: number;

    /**
     * The maximum interval to wait between failing poll requests.
     */
    max: number;

    /**
     * The name of the poll. Defaults to `'unknown'`.
     */
    name?: string;

    /**
     * A function that returns a poll promise. If the `manual` flag is `true`,
     * it indicates a user-initiated poll request.
     */
    poll: (state: Poll.State) => Promise<any>;

    /**
     * If set, a promise which must resolve (or reject) before polling begins.
     */
    when?: Promise<any>;

    /**
     * The range within which the poll interval jitters. Defaults to `0.2`.
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
   * A factor of `0` will return the base unchanged.
   *
   * #### Notes
   * This function returns only positive integers.
   */
  export function jitter(base: number, factor: number): number {
    if (factor === 0) {
      return Math.floor(base);
    }

    const direction = Math.random() < 0.5 ? 1 : -1;
    const jitter = Math.random() * base * Math.abs(factor) * direction;

    // Always return an integer > 0.
    return Math.abs(Math.floor(base + jitter)) || 1;
  }
}
