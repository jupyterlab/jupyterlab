// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { INotebookTracker, NotebookTracker } from '@jupyterlab/notebook';

import { CodeCell } from '@jupyterlab/cells';

import { IDisposable } from '@phosphor/disposable';

import { Signal } from '@phosphor/signaling';

import { Breakpoints } from '../breakpoints';

import { Debugger } from '../debugger';

import { IDebugger } from '../tokens';

import { CellManager } from './cell';

export class NotebookHandler implements IDisposable {
  constructor(options: NotebookHandler.IOptions) {
    this.debuggerModel = options.debuggerService.model;
    this.debuggerService = options.debuggerService;
    this.notebookTracker = options.tracker;
    this.id = options.id;
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
    Signal.clearData(this);
  }

  protected onActiveCellChanged(
    notebookTracker: NotebookTracker,
    codeCell: CodeCell
  ) {
    if (notebookTracker.currentWidget.id === this.id) {
      requestAnimationFrame(() => {
        this.cellManager.activeCell = codeCell;
      });
    }
  }

  private notebookTracker: INotebookTracker;
  private debuggerModel: Debugger.Model;
  private debuggerService: IDebugger;
  private breakpoints: Breakpoints.Model;
  private cellManager: CellManager;
  private id: string;
}

export namespace NotebookHandler {
  export interface IOptions {
    debuggerService: IDebugger;
    tracker: INotebookTracker;
    id?: string;
  }
}
