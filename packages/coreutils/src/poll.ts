// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IDisposable } from '@phosphor/disposable';

export class Poll implements IDisposable {
  constructor(options: Poll.IOptions) {
    const { interval, max, poll } = options;

    if (interval > max) {
      throw new Error('Poll interval cannot exceed max interval length');
    }

    this._poll(poll, interval, max);
  }

  get isDisposed(): boolean {
    return this._isDisposed;
  }

  dispose(): void {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
  }

  private _poll(fn: () => Promise<any>, interval: number, max: number): void {
    setTimeout(async () => {
      if (this._isDisposed) {
        return;
      }

      // Only execute promise if not in a hidden tab.
      if (typeof document === 'undefined' || !document.hidden) {
        try {
          await fn();
        } catch (error) {
          const old = interval;
          interval = Math.min(old * 2, max);
          console.warn(`Poll error, raise interval from ${old} to ${interval}`);
        }
      }

      this._poll(fn, interval, max);
    }, interval);
  }

  private _isDisposed = false;
}

export namespace Poll {
  export interface IOptions {
    interval: number;
    max: number;
    poll: () => Promise<any>;
  }
}
