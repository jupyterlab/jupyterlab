// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Poll } from './poll';

interface IRegulator {
  invoke(): Promise<void>;
  stop(): Promise<void>;
}

export type Debounced = IRegulator;

export type Throttled = IRegulator;

class Regulator extends Poll<void, void, 'invoked'> {
  constructor(options: {
    factory: Poll.Factory<void, void, 'invoked'>;
    constraints: { interval: number; strategy: 'debounce' | 'throttle' };
  }) {
    super({ factory: options.factory });
    this.constraints = options.constraints;
    this.frequency = { backoff: false, interval: Poll.NEVER, max: Poll.NEVER };
    this.standby = 'never';
    void super.stop();
  }

  readonly constraints: { interval: number; strategy: 'debounce' | 'throttle' };

  async invoke(): Promise<void> {
    const { interval, strategy } = this.constraints;
    if (strategy === 'debounce') {
      return this.schedule({ interval, phase: 'invoked' });
    }
    if (this.state.phase !== 'invoked') {
      return this.schedule({ interval, phase: 'invoked' });
    }
  }
}

/**
 * Returns a debounced function that can be called multiple times and only
 * executes the underlying function one `interval` after the last invocation.
 *
 * @param fn - The function to debounce.
 *
 * @param interval - The debounce interval; defaults to 500ms.
 */
export function debounce(fn: () => any, interval = 500): Debounced {
  return new Regulator({
    factory: async () => await fn(),
    constraints: { interval, strategy: 'debounce' }
  });
}

/**
 * Returns a throttled function that can be called multiple times and only
 * executes the underlying function once per `interval`.
 *
 * @param fn - The function to throttle.
 *
 * @param interval - The throttle interval; defaults to 500ms.
 */
export function throttle(fn: () => any, interval = 500): Throttled {
  return new Regulator({
    factory: async () => await fn(),
    constraints: { interval, strategy: 'throttle' }
  });
}
