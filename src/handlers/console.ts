// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { CodeConsole, IConsoleTracker } from '@jupyterlab/console';

import { CodeCell } from '@jupyterlab/cells';

import { IDisposable } from '@phosphor/disposable';

import { Signal } from '@phosphor/signaling';

import { EditorHandler } from '../handlers/editor';

import { Debugger } from '../debugger';

import { IDebugger } from '../tokens';

export class ConsoleHandler implements IDisposable {
  constructor(options: DebuggerConsoleHandler.IOptions) {
    this.debuggerModel = options.debuggerService.model as Debugger.Model;
    this.debuggerService = options.debuggerService;
    this.consoleTracker = options.tracker;

    const promptCell = this.consoleTracker.currentWidget.console.promptCell;
    this.editorHandler = new EditorHandler({
      debuggerModel: this.debuggerModel,
      debuggerService: this.debuggerService,
      editor: promptCell.editor
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
    // TODO: check if the previous editor must be disposed
    // for the console
  }

  private consoleTracker: IConsoleTracker;
  private debuggerModel: Debugger.Model;
  private debuggerService: IDebugger;
  private editorHandler: EditorHandler;
}

export namespace DebuggerConsoleHandler {
  export interface IOptions {
    debuggerService: IDebugger;
    tracker: IConsoleTracker;
  }
}
