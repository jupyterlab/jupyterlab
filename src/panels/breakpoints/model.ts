// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ISignal, Signal } from '@lumino/signaling';

import { IDebugger } from '../../tokens';

/**
 * A model for a list of breakpoints.
 */
export class BreakpointsModel implements IDebugger.Model.IBreakpoints {
  /**
   * Signal emitted when the model changes.
   */
  get changed(): ISignal<this, IDebugger.IBreakpoint[]> {
    return this._changed;
  }

  /**
   * Signal emitted when the breakpoints are restored.
   */
  get restored(): ISignal<this, void> {
    return this._restored;
  }

  /**
   * Signal emitted when a breakpoint is clicked.
   */
  get clicked(): Signal<this, IDebugger.IBreakpoint> {
    return this._clicked;
  }

  /**
   * Get all the breakpoints.
   */
  get breakpoints(): Map<string, IDebugger.IBreakpoint[]> {
    return this._breakpoints;
  }

  /**
   * Set the breakpoints for a given id (path).
   *
   * @param id The code id (path).
   * @param breakpoints The list of breakpoints.
   */
  setBreakpoints(id: string, breakpoints: IDebugger.IBreakpoint[]): void {
    this._breakpoints.set(id, breakpoints);
    this._changed.emit(breakpoints);
  }

  /**
   * Get the breakpoints for a given id (path).
   *
   * @param id The code id (path).
   */
  getBreakpoints(id: string): IDebugger.IBreakpoint[] {
    return this._breakpoints.get(id) ?? [];
  }

  /**
   * Restore a map of breakpoints.
   *
   * @param breakpoints The map of breakpoints
   */
  restoreBreakpoints(breakpoints: Map<string, IDebugger.IBreakpoint[]>): void {
    this._breakpoints = breakpoints;
    this._restored.emit();
  }

  private _breakpoints = new Map<string, IDebugger.IBreakpoint[]>();
  private _changed = new Signal<this, IDebugger.IBreakpoint[]>(this);
  private _restored = new Signal<this, void>(this);
  private _clicked = new Signal<this, IDebugger.IBreakpoint>(this);
}
