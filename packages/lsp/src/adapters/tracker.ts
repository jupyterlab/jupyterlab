// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { DocumentWidget } from '@jupyterlab/docregistry';

import { ISignal, Signal } from '@lumino/signaling';

import { WidgetLSPAdapter } from './adapter';
import { IShell, IWidgetLSPAdapterTracker } from '../tokens';

/**
 * A class that keeps track of widget adapter instances.
 *
 * @typeparam T - The type of widget being tracked. Defaults to `WidgetLSPAdapter`.
 */
export class WidgetLSPAdapterTracker<
  T extends WidgetLSPAdapter = WidgetLSPAdapter
> implements IWidgetLSPAdapterTracker<T>
{
  /**
   * Create a new widget tracker.
   *
   * @param options - The instantiation options for a widget tracker.
   */
  constructor(options: WidgetLSPAdapterTracker.IOptions) {
    const shell = (this._shell = options.shell);

    shell.currentChanged.connect((_, args) => {
      let newValue = args.newValue;

      if (!newValue || !(newValue instanceof DocumentWidget)) {
        return;
      }

      const adapter = this.find(value => value.widget === newValue);

      if (!adapter) {
        return;
      }

      this._current = adapter;
      this._currentChanged.emit(adapter);
    });
  }

  /**
   * A signal emitted when the current adapter changes.
   */
  get currentChanged(): ISignal<this, T | null> {
    return this._currentChanged;
  }

  /**
   * The current adapter is the most recently focused or added adapter.
   *
   * #### Notes
   * It is the most recently focused adapter, or the most recently added
   * adapter if no adapter has taken focus.
   */
  get currentAdapter(): T | null {
    return this._current;
  }

  /**
   * The number of adapter held by the tracker.
   */
  get size(): number {
    return this._adapters.size;
  }

  /**
   * A signal emitted when an adapter is added.
   */
  get adapterAdded(): ISignal<this, T> {
    return this._adapterAdded;
  }

  /**
   * A signal emitted when an adapter is updated.
   */
  get adapterUpdated(): ISignal<this, T> {
    return this._adapterUpdated;
  }

  /**
   * Add a new adapter to the tracker.
   *
   * @param adapter - The adapter being added.
   *
   * #### Notes.
   * The newly added adapter becomes the current adapter unless the shell
   * already had a DocumentWidget as the activeWidget.
   */
  add(adapter: T): void {
    if (adapter.isDisposed) {
      const warning = 'A disposed object cannot be added.';
      console.warn(warning, adapter);
      throw new Error(warning);
    }

    if (this._adapters.has(adapter)) {
      const warning = 'This object already exists in the pool.';
      console.warn(warning, adapter);
      throw new Error(warning);
    }

    this._adapters.add(adapter);
    this._adapterAdded.emit(adapter);

    adapter.disposed.connect(() => {
      this._adapters.delete(adapter);

      if (adapter === this._current) {
        this._current = null;
        this._currentChanged.emit(this._current);
      }
    }, this);

    // Only update the current adapter, when there is no shell.activeWidget
    // or the active widget is not a DocumentWidget
    // We will be able to use other panels while keeping the current adapter.
    const active = this._shell.activeWidget;
    if (!active || !(active instanceof DocumentWidget)) {
      this._current = adapter;
      this._currentChanged.emit(adapter);
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
    this._adapters.clear();
    Signal.clearData(this);
  }

  /**
   * Find the first adapter in the tracker that satisfies a filter function.
   *
   * @param fn The filter function to call on each adapter.
   *
   * #### Notes
   * If no adapter is found, the value returned is `undefined`.
   */
  find(fn: (adapter: T) => boolean): T | undefined {
    const values = this._adapters.values();
    for (const value of values) {
      if (fn(value)) {
        return value;
      }
    }
    return undefined;
  }

  /**
   * Iterate through each adapter in the tracker.
   *
   * @param fn - The function to call on each adapter.
   */
  forEach(fn: (adapter: T) => void): void {
    this._adapters.forEach(fn);
  }

  /**
   * Filter the adapter in the tracker based on a predicate.
   *
   * @param fn - The function by which to filter.
   */
  filter(fn: (adapter: T) => boolean): T[] {
    const filtered: T[] = [];
    this.forEach(value => {
      if (fn(value)) {
        filtered.push(value);
      }
    });
    return filtered;
  }

  /**
   * Check if this tracker has the specified adapter.
   *
   * @param adapter - The adapter whose existence is being checked.
   */
  has(adapter: T): boolean {
    return this._adapters.has(adapter);
  }

  private _isDisposed = false;
  private _shell: IShell;
  private _current: T | null = null;
  private _adapters = new Set<T>();
  private _adapterAdded = new Signal<this, T>(this);
  private _adapterUpdated = new Signal<this, T>(this);
  private _currentChanged = new Signal<this, T | null>(this);
}

/**
 * A namespace for `WidgetLSPAdapterTracker` statics.
 */
export namespace WidgetLSPAdapterTracker {
  /**
   * The instantiation options for the WidgetLSPAdapterTracker.
   */
  export interface IOptions {
    /**
     * The JupyterLab shell for tracking all widgets.
     */
    shell: IShell;
  }
}
