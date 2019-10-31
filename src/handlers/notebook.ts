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
    this.debuggerModel = options.debuggerService.model;
    this.debuggerService = options.debuggerService;
    this.notebookTracker = options.tracker;
    this.breakpoints = this.debuggerModel.breakpointsModel;

    this.cellManager = new CellManager({
      breakpointsModel: this.breakpoints,
      debuggerModel: this.debuggerModel,
      debuggerService: this.debuggerService,
      type: 'notebook',
      activeCell: this.notebookTracker.activeCell as CodeCell
    });

    this.notebookTracker.activeCellChanged.connect(
      this.onActiveCellChanged,
      this
    );
  }

  isDisposed: boolean;

  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this.isDisposed = true;
    this.cellManager.dispose();
    this.notebookTracker.activeCellChanged.disconnect(
      this.onActiveCellChanged,
      this
    );
    Signal.clearData(this);
  }

  protected onActiveCellChanged(
    notebookTracker: NotebookTracker,
    codeCell: CodeCell
  ) {
    this.cellManager.activeCell = codeCell;
  }

  private notebookTracker: INotebookTracker;
  private debuggerModel: Debugger.Model;
  private debuggerService: IDebugger;
  private breakpoints: Breakpoints.Model;
  private cellManager: CellManager;
}

export namespace DebuggerNotebookHandler {
  export interface IOptions {
    debuggerService: IDebugger;
    tracker: INotebookTracker;
  }
}
