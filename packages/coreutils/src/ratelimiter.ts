// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IRateLimiter } from './interfaces';

import { Poll } from './poll';

/**
 * A base class to implement rate limiters with different invocation strategies.
 */
export abstract class RateLimiter implements IRateLimiter {
  /**
   * Instantiate a rate limiter.
   *
   * @param fn - The function to rate limit.
   *
   * @param limit - The rate limit; defaults to 500ms.
   */
  constructor(fn: () => any, limit = 500) {
    this.limit = limit;
    this.poll = new Poll({
      factory: async () => await fn(),
      frequency: { backoff: false, interval: Poll.NEVER, max: Poll.NEVER },
      standby: 'never'
    });
    void this.stop();
  }

  /**
   * The rate limit in milliseconds.
   */
  readonly limit: number;

  /**
   * Invoke the rate limited function.
   */
  abstract async invoke(): Promise<void>;

  /**
   * Stop the function if it is mid-flight.
   */
  async stop(): Promise<void> {
    return this.poll.stop();
  }

  /**
   * The underlying poll instance used by the rate limiter.
   */
  protected poll: Poll<void, void, 'invoked'>;
}

/**
 * Wraps and debounces a function that can be called multiple times and only
 * executes the underlying function one `interval` after the last invocation.
 *
 * @param fn - The function to debounce.
 *
 * @param limit - The debounce rate limit; defaults to 500ms.
 */
export class Debouncer extends RateLimiter {
  /**
   * Invokes the function and only executes after rate limit has elapsed.
   * Each invocation resets the timer.
   */
  async invoke(): Promise<void> {
    return this.poll.schedule({ interval: this.limit, phase: 'invoked' });
  }
}

/**
 * Wraps and throttles a function that can be called multiple times and only
 * executes the underlying function once per `interval`.
 *
 * @param fn - The function to throttle.
 *
 * @param limit - The throttle rate limit; defaults to 500ms.
 */
export class Throttler extends RateLimiter {
  /**
   * Throttles function invocations if one is currently in flight.
   */
  async invoke(): Promise<void> {
    if (this.poll.state.phase !== 'invoked') {
      return this.poll.schedule({ interval: this.limit, phase: 'invoked' });
    }
  }
}
