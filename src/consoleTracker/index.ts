// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
// import { CodeCell } from '@jupyterlab/cells';

import {
  IConsoleTracker,
  ConsolePanel,
  CodeConsole
} from '@jupyterlab/console';
import { DebugSession } from '../session';
import { IClientSession, WidgetTracker } from '@jupyterlab/apputils';
import { BreakpointsService } from '../breakpointsService';
import { CellManager } from '../cellManeger';
import { CodeCell } from '@jupyterlab/cells';

export class DebuggerConsoleTracker {
  constructor(options: DebuggerNotebookTracker.IOptions) {
    this.breakpointService = options.breakpointService;
    this.consoleTracker = options.consoleTracker;

    this.consoleTracker.currentChanged.connect(
      (sender: WidgetTracker<ConsolePanel>, consolePanel: ConsolePanel) => {
        this.newDebuggerSession(consolePanel, sender);
      }
    );
  }

  consoleTracker: IConsoleTracker;
  debuggerSession: DebugSession;
  breakpointService: BreakpointsService;
  cellManager: CellManager;
  consoleSession: IClientSession | Boolean;
  previousConsole: ConsolePanel;

  protected newDebuggerSession(
    consolePanel: ConsolePanel,
    widgetTrack: WidgetTracker
  ) {
    console.log('current change');
    this.consoleSession = consolePanel ? consolePanel.session : false;
    if (this.debuggerSession) {
      this.debuggerSession.dispose();
      this.debuggerSession = new DebugSession({
        client: this.consoleSession as IClientSession
      });
      if (this.cellManager && this.previousConsole) {
        this.previousConsole.console.promptCellCreated.disconnect(
          this.promptCellCreated,
          this
        );
        if (consolePanel.console.promptCell) {
          this.cellManager.debuggerSessionId = this.debuggerSession.id;
          this.cellManager.previousCell = this.cellManager.activeCell;
          this.cellManager.activeCell = consolePanel.console.promptCell;
        }
      }
    } else {
      this.debuggerSession = new DebugSession({
        client: this.consoleSession as IClientSession
      });
    }

    if (this.consoleSession) {
      consolePanel.console.promptCellCreated.connect(
        this.promptCellCreated,
        this
      );
      this.previousConsole = consolePanel;
    }
  }

  protected promptCellCreated(sender: CodeConsole, update: CodeCell) {
    if (
      this.cellManager &&
      this.debuggerSession.id === (this.consoleSession as IClientSession).name
    ) {
      this.cellManager.previousCell = this.cellManager.activeCell;
      this.cellManager.activeCell = update;
    } else if (!this.cellManager) {
      this.cellManager = new CellManager({
        activeCell: update,
        breakpointService: this.breakpointService,
        sessionId: this.debuggerSession.id
      });
    }
  }
}

export namespace DebuggerNotebookTracker {
  export interface IOptions {
    consoleTracker: IConsoleTracker;
    breakpointService: BreakpointsService;
  }
}
