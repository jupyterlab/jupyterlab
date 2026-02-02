// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { IEditorMimeTypeService } from '@jupyterlab/codeeditor';

import type { ISignal } from '@lumino/signaling';
import { Signal } from '@lumino/signaling';

import { DebuggerDisplayRegistry } from './displayregistry';

import { BreakpointsModel } from './panels/breakpoints/model';

import { CallstackModel } from './panels/callstack/model';

import { KernelSourcesModel } from './panels/kernelSources/model';

import { SourcesModel } from './panels/sources/model';

import { VariablesModel } from './panels/variables/model';

import type { IDebugger, IDebuggerDisplayRegistry } from './tokens';

/**
 * A model for a debugger.
 */
export class DebuggerModel implements IDebugger.Model.IService {
  /**
   * Instantiate a new DebuggerModel
   */
  constructor(options: DebuggerModel.IOptions) {
    const displayRegistry =
      options.displayRegistry ?? new DebuggerDisplayRegistry();
    this.breakpoints = new BreakpointsModel({ displayRegistry });
    this.callstack = new CallstackModel({
      displayRegistry
    });
    this.variables = new VariablesModel();
    this.sources = new SourcesModel({
      currentFrameChanged: this.callstack.currentFrameChanged,
      mimeTypeService: options.mimeTypeService,
      getSource: options.getSource,
      displayRegistry
    });
    this.kernelSources = new KernelSourcesModel();
  }

  /**
   * The breakpoints model.
   */
  readonly breakpoints: BreakpointsModel;

  /**
   * The callstack model.
   */
  readonly callstack: CallstackModel;

  /**
   * The variables model.
   */
  readonly variables: VariablesModel;

  /**
   * The sources model.
   */
  readonly sources: SourcesModel;

  /**
   * The sources model.
   */
  readonly kernelSources: KernelSourcesModel;

  /**
   * A signal emitted when the debugger widget is disposed.
   */
  get disposed(): ISignal<this, void> {
    return this._disposed;
  }

  /**
   * Whether the kernel support rich variable rendering based on mime type.
   */
  get hasRichVariableRendering(): boolean {
    return this._hasRichVariableRendering;
  }
  set hasRichVariableRendering(v: boolean) {
    this._hasRichVariableRendering = v;
  }

  /**
   * Whether the kernel supports the copyToGlobals request.
   */
  get supportCopyToGlobals(): boolean {
    return this._supportCopyToGlobals;
  }
  set supportCopyToGlobals(v: boolean) {
    this._supportCopyToGlobals = v;
  }

  /**
   * Whether the model is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * The set of threads in stopped state.
   */
  get stoppedThreads(): Set<number> {
    return this._stoppedThreads;
  }

  /**
   * Assigns the parameters to the set of threads in stopped state.
   */
  set stoppedThreads(threads: Set<number>) {
    this._stoppedThreads = threads;
  }

  /**
   * The current debugger title.
   */
  get title(): string {
    return this._title;
  }

  /**
   * Set the current debugger title.
   */
  set title(title: string) {
    if (title === this._title) {
      return;
    }
    this._title = title ?? '-';
    this._titleChanged.emit(title);
  }

  /**
   * A signal emitted when the title changes.
   */
  get titleChanged(): ISignal<this, string> {
    return this._titleChanged;
  }

  /**
   * Dispose the model.
   */
  dispose(): void {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    this.kernelSources.dispose();
    this._disposed.emit();
  }

  /**
   * Clear the model.
   */
  clear(): void {
    this._stoppedThreads.clear();
    const breakpoints = new Map<string, IDebugger.IBreakpoint[]>();
    this.breakpoints.restoreBreakpoints(breakpoints);
    this.callstack.frames = [];
    this.variables.scopes = [];
    this.sources.currentSource = null;
    this.kernelSources.kernelSources = null;
    this.title = '-';
  }

  private _disposed = new Signal<this, void>(this);
  private _isDisposed = false;
  private _hasRichVariableRendering = false;
  private _supportCopyToGlobals = false;
  private _stoppedThreads = new Set<number>();
  private _title = '-';
  private _titleChanged = new Signal<this, string>(this);
}

/**
 * A namespace for DebuggerModel
 */
export namespace DebuggerModel {
  /**
   * Instantiation options for a DebuggerModel.
   */
  export interface IOptions {
    /**
     * Get source
     */
    getSource(args: {
      sourceReference: number;
      path: string | undefined;
    }): Promise<IDebugger.Source>;
    /**
     * The display registry.
     */
    displayRegistry?: IDebuggerDisplayRegistry | null;
    /**
     * The mimetype services.
     */
    mimeTypeService?: IEditorMimeTypeService | null;
  }
}
