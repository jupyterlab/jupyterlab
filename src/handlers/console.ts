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
    this.debuggerModel = options.debuggerModel;
    this.consoleTracker = options.consoleTracker;
    this.breakpoints = this.debuggerModel.sidebar.breakpoints.model;
    this.consoleTracker.currentChanged.connect(
      (sender: WidgetTracker<ConsolePanel>, consolePanel: ConsolePanel) => {
        this.newDebuggerSession(consolePanel);
      }
    );
    this.debuggerModel.sessionChanged.connect(() => {
      const consolePanel: ConsolePanel = this.consoleTracker.currentWidget;
      if (
        consolePanel &&
        consolePanel.session.name === this.debuggerModel.session.id
      ) {
        if (!this.cellManager) {
          consolePanel.console.promptCellCreated.connect(
            this.promptCellCreated,
            this
          );
          this.previousConsole = consolePanel;
          this.cellManager = new CellManager({
            breakpointsModel: this.breakpoints,
            activeCell: consolePanel.console.promptCell as CodeCell,
            debuggerModel: this.debuggerModel,
            type: 'notebook'
          });
        }
      }
    });
  }

  private consoleTracker: IConsoleTracker;
  private debuggerModel: Debugger.Model;
  private breakpoints: Breakpoints.Model;
  private cellManager: CellManager;
  private previousConsole: ConsolePanel;

  protected newDebuggerSession(consolePanel: ConsolePanel) {
    const session = consolePanel ? consolePanel.session : null;
    if (this.debuggerModel.session && session) {
      const newSession = new DebugSession({
        client: session as IClientSession
      });
      this.debuggerModel.session = newSession;
      if (this.cellManager && this.previousConsole) {
        this.previousConsole.console.promptCellCreated.disconnect(
          this.promptCellCreated,
          this
        );
        if (consolePanel.console.promptCell) {
          this.cellManager.previousCell = this.cellManager.activeCell;
          this.cellManager.activeCell = consolePanel.console.promptCell;
        }
      }
    } else if (session) {
      const newSession = new DebugSession({
        client: session as IClientSession
      });
      this.debuggerModel.session = newSession;
    }

    if (session) {
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
      this.debuggerModel.session.id ===
        (this.consoleTracker.currentWidget.session as IClientSession).name
    ) {
      this.cellManager.previousCell = this.cellManager.activeCell;
      this.cellManager.activeCell = update;
    } else if (!this.cellManager) {
      this.cellManager = new CellManager({
        activeCell: update,
        breakpointsModel: this.breakpoints,
        debuggerModel: this.debuggerModel,
        type: 'console'
      });
    }
  }
}

export namespace DebuggerNotebookHandler {
  export interface IOptions {
    debuggerModel: Debugger.Model;
    consoleTracker: IConsoleTracker;
  }
}
