// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IConsoleTracker, CodeConsole } from '@jupyterlab/console';

import { CellManager } from '../handlers/cell';

import { CodeCell } from '@jupyterlab/cells';

import { Breakpoints } from '../breakpoints';

import { Debugger } from '../debugger';
import { IDisposable } from '@phosphor/disposable';
import { Signal } from '@phosphor/signaling';

export class DebuggerConsoleHandler implements IDisposable {
  constructor(options: DebuggerNotebookHandler.IOptions) {
    this.debuggerModel = options.debuggerModel;
    this.consoleTracker = options.consoleTracker;
    this.breakpoints = this.debuggerModel.sidebar.breakpoints.model;
    this.cellManager = new CellManager({
      activeCell: this.consoleTracker.currentWidget.console.promptCell,
      breakpointsModel: this.breakpoints,
      debuggerModel: this.debuggerModel,
      type: 'console'
    });
    this.consoleTracker.currentWidget.console.promptCellCreated.connect(
      this.promptCellCreated,
      this
    );
  }

  private consoleTracker: IConsoleTracker;
  private debuggerModel: Debugger.Model;
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
        type: 'console'
      });
    }
  }
}

export namespace DebuggerNotebookHandler {
  export interface IOptions {
    debuggerModel: Debugger.Model;
    consoleTracker: IConsoleTracker;
  }
}
