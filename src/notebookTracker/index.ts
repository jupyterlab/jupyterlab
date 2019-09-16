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
import { CellManager } from '../cellManeger';

export class DebuggerNotebookTracker {
  constructor(options: DebuggerNotebookTracker.IOptions) {
    this.breakpointService = options.breakpointService;
    this.notebookTracker = options.notebookTracker;

    this.notebookTracker.currentChanged.connect(
      (sender, notePanel: NotebookPanel) => {
        this.newDebuggerSession(notePanel.session, sender);
      }
    );
  }

  notebookTracker: INotebookTracker;
  debuggerSession: DebugSession;
  breakpointService: BreakpointsService;
  cellManager: CellManager;

  protected test(noteTracker: NotebookTracker, codeCell: CodeCell) {
    setTimeout(() => {
      if (this.cellManager) {
        this.cellManager.debuggerSessionId = this.debuggerSession.id;
        this.cellManager.activeCell = codeCell;
        this.cellManager.onActiveCellChanged();
      } else {
        const options: CellManager.IOptions = {
          breakpointService: this.breakpointService,
          activeCell: codeCell,
          sessionId: this.debuggerSession.id
        };
        this.cellManager = new CellManager(options);
      }
      // console.log('active cell changed', this);
    });
  }

  protected newDebuggerSession(client: IClientSession, note: INotebookTracker) {
    if (this.debuggerSession) {
      this.debuggerSession.dispose();
      note.activeCellChanged.disconnect(this.test, this);
    }
    // create new session. Just changing client make sometimes that kernel is not attach to note
    this.debuggerSession = new DebugSession({
      client: client
    });

    note.activeCellChanged.connect(this.test, this);
  }
}

export namespace DebuggerNotebookTracker {
  export interface IOptions {
    notebookTracker: INotebookTracker;
    breakpointService: BreakpointsService;
  }
}
