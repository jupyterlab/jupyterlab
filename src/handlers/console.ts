// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IConsoleTracker,
  ConsolePanel,
  CodeConsole
} from '@jupyterlab/console';

import { DebugSession } from '../session';

import { IClientSession, WidgetTracker } from '@jupyterlab/apputils';

import { CellManager } from '../handlers/cell';

import { CodeCell } from '@jupyterlab/cells';

import { Breakpoints } from '../breakpoints';

import { Debugger } from '../debugger';

export class DebuggerConsoleHandler {
  constructor(options: DebuggerNotebookHandler.IOptions) {
    this.debugger = options.debugger;
    this.consoleTracker = options.consoleTracker;
    this.breakpoints = this.debugger.model.sidebar.breakpoints.model;
    this.consoleTracker.currentChanged.connect(
      (sender: WidgetTracker<ConsolePanel>, consolePanel: ConsolePanel) => {
        this.newDebuggerSession(consolePanel, sender);
      }
    );
  }

  private consoleTracker: IConsoleTracker;
  private debuggerSession: DebugSession;
  private debugger: Debugger;
  private breakpoints: Breakpoints.Model;
  private cellManager: CellManager;
  private consoleSession: IClientSession | null;
  private previousConsole: ConsolePanel;

  protected newDebuggerSession(
    consolePanel: ConsolePanel,
    widgetTrack: WidgetTracker
  ) {
    this.consoleSession = consolePanel ? consolePanel.session : null;
    if (this.debuggerSession && this.consoleSession) {
      this.debugger.model.session.dispose();
      this.debuggerSession = new DebugSession({
        client: this.consoleSession as IClientSession
      });
      this.debugger.model.session = this.debuggerSession;
      if (this.cellManager && this.previousConsole) {
        this.previousConsole.console.promptCellCreated.disconnect(
          this.promptCellCreated,
          this
        );
        if (consolePanel.console.promptCell) {
          this.cellManager.debuggerSession = this.debuggerSession;
          this.cellManager.previousCell = this.cellManager.activeCell;
          this.cellManager.activeCell = consolePanel.console.promptCell;
        }
      }
    } else if (this.consoleSession) {
      this.debuggerSession = new DebugSession({
        client: this.consoleSession as IClientSession
      });
      this.debugger.model.session = this.debuggerSession;
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
        breakpointsModel: this.breakpoints,
        session: this.debuggerSession,
        type: 'console'
      });
    }
  }
}

export namespace DebuggerNotebookHandler {
  export interface IOptions {
    debugger: Debugger;
    consoleTracker: IConsoleTracker;
  }
}
