// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ISignal, Signal } from '@lumino/signaling';
import { IDebugger } from '../../tokens';
import { INotebookTracker } from '@jupyterlab/notebook';
import { isCodeCellModel } from '@jupyterlab/cells';
import { IConsoleTracker } from '@jupyterlab/console';

/**
 * A model for a list of breakpoints.
 */
export class BreakpointsModel implements IDebugger.Model.IBreakpoints {
  constructor(options: BreakpointsModel.IOptions) {
    this._config = options.config;
    this._notebookTracker = options.notebookTracker;
    this._consoleTracker = options.consoleTracker;
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
   *
   * @param breakpoints The map of breakpoints
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

        // console.log(codeId, breakpoint.source?.path, codeId === breakpoint.source?.path);

        if (codeId && codeId === breakpoint.source?.path) {
          if (isCodeCellModel(cell.model)) {
            // console.log(cell.model.executionCount);
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

    console.log(this._consoleTracker);

    this._consoleTracker?.forEach(panel => {
      console.log('hsjs');

      const kernelName = panel.sessionContext.session?.kernel?.name ?? '';
      panel.content.widgets.forEach(widget => {
        console.log(widget);

        const model = widget?.model;

        const code = model.sharedModel.getSource();
        const codeId = this._config?.getCodeId(code, kernelName);

        console.log(
          codeId,
          breakpoint.source?.path,
          codeId === breakpoint.source?.path
        );

        if (codeId && codeId === breakpoint.source?.path) {
          const executionCount = model.executionCount ?? null;
          const executionState = model.executionState ?? null;

          if (executionState === 'running') {
            display = `In [*]`;
          } else if (executionCount === null) {
            display = `In [ ]`;
          } else {
            display = `In [${executionCount}]`;
          }
        }
      });
    });

    return display;
  }

  private _config: IDebugger.IConfig;
  private _notebookTracker: INotebookTracker | null;
  private _consoleTracker: IConsoleTracker | null;
  private _breakpoints = new Map<string, IDebugger.IBreakpoint[]>();
  private _changed = new Signal<this, IDebugger.IBreakpoint[]>(this);
  private _restored = new Signal<this, void>(this);
  private _clicked = new Signal<this, IDebugger.IBreakpoint>(this);
  private _selectedBreakpoint: IDebugger.IBreakpoint;
  private _selectedChanged = new Signal<this, IDebugger.IBreakpoint>(this);
}

/**
 * Namespace for BreakpointsModel
 */
export namespace BreakpointsModel {
  /**
   * Instantiation options for a BreakpointsModel.
   */
  export interface IOptions {
    /**
     * Debugger configuration.
     */
    config: IDebugger.IConfig;

    /**
     * The notebook tracker.
     */
    notebookTracker: INotebookTracker | null;

    /**
     * The console tracker.
     */
    consoleTracker: IConsoleTracker | null;
  }
}
