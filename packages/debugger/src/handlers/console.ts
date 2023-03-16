// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { CodeConsole, ConsolePanel } from '@jupyterlab/console';

import { Cell, CodeCell } from '@jupyterlab/cells';

import { IObservableMap, ObservableMap } from '@jupyterlab/observables';

import { IDisposable } from '@lumino/disposable';

import { Signal } from '@lumino/signaling';

import { EditorHandler } from '../handlers/editor';

import { IDebugger } from '../tokens';

/**
 * A handler for consoles.
 */
export class ConsoleHandler implements IDisposable {
  /**
   * Instantiate a new ConsoleHandler.
   *
   * @param options The instantiation options for a ConsoleHandler.
   */
  constructor(options: ConsoleHandler.IOptions) {
    this._debuggerService = options.debuggerService;
    this._consolePanel = options.widget;
    this._cellMap = new ObservableMap<EditorHandler>();

    const codeConsole = this._consolePanel.console;

    if (codeConsole.promptCell) {
      this._addEditorHandler(codeConsole.promptCell);
    }
    codeConsole.promptCellCreated.connect((_: CodeConsole, cell: CodeCell) => {
      this._addEditorHandler(cell);
    });

    const addHandlers = (): void => {
      for (const cell of codeConsole.cells) {
        this._addEditorHandler(cell);
      }
    };
    addHandlers();
    this._consolePanel.console.cells.changed.connect(addHandlers);
  }

  /**
   * Whether the handler is disposed.
   */
  isDisposed: boolean;

  /**
   * Dispose the handler.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this.isDisposed = true;
    this._cellMap.values().forEach(handler => handler.dispose());
    this._cellMap.dispose();
    Signal.clearData(this);
  }

  /**
   * Add a new editor handler for the given cell.
   *
   * @param cell The cell to add the handler to.
   */
  private _addEditorHandler(cell: Cell): void {
    const modelId = cell.model.id;
    if (cell.model.type !== 'code' || this._cellMap.has(modelId)) {
      return;
    }
    const codeCell = cell as CodeCell;
    const editorHandler = new EditorHandler({
      debuggerService: this._debuggerService,
      editorReady: async () => {
        await codeCell.ready;
        return codeCell.editor!;
      },
      getEditor: () => codeCell.editor,
      src: cell.model.sharedModel
    });
    codeCell.disposed.connect(() => {
      this._cellMap.delete(modelId);
      editorHandler.dispose();
    });
    this._cellMap.set(modelId, editorHandler);
  }

  private _consolePanel: ConsolePanel;
  private _debuggerService: IDebugger;
  private _cellMap: IObservableMap<EditorHandler>;
}

/**
 * A namespace for ConsoleHandler `statics`.
 */
export namespace ConsoleHandler {
  /**
   * Instantiation options for `ConsoleHandler`.
   */
  export interface IOptions {
    /**
     * The debugger service.
     */
    debuggerService: IDebugger;

    /**
     * The widget to handle.
     */
    widget: ConsolePanel;
  }
}
