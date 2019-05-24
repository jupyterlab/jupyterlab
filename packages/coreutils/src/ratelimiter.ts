// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { PromiseDelegate } from '@phosphor/coreutils';

import { IRateLimiter } from './interfaces';

import { Poll } from './poll';

/**
 * A base class to implement rate limiters with different invocation strategies.
 *
 * @typeparam T - The resolved type of the underlying function.
 *
 * @typeparam U - The rejected type of the underlying function.
 */
export abstract class RateLimiter<T, U> implements IRateLimiter<T, U> {
  /**
   * Instantiate a rate limiter.
   *
   * @param fn - The function to rate limit.
   *
   * @param limit - The rate limit; defaults to 500ms.
   */
  constructor(fn: () => T | Promise<T>, limit = 500) {
    this.limit = limit;
    this.poll = new Poll({
      auto: false,
      factory: async () => await fn(),
      frequency: { backoff: false, interval: Poll.NEVER, max: Poll.NEVER },
      standby: 'never'
    });
    this.payload = new PromiseDelegate();
    this.poll.ticked.connect((_, state) => {
      const { payload } = this;

      if (state.phase === 'resolved') {
        this.payload = new PromiseDelegate();
        payload.resolve((state.payload as T) || undefined);
        return;
      }

      if (state.phase === 'rejected' || state.phase === 'stopped') {
        this.payload = new PromiseDelegate();
        payload.promise.catch(_ => undefined);
        payload.reject(state.payload as U);
        return;
      }
    }, this);
  }

  /**
   * Whether the rate limiter is disposed.
   */
  get isDisposed(): boolean {
    return this.payload === null;
  }

  /**
   * Disposes the rate limiter.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this.payload = null;
    this.poll.dispose();
  }

  /**
   * The rate limit in milliseconds.
   */
  readonly limit: number;

  /**
   * Invoke the rate limited function.
   */
  abstract async invoke(): Promise<T>;

  /**
   * Stop the function if it is mid-flight.
   */
  async stop(): Promise<void> {
    return this.poll.stop();
  }

  /**
   * A promise that resolves on each successful invocation.
   */
  protected payload: PromiseDelegate<T> | null = null;

  /**
   * The underlying poll instance used by the rate limiter.
   */
  protected poll: Poll<T, U, 'invoked'>;
}

/**
 * Wraps and debounces a function that can be called multiple times and only
 * executes the underlying function one `interval` after the last invocation.
 *
 * @typeparam T - The resolved type of the underlying function. Defaults to any.
 *
 * @typeparam U - The rejected type of the underlying function. Defaults to any.
 */
export class Debouncer<T = any, U = any> extends RateLimiter<T, U> {
  /**
   * Invokes the function and only executes after rate limit has elapsed.
   * Each invocation resets the timer.
   */
  async invoke(): Promise<T> {
    void this.poll.schedule({ interval: this.limit, phase: 'invoked' });
    return this.payload.promise;
  }
}

/**
 * Wraps and throttles a function that can be called multiple times and only
 * executes the underlying function once per `interval`.
 *
 * @typeparam T - The resolved type of the underlying function. Defaults to any.
 *
 * @typeparam U - The rejected type of the underlying function. Defaults to any.
 */
export class Throttler<T = any, U = any> extends RateLimiter<T, U> {
  /**
   * Throttles function invocations if one is currently in flight.
   */
  async invoke(): Promise<T> {
    if (this.poll.state.phase !== 'invoked') {
      void this.poll.schedule({ interval: this.limit, phase: 'invoked' });
    }
    return this.payload.promise;
  }
}
