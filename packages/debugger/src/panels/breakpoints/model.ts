// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ISignal, Signal } from '@lumino/signaling';
import { IDebugger } from '../../tokens';
import { INotebookTracker } from '@jupyterlab/notebook';
import { isCodeCellModel } from '@jupyterlab/cells';

/**
 * A model for a list of breakpoints.
 */
export class BreakpointsModel implements IDebugger.Model.IBreakpoints {
  constructor(
    private _config: IDebugger.IConfig,
    private _notebookTracker: INotebookTracker | null
  ) {}

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
   * Signal emitted when the selected breakpoint changes.
   */
  get selectedChanged(): Signal<this, IDebugger.IBreakpoint> {
    return this._selectedChanged;
  }

  /**
   * Get selected breakpoint
   */
  get selectedBreakpoint(): IDebugger.IBreakpoint {
    return this._selectedBreakpoint;
  }

  /**
   * Set selected breakpoint
   */
  set selectedBreakpoint(selected: IDebugger.IBreakpoint) {
    this._selectedBreakpoint = selected;
    this._selectedChanged.emit(selected);
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
   */
  restoreBreakpoints(breakpoints: Map<string, IDebugger.IBreakpoint[]>): void {
    this._breakpoints = breakpoints;
    this._restored.emit();
  }

  /**
   * Get a human-readable display string for a breakpoint.
   * Shows execution count if notebook cell, [*] if running, [ ] if never executed.
   */
  getDisplayName(breakpoint: IDebugger.IBreakpoint): string {
    if (!this._notebookTracker || !this._config) {
      return breakpoint.source?.path ?? '';
    }

    let display = breakpoint.source?.path ?? '';

    this._notebookTracker.forEach(panel => {
      const kernelName = panel.sessionContext.session?.kernel?.name ?? '';
      panel.content.widgets.forEach(cell => {
        if (cell.model.type !== 'code') return;

        const code = cell.model.sharedModel.getSource();
        const codeId = this._config?.getCodeId(code, kernelName);

        if (codeId && codeId === breakpoint.source?.path) {
          if (isCodeCellModel(cell.model)) {
            if (cell.model.executionState === 'running') {
              display = `Cell [*]`;
            } else if (cell.model.executionCount === null) {
              display = `Cell [ ]`;
            } else {
              display = `Cell [${cell.model.executionCount}]`;
            }
          }
        }
      });
    });

    console.log(display);

    return display;
  }

  private _breakpoints = new Map<string, IDebugger.IBreakpoint[]>();
  private _changed = new Signal<this, IDebugger.IBreakpoint[]>(this);
  private _restored = new Signal<this, void>(this);
  private _clicked = new Signal<this, IDebugger.IBreakpoint>(this);
  private _selectedBreakpoint: IDebugger.IBreakpoint;
  private _selectedChanged = new Signal<this, IDebugger.IBreakpoint>(this);
}
