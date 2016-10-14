// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IDisposable
} from 'phosphor/lib/core/disposable';

import {
  clearSignalData, defineSignal, ISignal
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
   * If the last widget being tracked is disposed, `null` will be emitted.
   */
  currentChanged: ISignal<this, T>;

  /**
   * The current widget is the most recently focused widget.
   */
  currentWidget: T;
}

/**
 * A class that keeps track of widget instances.
 *
 * #### Notes
 * This is meant to be used in conjunction with a `FocusTracker` and will
 * typically be kept in sync with focus tracking events.
 */
export
class InstanceTracker<T extends Widget> implements IInstanceTracker<T>, IDisposable {
  /**
   * A signal emitted when the current widget changes.
   *
   * #### Notes
   * If the last widget being tracked is disposed, `null` will be emitted.
   */
  readonly currentChanged: ISignal<this, T>;

  /**
   * The current widget is the most recently focused widget.
   */
  get currentWidget(): T {
    return this._currentWidget;
  }

  /**
   * Test whether the tracker is disposed.
   */
  get isDisposed(): boolean {
    return this._widgets === null;
  }

  /**
   * Add a new widget to the tracker.
   */
  add(widget: T): void {
    if (this._widgets.has(widget)) {
      console.warn(`${widget.id} has already been added to the tracker.`);
      return;
    }
    this._widgets.add(widget);
    widget.disposed.connect(() => {
      this._widgets.delete(widget);
      if (!this._widgets.size) {
        this._currentWidget = null;
        this.onCurrentChanged();
        this.currentChanged.emit(null);
      }
    });
  }

  /**
   * Dispose of the resources held by the tracker.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    clearSignalData(this);
    this._currentWidget = null;
    this._widgets.clear();
    this._widgets = null;
  }

  /**
   * Find the first widget in the tracker that satisfies a filter function.
   *
   * @param fn The filter function to call on each widget.
   */
  find(fn: (widget: T) => boolean): T {
    let result: T = null;
    this._widgets.forEach(widget => {
      // If a result has already been found, short circuit.
      if (result) {
        return;
      }
      if (fn(widget)) {
        result = widget;
      }
    });
    return result;
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
    return this._widgets.has(widget as any);
  }

  /**
   * Syncs the state of the tracker with a widget known to have focus.
   *
   * @param current The currently focused widget.
   *
   * @returns The current widget or `null` if there is none.
   *
   * #### Notes
   * Syncing acts as a gate returning a widget only if it is the current widget.
   */
  sync(current: Widget): T {
    if (this.isDisposed) {
      return;
    }
    if (current && this._widgets.has(current as any)) {
      // If no state change needs to occur, just bail.
      if (this._currentWidget === current) {
        return this._currentWidget;
      }
      this._currentWidget = current as T;
      this.onCurrentChanged();
      this.currentChanged.emit(this._currentWidget);
      return this._currentWidget;
    }
    return null;
  }

  /**
   * Handle the current change event.
   *
   * #### Notes
   * The default implementation is a no-op. This may be reimplemented by
   * subclasses to customize the behavior.
   */
  protected onCurrentChanged(): void {
    /* This is a no-op. */
  }

  private _currentWidget: T = null;
  private _widgets = new Set<T>();
}


// Define the signals for the `InstanceTracker` class.
defineSignal(InstanceTracker.prototype, 'currentChanged');
