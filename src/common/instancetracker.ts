// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  defineSignal, ISignal
} from 'phosphor/lib/core/signaling';

import {
  Widget
} from 'phosphor/lib/ui/widget';


/**
 * An object that tracks widget instances.
 */
export
interface IInstanceTracker<T extends Widget> {
  /**
   * A signal emitted when the current widget changes.
   *
   * #### Notes
   * If there is no widget with the focus, then `null` will be emitted.
   */
  currentChanged: ISignal<this, T>;

  /**
   * The current widget.
   *
   * #### Notes
   * If there is no widget with the focus, then this value is `null`.
   */
  currentWidget: T;
}


export
class InstanceTracker<T extends Widget> implements IInstanceTracker<T> {
  /**
   * A signal emitted when the current widget changes.
   *
   * #### Notes
   * If there is no widget with the focus, then `null` will be emitted.
   */
  currentChanged: ISignal<this, T>;

  /**
   * The current widget.
   *
   * #### Notes
   * If there is no widget with the focus, then this value is `null`.
   */
  get currentWidget(): T {
    return this._currentWidget;
  }

  /**
   * Add a new widget to the tracker.
   */
  add(widget: T): void {
    if (!widget.id) {
      throw new Error('All tracked widgets must have IDs.');
    }
    if (this._widgets.has(widget.id)) {
      console.warn(`${widget.id} has already been added to the tracker.`);
      return;
    }
    this._widgets.set(widget.id, widget);
    widget.disposed.connect(() => { this._widgets.delete(widget.id); });
  }

  /**
   * Iterate through each widget in the tracker.
   *
   * @param fn The function to call on each widget.
   */
  forEach(fn: (widget: T) => void): void {
    this._widgets.forEach(widget => { fn(widget); });
  }

  /**
   * Check if this tracker has the specified widget.
   */
  has(widget: Widget): boolean {
    return this._widgets.has(widget.id);
  }

  /**
   * Syncs the state of the tracker with a widget known to have focus.
   *
   * @param current The currently focused widget.
   *
   * @returns The current widget or `null` if there is none.
   *
   * #### Notes
   * Syncing acts as a gate returning the widget that's passed in any time it is
   * held by the tracker and not already the current widget. It returns `null`
   * at all other times.
   */
  sync(current: Widget): T {
    if (current && this.has(current) && this._currentWidget !== current) {
      this._currentWidget = current as T;
      this.currentChanged.emit(this._currentWidget);
      this.onSync();
      return current as T;
    }
    if (this._currentWidget) {
      this._currentWidget = null;
      this.currentChanged.emit(null);
    }
    this.onSync();
    return null;
  }

  /**
   * Handle the sync event.
   *
   * #### Notes
   * The default implementation is a no-op. This may be reimplemented by
   * subclasses to customize the behavior.
   */
  protected onSync(): void {
    /* This is a no-op. */
  }

  private _currentWidget: T = null;
  private _widgets = new Map<string, T>();
}

// Define the signals for the `InstanceTracker` class.
defineSignal(InstanceTracker.prototype, 'currentChanged');
