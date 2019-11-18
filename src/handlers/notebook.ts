// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { INotebookTracker, NotebookTracker } from '@jupyterlab/notebook';

import { CodeCell } from '@jupyterlab/cells';

import { IDisposable } from '@phosphor/disposable';

import { Signal } from '@phosphor/signaling';

import { Breakpoints } from '../breakpoints';

import { Debugger } from '../debugger';

import { IDebugger } from '../tokens';

import { Callstack } from '../callstack';

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

    this.debuggerModel.callstackModel.currentFrameChanged.connect(
      (_, frame) => {
        this.showCurrentLine(frame);
      }
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
    if (notebookTracker.currentWidget.id !== this.id) {
      return;
    }
    // TODO: do we need this requestAnimationFrame?
    requestAnimationFrame(() => {
      this.cellManager.activeCell = codeCell;
    });
  }

  private showCurrentLine(frame: Callstack.IFrame) {
    const notebook = this.notebookTracker.currentWidget;
    if (!notebook) {
      return;
    }

    const cells = notebook.content.widgets;
    cells.forEach(cell => CellManager.cleanupHighlight(cell));

    if (!frame) {
      return;
    }

    cells.forEach(cell => {
      // check the event is for the correct cell
      const code = cell.model.value.text;
      const cellId = this.debuggerService.getCellId(code);
      if (frame.source.path !== cellId) {
        return;
      }
      CellManager.showCurrentLine(cell, frame);
    });
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
