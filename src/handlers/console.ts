// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { CodeConsole, IConsoleTracker } from '@jupyterlab/console';

import { CodeCell } from '@jupyterlab/cells';

import { IDisposable } from '@phosphor/disposable';

import { Signal } from '@phosphor/signaling';

import { Breakpoints } from '../breakpoints';

import { EditorHandler } from '../handlers/editor';

import { IDebugger } from '../tokens';

import { Debugger } from '../debugger';

export class ConsoleHandler implements IDisposable {
  constructor(options: DebuggerConsoleHandler.IOptions) {
    this.debuggerModel = options.debuggerService.model;
    this.debuggerService = options.debuggerService;
    this.consoleTracker = options.tracker;
    this.breakpoints = this.debuggerModel.breakpointsModel;
    this.editorHandler = new EditorHandler({
      activeCell: this.consoleTracker.currentWidget.console.promptCell,
      breakpointsModel: this.breakpoints,
      debuggerModel: this.debuggerModel,
      debuggerService: this.debuggerService
    });
    this.consoleTracker.currentWidget.console.promptCellCreated.connect(
      this.promptCellCreated,
      this
    );
  }

  isDisposed: boolean;

  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this.isDisposed = true;
    this.editorHandler.dispose();
    Signal.clearData(this);
  }

  protected promptCellCreated(sender: CodeConsole, update: CodeCell) {
    this.editorHandler.previousCell = this.editorHandler.activeCell;
    this.editorHandler.activeCell = update;
  }

  private consoleTracker: IConsoleTracker;
  private debuggerModel: Debugger.Model;
  private debuggerService: IDebugger;
  private breakpoints: Breakpoints.Model;
  private editorHandler: EditorHandler;
}

export namespace DebuggerConsoleHandler {
  export interface IOptions {
    debuggerService: IDebugger;
    tracker: IConsoleTracker;
  }
}
