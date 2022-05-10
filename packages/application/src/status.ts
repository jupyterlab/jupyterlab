// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { DisposableDelegate, IDisposable } from '@lumino/disposable';
import { ISignal, Signal } from '@lumino/signaling';
import { JupyterFrontEnd } from './frontend';
import { ILabStatus } from './tokens';

/**
 * The application status signals and flags class.
 */
export class LabStatus implements ILabStatus {
  /**
   * Construct a new  status object.
   */
  constructor(app: JupyterFrontEnd<any, any>) {
    this._busySignal = new Signal(app);
    this._dirtySignal = new Signal(app);
  }

  /**
   * Returns a signal for when application changes its busy status.
   */
  get busySignal(): ISignal<JupyterFrontEnd, boolean> {
    return this._busySignal;
  }

  /**
   * Returns a signal for when application changes its dirty status.
   */
  get dirtySignal(): ISignal<JupyterFrontEnd, boolean> {
    return this._dirtySignal;
  }

  /**
   * Whether the application is busy.
   */
  get isBusy(): boolean {
    return this._busyCount > 0;
  }

  /**
   * Whether the application is dirty.
   */
  get isDirty(): boolean {
    return this._dirtyCount > 0;
  }

  /**
   * Set the application state to dirty.
   *
   * @returns A disposable used to clear the dirty state for the caller.
   */
  setDirty(): IDisposable {
    const oldDirty = this.isDirty;
    this._dirtyCount++;
    if (this.isDirty !== oldDirty) {
      this._dirtySignal.emit(this.isDirty);
    }
    return new DisposableDelegate(() => {
      const oldDirty = this.isDirty;
      this._dirtyCount = Math.max(0, this._dirtyCount - 1);
      if (this.isDirty !== oldDirty) {
        this._dirtySignal.emit(this.isDirty);
      }
    });
  }

  /**
   * Set the application state to busy.
   *
   * @returns A disposable used to clear the busy state for the caller.
   */
  setBusy(): IDisposable {
    const oldBusy = this.isBusy;
    this._busyCount++;
    if (this.isBusy !== oldBusy) {
      this._busySignal.emit(this.isBusy);
    }
    return new DisposableDelegate(() => {
      const oldBusy = this.isBusy;
      this._busyCount--;
      if (this.isBusy !== oldBusy) {
        this._busySignal.emit(this.isBusy);
      }
    });
  }

  private _busyCount = 0;
  private _busySignal: Signal<JupyterFrontEnd, boolean>;
  private _dirtyCount = 0;
  private _dirtySignal: Signal<JupyterFrontEnd, boolean>;
}
