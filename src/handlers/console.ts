// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IConsoleTracker, CodeConsole } from '@jupyterlab/console';

import { CellManager } from '../handlers/cell';

import { CodeCell } from '@jupyterlab/cells';

import { Breakpoints } from '../breakpoints';

import { IDebugger } from '../tokens';

import { Debugger } from '../debugger';
import { IDisposable } from '@phosphor/disposable';
import { Signal } from '@phosphor/signaling';

export class DebuggerConsoleHandler implements IDisposable {
  constructor(options: DebuggerConsoleHandler.IOptions) {
    this.debuggerModel = options.debuggerModel;
    this.consoleTracker = options.tracker;
    this.breakpoints = this.debuggerModel.breakpointsModel;
    this.cellManager = new CellManager({
      activeCell: this.consoleTracker.currentWidget.console.promptCell,
      breakpointsModel: this.breakpoints,
      debuggerModel: this.debuggerModel,
      debuggerService: this.debuggerService,
      type: 'console'
    });
    this.consoleTracker.currentWidget.console.promptCellCreated.connect(
      this.promptCellCreated,
      this
    );
  }

  private consoleTracker: IConsoleTracker;
  private debuggerModel: Debugger.Model;
  private debuggerService: IDebugger.IService;
  private breakpoints: Breakpoints.Model;
  private cellManager: CellManager;
  isDisposed: boolean;

  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this.isDisposed = true;
    this.cellManager.dispose();
    Signal.clearData(this);
  }

  protected promptCellCreated(sender: CodeConsole, update: CodeCell) {
    if (this.cellManager) {
      this.cellManager.previousCell = this.cellManager.activeCell;
      this.cellManager.activeCell = update;
    } else if (!this.cellManager) {
      this.cellManager = new CellManager({
        activeCell: update,
        breakpointsModel: this.breakpoints,
        debuggerModel: this.debuggerModel,
        debuggerService: this.debuggerService,
        type: 'console'
      });
    }
  }
}

export namespace DebuggerConsoleHandler {
  export interface IOptions {
    debuggerModel: Debugger.Model;
    debuggerService: IDebugger.IService;
    tracker: IConsoleTracker;
  }
}
