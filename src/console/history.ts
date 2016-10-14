// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IKernel, KernelMessage
} from '@jupyterlab/services';

import {
  Vector
} from 'phosphor/lib/collections/vector';

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
   * The placeholder text that a history session began with.
   *
   * #### Notes
   * This is a read-only property.
   */
  placeholder: string;

  /**
   * Get the previous item in the console history.
   *
   * @param placeholder - The placeholder string that gets temporarily added
   * to the history only for the duration of one history session. If multiple
   * placeholders are sent within a session, only the first one is accepted.
   *
   * @returns A Promise for console command text or `undefined` if unavailable.
   */
  back(placeholder: string): Promise<string>;

  /**
   * Get the next item in the console history.
   *
   * @param placeholder - The placeholder string that gets temporarily added
   * to the history only for the duration of one history session. If multiple
   * placeholders are sent within a session, only the first one is accepted.
   *
   * @returns A Promise for console command text or `undefined` if unavailable.
   */
  forward(placeholder: string): Promise<string>;

  /**
   * Add a new item to the bottom of history.
   *
   * @param item The item being added to the bottom of history.
   *
   * #### Notes
   * If the item being added is undefined or empty, it is ignored. If the item
   * being added is the same as the last item in history, it is ignored as well
   * so that the console's history will consist of no contiguous repetitions.
   */
  push(item: string): void;

  /**
   * Reset the history navigation state, i.e., start a new history session.
   */
  reset(): void;
}


/**
 * A console history manager object.
 */
export
class ConsoleHistory implements IConsoleHistory {
  /**
   * Construct a new console history object.
   */
  constructor(options?: ConsoleHistory.IOptions) {
    this._history = new Vector<string>();
    if (options && options.kernel) {
      this.kernel = options.kernel;
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
      this._history = new Vector<string>();
      return;
    }

    this._kernel.history(Private.initialRequest).then(v => this.onHistory(v));
  }

  /**
   * The placeholder text that a history session began with.
   *
   * #### Notes
   * This is a read-only property.
   */
  get placeholder(): string {
    return this._placeholder;
  }

  /**
   * Dispose of the resources held by the console history manager.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    clearSignalData(this);
    this._history = null;
  }

  /**
   * Get the previous item in the console history.
   *
   * @param placeholder - The placeholder string that gets temporarily added
   * to the history only for the duration of one history session. If multiple
   * placeholders are sent within a session, only the first one is accepted.
   *
   * @returns A Promise for console command text or `undefined` if unavailable.
   */
  back(placeholder: string): Promise<string> {
    if (!this._hasSession) {
      this._hasSession = true;
      this._placeholder = placeholder;
    }

    let content = this._history.at(--this._cursor);
    this._cursor = Math.max(0, this._cursor);
    return Promise.resolve(content);
  }

  /**
   * Get the next item in the console history.
   *
   * @param placeholder - The placeholder string that gets temporarily added
   * to the history only for the duration of one history session. If multiple
   * placeholders are sent within a session, only the first one is accepted.
   *
   * @returns A Promise for console command text or `undefined` if unavailable.
   */
  forward(placeholder: string): Promise<string> {
    if (!this._hasSession) {
      this._hasSession = true;
      this._placeholder = placeholder;
    }

    let content = this._history.at(++this._cursor);
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
   */
  push(item: string): void {
    if (item && item !== this._history.back) {
      this._history.pushBack(item);
    }
    this.reset();
  }

  /**
   * Reset the history navigation state, i.e., start a new history session.
   */
  reset(): void {
    this._cursor = this._history.length;
    this._hasSession = false;
    this._placeholder = '';
  }

  /**
   * Populate the history collection on history reply from a kernel.
   *
   * @param value The kernel message history reply.
   *
   * #### Notes
   * History entries have the shape:
   * [session: number, line: number, input: string]
   * Contiguous duplicates are stripped out of the API response.
   */
  protected onHistory(value: KernelMessage.IHistoryReplyMsg): void {
    this._history = new Vector<string>();
    let last = '';
    let current = '';
    for (let i = 0; i < value.content.history.length; i++) {
      current = (value.content.history[i] as string[])[2];
      if (current !== last) {
        this._history.pushBack(last = current);
      }
    }
    // Reset the history navigation cursor back to the bottom.
    this._cursor = this._history.length;
  }

  private _cursor = 0;
  private _hasSession = false;
  private _history: Vector<string> = null;
  private _kernel: IKernel = null;
  private _placeholder: string = '';
}


/**
 * A namespace for ConsoleHistory statics.
 */
export
namespace ConsoleHistory {
  /**
   * The initialization options for a console history object.
   */
  export
  interface IOptions {
    /**
     * The kernel instance to query for history.
     */
    kernel?: IKernel;
  }
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
