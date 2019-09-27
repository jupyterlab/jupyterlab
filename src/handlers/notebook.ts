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
import { CodeCell } from '@jupyterlab/cells';
import { CellManager } from './cell';
import { Debugger } from '../debugger';
import { Breakpoints } from '../breakpoints';

export class DebuggerNotebookHandler {
  constructor(options: DebuggerNotebookHandler.IOptions) {
    this.debugger = options.debugger;
    this.notebookTracker = options.notebookTracker;
    this.breakpoints = this.debugger.sidebar.breakpoints.model;
    this.notebookTracker.currentChanged.connect(
      (sender, notePanel: NotebookPanel) => {
        const session = notePanel ? notePanel.session : false;
        this.newDebuggerSession(session, sender);
      }
    );
  }

  notebookTracker: INotebookTracker;
  debugger: Debugger;
  debuggerSession: DebugSession;
  breakpoints: Breakpoints.Model;
  cellManager: CellManager;

  protected onNewCell(noteTracker: NotebookTracker, codeCell: CodeCell) {
    setTimeout(() => {
      if (this.cellManager) {
        this.cellManager.debuggerSession = this.debuggerSession;
        this.cellManager.activeCell = codeCell;
        this.cellManager.onActiveCellChanged();
      } else {
        const options: CellManager.IOptions = {
          breakpoints: this.breakpoints,
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
      this.debugger.model.session.dispose();
      note.activeCellChanged.disconnect(this.onNewCell, this);
    }
    if (client) {
      this.debuggerSession = new DebugSession({
        client: client as IClientSession
      });
      this.debugger.model.session = this.debuggerSession;
      note.activeCellChanged.connect(this.onNewCell, this);
    }
  }
}

export namespace DebuggerNotebookHandler {
  export interface IOptions {
    debugger: Debugger;
    notebookTracker: INotebookTracker;
  }
}
