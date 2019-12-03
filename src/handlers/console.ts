// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { CodeConsole, ConsolePanel } from '@jupyterlab/console';

import { CodeCell } from '@jupyterlab/cells';

import { IDisposable } from '@phosphor/disposable';

import { Signal } from '@phosphor/signaling';

import { EditorHandler } from '../handlers/editor';

import { IDebugger } from '../tokens';

export class ConsoleHandler implements IDisposable {
  constructor(options: DebuggerConsoleHandler.IOptions) {
    this.debuggerService = options.debuggerService;
    this.consolePanel = options.widget;

    const promptCell = this.consolePanel.console.promptCell;
    this.editorHandler = new EditorHandler({
      debuggerService: this.debuggerService,
      editor: promptCell.editor
    });

    this.consolePanel.console.promptCellCreated.connect(
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

  private consolePanel: ConsolePanel;
  private debuggerService: IDebugger;
  private editorHandler: EditorHandler;
}

export namespace DebuggerConsoleHandler {
  export interface IOptions {
    debuggerService: IDebugger;
    widget: ConsolePanel;
  }
}
