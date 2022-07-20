import { IDisposable } from '@lumino/disposable';
import { ISignal, Signal } from '@lumino/signaling';

export class StatusMessage implements IDisposable {
  constructor() {
    this.message = '';
    this._timer = null;
  }

  /**
   * Signal emitted on status changed event.
   */
  get changed(): ISignal<StatusMessage, void> {
    return this._changed;
  }

  /**
   * Test whether the object is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * The text message to be shown on the statusbar
   */
  message: string;

  /**
   * Dispose the object.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;
    if (this._timer) {
      window.clearTimeout(this._timer);
    }
    Signal.clearData(this);
  }

  /**
   * Set the text message and (optionally) the timeout to remove it.
   * @param message
   * @param timeout - number of ms to until the message is cleaned;
   *        -1 if the message should stay up indefinitely;
   *        defaults to 3000ms (3 seconds)
   */
  set(message: string, timeout: number = 1000 * 3): void {
    this._expireTimer();
    this.message = message;
    this._changed.emit();
    if (timeout !== -1) {
      this._timer = window.setTimeout(this.clear.bind(this), timeout);
    }
  }

  /**
   * Clear the status message.
   */
  clear(): void {
    this.message = '';
    this._changed.emit();
  }
  /**
   * Timeout reference used to clear the previous `setTimeout` call.
   */
  private _timer: number | null;

  /**
   * Clear the previous `setTimeout` call.
   */
  private _expireTimer(): void {
    if (this._timer !== null) {
      window.clearTimeout(this._timer);
      this._timer = null;
    }
  }
  private _changed = new Signal<StatusMessage, void>(this);

  private _isDisposed = false;
}
