// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IRestorable, RestorablePool } from '@jupyterlab/statedb';
import { IDisposable } from '@lumino/disposable';
import { ISignal, Signal } from '@lumino/signaling';
import { FocusTracker, Widget } from '@lumino/widgets';

/**
 * A tracker that tracks widgets.
 *
 * @typeparam T - The type of widget being tracked. Defaults to `Widget`.
 */
export interface IWidgetTracker<T extends Widget = Widget> extends IDisposable {
  /**
   * A signal emitted when a widget is added.
   */
  readonly widgetAdded: ISignal<this, T>;

  /**
   * The current widget is the most recently focused or added widget.
   *
   * #### Notes
   * It is the most recently focused widget, or the most recently added
   * widget if no widget has taken focus.
   */
  readonly currentWidget: T | null;

  /**
   * A signal emitted when the current instance changes.
   *
   * #### Notes
   * If the last instance being tracked is disposed, `null` will be emitted.
   */
  readonly currentChanged: ISignal<this, T | null>;

  /**
   * The number of instances held by the tracker.
   */
  readonly size: number;

  /**
   * A promise that is resolved when the widget tracker has been
   * restored from a serialized state.
   *
   * #### Notes
   * Most client code will not need to use this, since they can wait
   * for the whole application to restore. However, if an extension
   * wants to perform actions during the application restoration, but
   * after the restoration of another widget tracker, they can use
   * this promise.
   */
  readonly restored: Promise<void>;

  /**
   * A signal emitted when a widget is updated.
   */
  readonly widgetUpdated: ISignal<this, T>;

  /**
   * Find the first instance in the tracker that satisfies a filter function.
   *
   * @param fn The filter function to call on each instance.
   *
   * #### Notes
   * If nothing is found, the value returned is `undefined`.
   */
  find(fn: (obj: T) => boolean): T | undefined;

  /**
   * Iterate through each instance in the tracker.
   *
   * @param fn - The function to call on each instance.
   */
  forEach(fn: (obj: T) => void): void;

  /**
   * Filter the instances in the tracker based on a predicate.
   *
   * @param fn - The function by which to filter.
   */
  filter(fn: (obj: T) => boolean): T[];

  /**
   * Check if this tracker has the specified instance.
   *
   * @param obj - The object whose existence is being checked.
   */
  has(obj: Widget): boolean;

  /**
   * Inject an instance into the widget tracker without the tracker handling
   * its restoration lifecycle.
   *
   * @param obj - The instance to inject into the tracker.
   */
  inject(obj: T): void;
}

/**
 * A class that keeps track of widget instances on an Application shell.
 *
 * @typeparam T - The type of widget being tracked. Defaults to `Widget`.
 *
 * #### Notes
 * The API surface area of this concrete implementation is substantially larger
 * than the widget tracker interface it implements. The interface is intended
 * for export by JupyterLab plugins that create widgets and have clients who may
 * wish to keep track of newly created widgets. This class, however, can be used
 * internally by plugins to restore state as well.
 */
export class WidgetTracker<T extends Widget = Widget>
  implements IWidgetTracker<T>, IRestorable<T>
{
  /**
   * Create a new widget tracker.
   *
   * @param options - The instantiation options for a widget tracker.
   */
  constructor(options: WidgetTracker.IOptions) {
    const focus = (this._focusTracker = new FocusTracker());
    const pool = (this._pool = new RestorablePool(options));

    this.namespace = options.namespace;

    focus.currentChanged.connect((_, current) => {
      if (current.newValue !== this.currentWidget) {
        pool.current = current.newValue;
      }
    }, this);

    pool.added.connect((_, widget) => {
      this._widgetAdded.emit(widget);
    }, this);

    pool.currentChanged.connect((_, widget) => {
      // If the pool's current reference is `null` but the focus tracker has a
      // current widget, update the pool to match the focus tracker.
      if (widget === null && focus.currentWidget) {
        pool.current = focus.currentWidget;
        return;
      }

      this.onCurrentChanged(widget);
      this._currentChanged.emit(widget);
    }, this);

    pool.updated.connect((_, widget) => {
      this._widgetUpdated.emit(widget);
    }, this);
  }

  /**
   * A namespace for all tracked widgets, (e.g., `notebook`).
   */
  readonly namespace: string;

  /**
   * A signal emitted when the current widget changes.
   */
  get currentChanged(): ISignal<this, T | null> {
    return this._currentChanged;
  }

  /**
   * The current widget is the most recently focused or added widget.
   *
   * #### Notes
   * It is the most recently focused widget, or the most recently added
   * widget if no widget has taken focus.
   */
  get currentWidget(): T | null {
    return this._pool.current || null;
  }

  /**
   * A promise resolved when the tracker has been restored.
   */
  get restored(): Promise<void> {
    if (this._deferred) {
      return Promise.resolve();
    } else {
      return this._pool.restored;
    }
  }

  /**
   * The number of widgets held by the tracker.
   */
  get size(): number {
    return this._pool.size;
  }

  /**
   * A signal emitted when a widget is added.
   *
   * #### Notes
   * This signal will only fire when a widget is added to the tracker. It will
   * not fire if a widget is injected into the tracker.
   */
  get widgetAdded(): ISignal<this, T> {
    return this._widgetAdded;
  }

  /**
   * A signal emitted when a widget is updated.
   */
  get widgetUpdated(): ISignal<this, T> {
    return this._widgetUpdated;
  }

  /**
   * Add a new widget to the tracker.
   *
   * @param widget - The widget being added.
   *
   * #### Notes
   * The widget passed into the tracker is added synchronously; its existence in
   * the tracker can be checked with the `has()` method. The promise this method
   * returns resolves after the widget has been added and saved to an underlying
   * restoration connector, if one is available.
   *
   * The newly added widget becomes the current widget unless the focus tracker
   * already had a focused widget.
   */
  async add(widget: T): Promise<void> {
    this._focusTracker.add(widget);
    await this._pool.add(widget);
    if (!this._focusTracker.activeWidget) {
      this._pool.current = widget;
    }
  }

  /**
   * Test whether the tracker is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Dispose of the resources held by the tracker.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;
    this._pool.dispose();
    this._focusTracker.dispose();
    Signal.clearData(this);
  }

  /**
   * Find the first widget in the tracker that satisfies a filter function.
   *
   * @param fn The filter function to call on each widget.
   *
   * #### Notes
   * If no widget is found, the value returned is `undefined`.
   */
  find(fn: (widget: T) => boolean): T | undefined {
    return this._pool.find(fn);
  }

  /**
   * Iterate through each widget in the tracker.
   *
   * @param fn - The function to call on each widget.
   */
  forEach(fn: (widget: T) => void): void {
    return this._pool.forEach(fn);
  }

  /**
   * Filter the widgets in the tracker based on a predicate.
   *
   * @param fn - The function by which to filter.
   */
  filter(fn: (widget: T) => boolean): T[] {
    return this._pool.filter(fn);
  }

  /**
   * Inject a foreign widget into the widget tracker.
   *
   * @param widget - The widget to inject into the tracker.
   *
   * #### Notes
   * Injected widgets will not have their state saved by the tracker.
   *
   * The primary use case for widget injection is for a plugin that offers a
   * sub-class of an extant plugin to have its instances share the same commands
   * as the parent plugin (since most relevant commands will use the
   * `currentWidget` of the parent plugin's widget tracker). In this situation,
   * the sub-class plugin may well have its own widget tracker for layout and
   * state restoration in addition to injecting its widgets into the parent
   * plugin's widget tracker.
   */
  inject(widget: T): Promise<void> {
    return this._pool.inject(widget);
  }

  /**
   * Check if this tracker has the specified widget.
   *
   * @param widget - The widget whose existence is being checked.
   */
  has(widget: Widget): boolean {
    return this._pool.has(widget as any);
  }

  /**
   * Restore the widgets in this tracker's namespace.
   *
   * @param options - The configuration options that describe restoration.
   *
   * @returns A promise that resolves when restoration has completed.
   *
   * #### Notes
   * This function should not typically be invoked by client code.
   * Its primary use case is to be invoked by a restorer.
   */
  async restore(options?: IRestorable.IOptions<T>): Promise<any> {
    const deferred = this._deferred;
    if (deferred) {
      this._deferred = null;
      return this._pool.restore(deferred);
    }
    if (options) {
      return this._pool.restore(options);
    }
    console.warn('No options provided to restore the tracker.');
  }

  /**
   * Save the restore options for this tracker, but do not restore yet.
   *
   * @param options - The configuration options that describe restoration.
   *
   * ### Notes
   * This function is useful when starting the shell in 'single-document' mode,
   * to avoid restoring all useless widgets. It should not ordinarily be called
   * by client code.
   */
  defer(options: IRestorable.IOptions<T>): void {
    this._deferred = options;
  }

  /**
   * Save the restore data for a given widget.
   *
   * @param widget - The widget being saved.
   */
  async save(widget: T): Promise<void> {
    return this._pool.save(widget);
  }

  /**
   * Handle the current change event.
   *
   * #### Notes
   * The default implementation is a no-op.
   */
  protected onCurrentChanged(value: T | null): void {
    /* no-op */
  }

  private _currentChanged = new Signal<this, T | null>(this);
  private _deferred: IRestorable.IOptions<T> | null = null;
  private _focusTracker: FocusTracker<T>;
  private _pool: RestorablePool<T>;
  private _isDisposed = false;
  private _widgetAdded = new Signal<this, T>(this);
  private _widgetUpdated = new Signal<this, T>(this);
}

/**
 * A namespace for `WidgetTracker` statics.
 */
export namespace WidgetTracker {
  /**
   * The instantiation options for a widget tracker.
   */
  export interface IOptions {
    /**
     * A namespace for all tracked widgets, (e.g., `notebook`).
     */
    namespace: string;
  }
}
