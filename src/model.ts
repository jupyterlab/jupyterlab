// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IDebugger } from './tokens';

import { ISignal, Signal } from '@lumino/signaling';

import { BreakpointsModel } from './breakpoints/model';

import { CallstackModel } from './callstack/model';

import { SourcesModel } from './sources/model';

import { VariablesModel } from './variables/model';

import { SidebarHeaderModel } from './header';

/**
 * A model for a debugger.
 */
export class DebuggerModel implements IDebugger.IModel {
  /**
   * Instantiate a new DebuggerModel
   */
  constructor() {
    this.breakpoints = new BreakpointsModel();
    this.callstack = new CallstackModel();
    this.variables = new VariablesModel();
    this.sources = new SourcesModel({
      currentFrameChanged: this.callstack.currentFrameChanged
    });
    this.header = new SidebarHeaderModel();
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
   * The Sidebar header  model.
   */
  readonly header: SidebarHeaderModel;

  /**
   * A signal emitted when the debugger widget is disposed.
   */
  get disposed(): ISignal<this, void> {
    return this._disposed;
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
   * Dispose the model.
   */
  dispose(): void {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    this._disposed.emit();
  }

  /**
   * Clear the model.
   */
  clear() {
    this._stoppedThreads.clear();
    const breakpoints = new Map<string, IDebugger.IBreakpoint[]>();
    this.breakpoints.restoreBreakpoints(breakpoints);
    this.callstack.frames = [];
    this.variables.scopes = [];
    this.sources.currentSource = null;
    this.header.title = '-';
  }

  private _isDisposed = false;
  private _stoppedThreads = new Set<number>();
  private _disposed = new Signal<this, void>(this);
}
