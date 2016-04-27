// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  IDisposable
} from 'phosphor-disposable';

import {
  clearSignalData
} from 'phosphor-signaling';

import {
  IKernel, IHistoryRequest, IHistoryReply
} from 'jupyter-js-services';

import {
  IConsoleModel
} from './model';


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
   * Reset the history navigation cursor back to the bottom.
   */
  resetCursor(): void;
}

/**
 * A console history manager object.
 */
export
class ConsoleHistory implements IConsoleHistory {
  /**
   * Get whether the console history manager is disposed.
   *
   * #### Notes
   * This is a read-only property.
   */
  get isDisposed(): boolean {
    return false;
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
    let contents = ConsoleHistoryPrivate.initialRequest;
    this._kernel = newValue;
    this._kernel.history(contents).then((value: IHistoryReply) => {
      this._history = [];
      for (let i = value.history.length - 1; i > -1; i--) {
        // History entries have the shape:
        // [session: number, line: number, input: string]
        this._history.push(value.history[i][2])
      }
      this.resetCursor();
    });

  }

  /**
   * Construct a new console history object.
   */
  constructor(kernel: IKernel) {
    if (kernel) this.kernel = kernel;
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
   * Dispose of the resources held by the console history manager.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    clearSignalData(this);
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
   * Reset the history navigation cursor back to the bottom.
   */
  resetCursor(): void {
    this._cursor =  this._history.length;
  }

  private _cursor = 0;
  private _history: string[] = [];
  private _kernel: IKernel = null;
}

namespace ConsoleHistoryPrivate {
  export
  const initialRequest: IHistoryRequest = {
    output: false,
    raw: true,
    hist_access_type: 'tail',
    n: 50
  };
}
