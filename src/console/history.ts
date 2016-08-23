// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IKernel, KernelMessage
} from 'jupyter-js-services';

import {
  IDisposable
} from 'phosphor/lib/core/disposable';

import {
  clearSignalData
} from 'phosphor/lib/core/signaling';


/**
 * The definition of a console history manager object.
 */
export
interface IConsoleHistory extends IDisposable {
  /**
   * The current kernel supplying navigation history.
   */
  kernel: IKernel;

  /**
   * Get the previous item in the console history.
   *
   * @returns A Promise for console command text or `undefined` if unavailable.
   */
  back(): Promise<string>;

  /**
   * Get the next item in the console history.
   *
   * @returns A Promise for console command text or `undefined` if unavailable.
   */
  forward(): Promise<string>;

  /**
   * Add a new item to the bottom of history.
   *
   * @param item The item being added to the bottom of history.
   *
   * #### Notes
   * If the item being added is undefined or empty, it is ignored. If the item
   * being added is the same as the last item in history, it is ignored as well
   * so that the console's history will consist of no contiguous repetitions.
   * This behavior varies from some shells, but the Jupyter Qt Console is
   * implemented this way.
   */
  push(item: string): void;
}


/**
 * A console history manager object.
 */
export
class ConsoleHistory implements IConsoleHistory {
  /**
   * Construct a new console history object.
   */
  constructor(kernel: IKernel) {
    this._history = [];
    if (kernel) {
      this.kernel = kernel;
    }
  }

  /**
   * Get whether the console history manager is disposed.
   *
   * #### Notes
   * This is a read-only property.
   */
  get isDisposed(): boolean {
    return this._history === null;
  }

  /**
   * The current kernel supplying navigation history.
   */
  get kernel(): IKernel {
    return this._kernel;
  }
  set kernel(newValue: IKernel) {
    if (newValue === this._kernel) {
      return;
    }

    this._kernel = newValue;

    if (!this._kernel) {
      this._history.length = 0;
      return;
    }

    this._kernel.history(Private.initialRequest).then(v => this._populate(v));
  }

  /**
   * Dispose of the resources held by the console history manager.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    clearSignalData(this);
    this._history.length = 0;
    this._history = null;
  }

  /**
   * Get the previous item in the console history.
   *
   * @returns A Promise for console command text or `undefined` if unavailable.
   */
  back(): Promise<string> {
    let content = this._history[--this._cursor];
    this._cursor = Math.max(0, this._cursor);
    return Promise.resolve(content);
  }

  /**
   * Get the next item in the console history.
   *
   * @returns A Promise for console command text or `undefined` if unavailable.
   */
  forward(): Promise<string> {
    let content = this._history[++this._cursor];
    this._cursor = Math.min(this._history.length, this._cursor);
    return Promise.resolve(content);
  }

  /**
   * Add a new item to the bottom of history.
   *
   * @param item The item being added to the bottom of history.
   *
   * #### Notes
   * If the item being added is undefined or empty, it is ignored. If the item
   * being added is the same as the last item in history, it is ignored as well
   * so that the console's history will consist of no contiguous repetitions.
   * This behavior varies from some shells, but the Jupyter Qt Console is
   * implemented this way.
   */
  push(item: string): void {
    if (item && item !== this._history[this._history.length - 1]) {
      this._history.push(item);
    }
    // Reset the history navigation cursor back to the bottom.
    this._cursor = this._history.length;
  }

  /**
   * Populate the history collection.
   *
   * @param value The kernel message history reply.
   *
   * #### Notes
   * History entries have the shape:
   * [session: number, line: number, input: string]
   * Contiguous duplicates are stripped out of the API response.
   */
  private _populate(value: KernelMessage.IHistoryReplyMsg): void {
    this._history = [];
    let last = '';
    let current = '';
    for (let i = 0; i < value.content.history.length; i++) {
      current = (value.content.history[i] as string[])[2];
      if (current !== last) {
        this._history.push(last = current);
      }
    }
    // Reset the history navigation cursor back to the bottom.
    this._cursor = this._history.length;
  }

  private _cursor = 0;
  private _history: string[] = null;
  private _kernel: IKernel = null;
}


/**
 * A namespace for private data.
 */
namespace Private {
  export
  const initialRequest: KernelMessage.IHistoryRequest = {
    output: false,
    raw: true,
    hist_access_type: 'tail',
    n: 500
  };
}
