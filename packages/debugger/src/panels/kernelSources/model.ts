// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ISignal, Signal } from '@lumino/signaling';

import { Debouncer } from '@lumino/polling';

import { IDebugger } from '../../tokens';

/**
 * The rate limit for the filter debouncer
 */
const DEBOUNCER_RATE_LIMIT_MS = 500;

const compare = (a: IDebugger.KernelSource, b: IDebugger.KernelSource) => {
  if (a.name < b.name) {
    return -1;
  }
  if (a.name > b.name) {
    return 1;
  }
  return 0;
};

/**
 * The model to keep track of the current source being displayed.
 */
export class KernelSourcesModel implements IDebugger.Model.IKernelSources {
  constructor() {
    this.refresh = this.refresh.bind(this);
    this._refreshDebouncer = new Debouncer(
      this.refresh,
      DEBOUNCER_RATE_LIMIT_MS
    );
  }

  /**
   * Get the filter.
   */
  get filter(): string {
    return this._filter;
  }

  /**
   * Set the filter.
   * The update
   */
  set filter(filter: string) {
    this._filter = filter;
    this._filterChanged.emit(filter);
    void this._refreshDebouncer.invoke();
  }

  /**
   * Whether the kernel sources model is disposed or not.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Get the kernel sources.
   */
  get kernelSources(): IDebugger.KernelSource[] | null {
    return this._kernelSources;
  }

  /**
   * Set the kernel sources and emit a changed signal.
   */
  set kernelSources(kernelSources: IDebugger.KernelSource[] | null) {
    this._kernelSources = kernelSources;
    this.refresh();
  }

  /**
   * Signal emitted when the current source changes.
   */
  get changed(): ISignal<this, IDebugger.KernelSource[] | null> {
    return this._changed;
  }

  /**
   * Signal emitted when the current source changes.
   */
  get filterChanged(): ISignal<this, string> {
    return this._filterChanged;
  }

  /**
   * Signal emitted when a kernel source should be open in the main area.
   */
  get kernelSourceOpened(): ISignal<this, IDebugger.Source | null> {
    return this._kernelSourceOpened;
  }

  /**
   * Dispose the kernel sources model
   */
  dispose(): void {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    this._refreshDebouncer.dispose();
    Signal.clearData(this);
  }

  /**
   * Open a source in the main area.
   */
  open(kernelSource: IDebugger.Source): void {
    this._kernelSourceOpened.emit(kernelSource);
  }

  private getFilteredKernelSources() {
    const regexp = new RegExp(this._filter);
    return this._kernelSources!.filter(module => regexp.test(module.name));
  }

  private refresh() {
    if (this._kernelSources) {
      this._filteredKernelSources = this._filter
        ? this.getFilteredKernelSources()
        : this._kernelSources;
      this._filteredKernelSources.sort(compare);
    } else {
      this._kernelSources = new Array<IDebugger.KernelSource>();
      this._filteredKernelSources = new Array<IDebugger.KernelSource>();
    }
    this._changed.emit(this._filteredKernelSources);
  }

  private _filteredKernelSources: IDebugger.KernelSource[] | null = null;
  private _filter = '';
  private _isDisposed = false;
  private _kernelSources: IDebugger.KernelSource[] | null = null;
  private _refreshDebouncer: Debouncer;
  private _changed = new Signal<this, IDebugger.KernelSource[] | null>(this);
  private _filterChanged = new Signal<this, string>(this);
  private _kernelSourceOpened = new Signal<this, IDebugger.Source | null>(this);
}

/**
 * A namespace for SourcesModel `statics`.
 */
export namespace KernelSourcesModel {
  /**
   * The options used to initialize a SourcesModel object.
   */
  export interface IOptions {
    /**
     * Signal emitted when the current frame changes.
     */
    currentFrameChanged: ISignal<
      IDebugger.Model.ICallstack,
      IDebugger.IStackFrame | null
    >;
  }
}
