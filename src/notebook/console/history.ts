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
  IKernel
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
    this._kernel = newValue;
  }

  /**
   * Construct a new console history object.
   */
  constructor(kernel: IKernel) {
    // Listen to the command history events of the model.
  }

  /**
   * Get the previous item in the console history.
   *
   * @returns A Promise for console command text or `undefined` if unavailable.
   */
  back(): Promise<string> {
    return Promise.resolve(void 0);
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
    return Promise.resolve(void 0);
  }

  /**
   * Reset the history navigation cursor back to the bottom.
   */
  resetCursor(): void {
    this._cursor = 0;
  }

  private _cursor = 0;
  private _data: string[] = void 0;
  private _kernel: IKernel = null;
}
