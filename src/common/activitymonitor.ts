// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IDisposable
} from 'phosphor-disposable';

import {
  ISignal, Signal, clearSignalData
} from 'phosphor-signaling';


/**
 * A class that monitors activity on a signal.
 */
export
class ActivityMonitor implements IDisposable {
  /**
   * Construct a new activity monitor.
   */
  constructor(options: ActivityMonitor.IOptions) {
    options.signal.connect(this._onSignalFired, this);
    this._timeout = options.timeout || 1000;
  }

  /**
   * A signal emitted when activity has ceased.
   */
  get activityStopped(): ISignal<ActivityMonitor, void> {
    return Private.activityStoppedSignal.bind(this);
  }

  /**
   * Test whether the monitor has been disposed.
   *
   * #### Notes
   * This is a read-only property.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Dispose of the resources used by the activity monitor.
   */
  dispose(): void {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    clearSignalData(this);
  }

  /**
   * A signal handler for the monitored signal.
   */
  private _onSignalFired(): void {
    clearTimeout(this._timer);
    this._timer = setTimeout(() => {
      this.activityStopped.emit(void 0);
    });
  }

  private _timer = -1;
  private _timeout = -1;
  private _isDisposed = false;
}


/**
 * The namespace for `ActivityMonitor` statics.
 */
export
namespace ActivityMonitor {
  /**
   * The options used to construct a new `ActivityMonitor`.
   */
  export
  interface IOptions {
    /**
     * The signal to monitor.
     */
    signal: ISignal<any, any>;

    /**
     * The activity timeout in milliseconds.
     *
     * The default is 1 second.
     */
    timeout?: number;
  }
}


/**
 * A namespace for private data.
 */
namespace Private {
  /**
   * A signal emitted when activity has ceased.
   */
  export
  const activityStoppedSignal = new Signal<ActivityMonitor, void>();
}
