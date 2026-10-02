/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import type { IDisposable } from '@lumino/disposable';
import type { IAccessibleAnnouncer } from './tokens';

/**
 * A DOM-backed screen-reader announcement service.
 */
export class AccessibleAnnouncer implements IAccessibleAnnouncer, IDisposable {
  /**
   * Create an accessibility announcer.
   *
   * @param host - The element to which the live region is attached.
   */
  constructor(host: HTMLElement = document.body) {
    this.node = document.createElement('div');
    this.node.className = 'jp-sr-only';
    this.node.setAttribute('role', 'status');
    this.node.setAttribute('aria-live', 'polite');
    this.node.setAttribute('aria-atomic', 'true');
    host.appendChild(this.node);
  }

  /**
   * The live region DOM node.
   */
  readonly node: HTMLElement;

  /**
   * Whether announcements are enabled.
   */
  get enabled(): boolean {
    return this._enabled;
  }

  set enabled(value: boolean) {
    this._enabled = value;
    if (!value) {
      this.clear();
    }
  }

  /**
   * The default time in milliseconds before an announcement is cleared.
   */
  get clearTimeout(): number {
    return this._clearTimeout;
  }

  set clearTimeout(value: number) {
    this._clearTimeout = Math.max(0, value);
  }

  /**
   * Whether the announcer has been disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Announce a message to screen readers.
   */
  announce(message: string, options: IAccessibleAnnouncer.IOptions = {}): void {
    if (this._isDisposed || !this._enabled) {
      return;
    }

    this._clearTimer();
    this.node.setAttribute(
      'aria-live',
      options.assertive ? 'assertive' : 'polite'
    );
    this.node.textContent = '';
    this.node.textContent = message;

    const timeout = options.clearTimeout ?? this._clearTimeout;
    if (timeout > 0) {
      this._timer = window.setTimeout(() => this.clear(), timeout);
    }
  }

  /**
   * Clear the current announcement.
   */
  clear(): void {
    this._clearTimer();
    this.node.textContent = '';
  }

  /**
   * Dispose the announcer and remove its live region.
   */
  dispose(): void {
    if (this._isDisposed) {
      return;
    }

    this._isDisposed = true;
    this._clearTimer();
    this.node.remove();
  }

  private _clearTimer(): void {
    if (this._timer !== null) {
      window.clearTimeout(this._timer);
      this._timer = null;
    }
  }

  private _enabled = true;
  private _clearTimeout = 5000;
  private _isDisposed = false;
  private _timer: number | null = null;
}
