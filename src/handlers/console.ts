// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { CodeConsole, ConsolePanel } from '@jupyterlab/console';

import { Cell, CodeCell } from '@jupyterlab/cells';

import { IObservableMap, ObservableMap } from '@jupyterlab/observables';

import { each } from '@phosphor/algorithm';

import { IDisposable } from '@phosphor/disposable';

import { Signal } from '@phosphor/signaling';

import { EditorHandler } from '../handlers/editor';

import { IDebugger } from '../tokens';

export class ConsoleHandler implements IDisposable {
  constructor(options: DebuggerConsoleHandler.IOptions) {
    this.debuggerService = options.debuggerService;
    this.consolePanel = options.widget;
    this._cellMap = new ObservableMap<EditorHandler>();

    const codeConsole = this.consolePanel.console;

    this.addEditorHandler(codeConsole.promptCell);
    codeConsole.promptCellCreated.connect((_: CodeConsole, cell: CodeCell) => {
      this.addEditorHandler(cell);
    });

    const addHandlers = () => {
      each(codeConsole.cells, cell => this.addEditorHandler(cell));
    };
    addHandlers();
    this.consolePanel.console.cells.changed.connect(addHandlers);
  }

  isDisposed: boolean;

  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this.isDisposed = true;
    this._cellMap.values().forEach(handler => handler.dispose());
    this._cellMap.dispose();
    Signal.clearData(this);
  }

  protected addEditorHandler(cell: Cell) {
    const modelId = cell.model.id;
    if (cell.model.type !== 'code' || this._cellMap.has(modelId)) {
      return;
    }
    const codeCell = cell as CodeCell;
    const editorHandler = new EditorHandler({
      debuggerService: this.debuggerService,
      editor: codeCell.editor
    });
    codeCell.disposed.connect(() => {
      this._cellMap.delete(modelId);
      editorHandler.dispose();
    });
    this._cellMap.set(modelId, editorHandler);
  }

  private consolePanel: ConsolePanel;
  private debuggerService: IDebugger;
  private _cellMap: IObservableMap<EditorHandler> = null;
}

export namespace DebuggerConsoleHandler {
  export interface IOptions {
    debuggerService: IDebugger;
    widget: ConsolePanel;
  }
}
