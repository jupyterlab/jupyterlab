// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  INotebookTracker,
  NotebookPanel,
  NotebookTracker
} from '@jupyterlab/notebook';

import { DebugSession } from './../session';

import { IClientSession } from '@jupyterlab/apputils';

import { CodeCell } from '@jupyterlab/cells';

import { CellManager } from './cell';

import { Debugger } from '../debugger';

import { Breakpoints } from '../breakpoints';

export class DebuggerNotebookHandler {
  constructor(options: DebuggerNotebookHandler.IOptions) {
    this.debuggerModel = options.debuggerModel;
    this.notebookTracker = options.notebookTracker;
    this.breakpoints = this.debuggerModel.sidebar.breakpoints.model;
    this.notebookTracker.currentChanged.connect(
      (sender, notebookPanel: NotebookPanel) => {
        const session = notebookPanel ? notebookPanel.session : null;
        this.newDebuggerSession(session, sender);
      }
    );
    this.debuggerModel.sessionChanged.connect(() => {
      const notebookPanel: NotebookPanel = this.notebookTracker.currentWidget;
      if (
        notebookPanel &&
        notebookPanel.session.name === this.debuggerModel.session.id
      ) {
        this.notebookTracker.activeCellChanged.connect(this.onNewCell, this);
        if (!this.cellManager) {
          this.cellManager = new CellManager({
            breakpointsModel: this.breakpoints,
            activeCell: this.notebookTracker.activeCell as CodeCell,
            debuggerModel: this.debuggerModel,
            type: 'notebook'
          });
        }
      }
    });
  }

  private notebookTracker: INotebookTracker;
  private debuggerModel: Debugger.Model;
  private breakpoints: Breakpoints.Model;
  private cellManager: CellManager;

  protected onNewCell(noteTracker: NotebookTracker, codeCell: CodeCell) {
    setTimeout(() => {
      if (this.cellManager) {
        this.cellManager.activeCell = codeCell;
        this.cellManager.onActiveCellChanged();
      } else {
        this.cellManager = new CellManager({
          breakpointsModel: this.breakpoints,
          activeCell: codeCell,
          debuggerModel: this.debuggerModel,
          type: 'notebook'
        });
      }
    });
  }

  protected newDebuggerSession(
    client: IClientSession | null,
    note: INotebookTracker
  ) {
    if (this.debuggerModel.session) {
      note.activeCellChanged.disconnect(this.onNewCell, this);
    }
    if (client) {
      const newSession = new DebugSession({
        client: client as IClientSession
      });
      this.debuggerModel.session = newSession;
    }
  }
}

export namespace DebuggerNotebookHandler {
  export interface IOptions {
    debuggerModel: Debugger.Model;
    notebookTracker: INotebookTracker;
  }
}
