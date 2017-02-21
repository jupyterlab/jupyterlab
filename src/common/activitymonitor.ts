// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IDisposable
} from '@phosphor/disposable';

import {
  ISignal, Signal
} from '@phosphor/signaling';


/**
 * A class that monitors activity on a signal.
 */
export
class ActivityMonitor<Sender, Args> implements IDisposable {
  /**
   * Construct a new activity monitor.
   */
  constructor(options: ActivityMonitor.IOptions<Sender, Args>) {
    options.signal.connect(this._onSignalFired, this);
    this._timeout = options.timeout || 1000;
  }

  /**
   * A signal emitted when activity has ceased.
   */
  get activityStopped(): ISignal<this, ActivityMonitor.IArguments<Sender, Args>> {
    return this._activityStopped;
  }

  /**
   * The timeout associated with the monitor, in milliseconds.
   */
  get timeout(): number {
    return this._timeout;
  }
  set timeout(value: number) {
    this._timeout = value;
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
    Signal.clearData(this);
  }

  /**
   * A signal handler for the monitored signal.
   */
  private _onSignalFired(sender: Sender, args: Args): void {
    clearTimeout(this._timer);
    this._sender = sender;
    this._args = args;
    this._timer = window.setTimeout(() => {
      this._activityStopped.emit({
        sender: this._sender,
        args: this._args
      });
      this._sender = null;
      this._args = null;
    }, this._timeout);
  }

  private _timer = -1;
  private _timeout = -1;
  private _sender: Sender = null;
  private _args: Args = null;
  private _isDisposed = false;
  private _activityStopped = new Signal<this, ActivityMonitor.IArguments<Sender, Args>>(this);
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
  interface IOptions<Sender, Args> {
    /**
     * The signal to monitor.
     */
    signal: ISignal<Sender, Args>;

    /**
     * The activity timeout in milliseconds.
     *
     * The default is 1 second.
     */
    timeout?: number;
  }

  /**
   * The argument object for an activity timeout.
   *
   */
  export
  interface IArguments<Sender, Args> {
    /**
     * The most recent sender object.
     */
    sender: Sender;

    /**
     * The most recent argument object.
     */
    args: Args;
  }
}
