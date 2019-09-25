// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  INotebookTracker,
  NotebookPanel,
  NotebookTracker
} from '@jupyterlab/notebook';
// import { CodeCell } from '@jupyterlab/cells';
import { DebugSession } from './../session';
import { IClientSession } from '@jupyterlab/apputils';
import { BreakpointsService } from '../breakpointsService';
import { CodeCell } from '@jupyterlab/cells';
import { CellManager } from './cell';

export class DebuggerNotebookTracker {
  constructor(options: DebuggerNotebookTracker.IOptions) {
    this.breakpointService = options.breakpointService;
    this.notebookTracker = options.notebookTracker;

    this.notebookTracker.currentChanged.connect(
      (sender, notePanel: NotebookPanel) => {
        const session = notePanel ? notePanel.session : false;
        this.newDebuggerSession(session, sender);
      }
    );
  }

  notebookTracker: INotebookTracker;
  debuggerSession: DebugSession;
  breakpointService: BreakpointsService;
  cellManager: CellManager;

  protected onNewCell(noteTracker: NotebookTracker, codeCell: CodeCell) {
    setTimeout(() => {
      if (this.cellManager) {
        this.cellManager.debuggerSession = this.debuggerSession;
        this.cellManager.activeCell = codeCell;
        this.cellManager.onActiveCellChanged();
      } else {
        const options: CellManager.IOptions = {
          breakpointService: this.breakpointService,
          activeCell: codeCell,
          session: this.debuggerSession
        };
        this.cellManager = new CellManager(options);
      }
    });
  }

  protected newDebuggerSession(
    client: IClientSession | Boolean,
    note: INotebookTracker
  ) {
    if (this.debuggerSession) {
      this.debuggerSession.dispose();
      note.activeCellChanged.disconnect(this.onNewCell, this);
    }
    // create new session. Just changing client make sometimes that kernel is not attach to note
    if (client) {
      this.debuggerSession = new DebugSession({
        client: client as IClientSession
      });
      note.activeCellChanged.connect(this.onNewCell, this);
    }
  }
}

export namespace DebuggerNotebookTracker {
  export interface IOptions {
    notebookTracker: INotebookTracker;
    breakpointService: BreakpointsService;
  }
}
