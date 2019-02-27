// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

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

    this.interval = typeof interval === 'number' ? interval : 1000;
    this.name = name || 'unknown';
    this.variance = typeof variance === 'number' ? variance : 0.2;

    // Cache the original interval length and start polling.
    (when || Promise.resolve())
      .then(() => {
        this._connected = true;
        this._poll(poll, interval, max);
      })
      .catch(() => {
        this._poll(poll, interval, max);
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
   * The range within which the poll interval "wobbles".
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
    this._isDisposed = true;
  }

  /**
   * Schedule a poll request.
   */
  private _poll(poll: () => Promise<any>, interval: number, max: number): void {
    setTimeout(async () => {
      if (this._isDisposed) {
        return;
      }

      // Only execute promise if not in a hidden tab.
      if (typeof document === 'undefined' || !document.hidden) {
        try {
          await poll();

          // Bail if disposed while poll promise was in flight.
          if (this._isDisposed) {
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

          this._connected = false;

          // The poll failed. Increase the interval.
          const old = interval;
          interval = Private.jitter(Math.min(old * 2, max), this.variance);
          console.warn(
            `Poll (${
              this.name
            }) failed, increasing interval from ${old} to ${interval}.`,
            error
          );
        }
      }

      this._poll(poll, interval, max);
    }, interval);
  }

  private _connected = false;
  private _isDisposed = false;
}

export namespace Poll {
  /**
   * Instantiation options for polls.
   */
  export interface IOptions {
    /**
     * The millisecond interval between poll requests.
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
     * A function that returns a poll promise.
     */
    poll: () => Promise<any>;

    /**
     * If set, a promise which must resolve (or reject) before polling begins.
     */
    when?: Promise<any>;

    /**
     * The range within which the poll interval "wobbles". Defaults to `0.2`.
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
   * This function returns integers, so it is only useful for larger numbers.
   */
  export function jitter(base: number, factor: number): number {
    if (factor === 0) {
      return Math.floor(base);
    }

    const direction = Math.random() < 0.5 ? 1 : -1;
    const jitter = Math.random() * base * Math.abs(factor) * direction;

    return Math.floor(base + jitter);
  }
}
