// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ISignal, Signal } from '@lumino/signaling';

import { IDebugger } from '../../tokens';

/**
 * The model to keep track of the current source being displayed.
 */
export class KernelSourcesModel implements IDebugger.Model.IKernelSources {
  private _kernelSources: IDebugger.KernelSource[] | null;

  get kernelSources() {
    return this._kernelSources;
  }

  set kernelSources(kernelSources: IDebugger.KernelSource[] | null) {
    this._kernelSources = kernelSources;
    this._changed.emit(kernelSources);
  }

  /**
   * Signal emitted when the current source changes.
   */
  get changed(): ISignal<this, IDebugger.KernelSource[] | null> {
    return this._changed;
  }

  /**
   * Signal emitted when a kernel source should be open in the main area.
   */
  get kernelSourceOpened(): ISignal<this, IDebugger.Source | null> {
    return this._kernelSourceOpened;
  }

  /**
   * Open a source in the main area.
   */
  open(kernelSource: IDebugger.Source): void {
    this._kernelSourceOpened.emit(kernelSource);
  }

  private _changed = new Signal<this, IDebugger.KernelSource[] | null>(this);

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
