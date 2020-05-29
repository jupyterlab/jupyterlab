// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IDisposable } from '@lumino/disposable';

import { ISignal, Signal } from '@lumino/signaling';

import { IDebugger } from '../tokens';

/**
 * A model for a list of breakpoints.
 */
export class BreakpointsModel implements IDisposable {
  /**
   * Set extra path for save path before for ex. typing
   */
  get oldPathFromCell(): Map<string, string> {
    return this._oldPathFromCell;
  }

  /**
   * Whether the model is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Signal emitted when the model changes.
   */
  get changed(): ISignal<this, IDebugger.IBreakpoint[]> {
    return this._changed;
  }

  /**
   * Signal emitted when the breakpoints are restored.
   */
  get restored(): Signal<this, void> {
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
   * Dispose the model.
   */
  dispose(): void {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    Signal.clearData(this);
  }

  /**
   * Remove breakpoints which are removed.
   * That is, if path has empty array
   *
   */
  cleanBreakpointsMapAboutEmptyArray(): void {
    Array.from(this._breakpoints.entries()).forEach(value => {
      if (value[1].length === 0) {
        this._breakpoints.delete(value[0]);
      }
    });
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

  private _isDisposed = false;
  private _oldPathFromCell = new Map<string, string>();
  private _breakpoints = new Map<string, IDebugger.IBreakpoint[]>();
  private _changed = new Signal<this, IDebugger.IBreakpoint[]>(this);
  private _restored = new Signal<this, void>(this);
  private _clicked = new Signal<this, IDebugger.IBreakpoint>(this);
}

/**
 * Class for map states of current cell event and temporary id of cell
 */
export class States {
  /**
   * Constructor for initialize state
   *
   * @param idCell - Temporary idCell
   * @param codeChanged - Flag for event when something happen with cell
   */
  constructor(idCell?: string, codeChanged?: boolean) {
    this._idCell = idCell;
    this._codeChanged = codeChanged;
  }

  /**
   * Get temporary cell's id
   */
  get idCell(): string {
    return this._idCell;
  }

  /**
   * Set temporary cell's id
   *
   * @param idCell
   */
  set idCell(idCell: string) {
    this._idCell = idCell;
  }
  /**
   * Get get event flag if something has been changed in cell
   */
  get codeChanged(): boolean {
    return this._codeChanged;
  }

  /**
   * Set get event flag if something has been changed in cell
   */
  set codeChanged(value: boolean) {
    this._codeChanged = value;
  }

  private _idCell?: string;
  private _codeChanged?: boolean;
}
