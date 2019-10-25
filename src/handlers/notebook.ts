// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { INotebookTracker, NotebookTracker } from '@jupyterlab/notebook';

import { CodeCell } from '@jupyterlab/cells';

import { CellManager } from './cell';

import { Debugger } from '../debugger';

import { IDebugger } from '../tokens';

import { Breakpoints } from '../breakpoints';

import { IDisposable } from '@phosphor/disposable';

import { Signal } from '@phosphor/signaling';

export class DebuggerNotebookHandler implements IDisposable {
  constructor(options: DebuggerNotebookHandler.IOptions) {
    this.debuggerModel = options.debuggerModel;
    this.debuggerService = options.debuggerService;
    this.notebookTracker = options.tracker;
    this.breakpoints = this.debuggerModel.sidebar.breakpoints.model;
    this.notebookTracker.activeCellChanged.connect(this.onNewCell, this);
    this.cellManager = new CellManager({
      breakpointsModel: this.breakpoints,
      activeCell: this.notebookTracker.activeCell as CodeCell,
      debuggerModel: this.debuggerModel,
      debuggerService: this.debuggerService,
      type: 'notebook'
    });
  }

  private notebookTracker: INotebookTracker;
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
    this.notebookTracker.activeCellChanged.disconnect(this.onNewCell);
    Signal.clearData(this);
  }

  protected onNewCell(noteTracker: NotebookTracker, codeCell: CodeCell) {
    if (this.cellManager) {
      this.cellManager.activeCell = codeCell;
    } else {
      this.cellManager = new CellManager({
        breakpointsModel: this.breakpoints,
        activeCell: codeCell,
        debuggerModel: this.debuggerModel,
        debuggerService: this.debuggerService,
        type: 'notebook'
      });
    }
  }
}

export namespace DebuggerNotebookHandler {
  export interface IOptions {
    debuggerModel: Debugger.Model;
    debuggerService: IDebugger.IService;
    tracker: INotebookTracker;
  }
}
