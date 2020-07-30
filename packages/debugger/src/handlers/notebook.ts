// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Cell, CodeCell } from '@jupyterlab/cells';

import { IObservableMap, ObservableMap } from '@jupyterlab/observables';

import { Notebook, NotebookPanel } from '@jupyterlab/notebook';

import { IDisposable } from '@lumino/disposable';

import { Signal } from '@lumino/signaling';

import { IDebugger } from '../tokens';

import { EditorHandler } from './editor';

/**
 * A handler for notebooks.
 */
export class NotebookHandler implements IDisposable {
  /**
   * Instantiate a new NotebookHandler.
   *
   * @param options The instantiation options for a NotebookHandler.
   */
  constructor(options: NotebookHandler.IOptions) {
    this._debuggerService = options.debuggerService;
    this._notebookPanel = options.widget;
    this._cellMap = new ObservableMap<EditorHandler>();

    const notebook = this._notebookPanel.content;
    notebook.activeCellChanged.connect(this._onActiveCellChanged, this);
    notebook.model?.cells.changed.connect(this._onCellsChanged, this);

    this._onCellsChanged();
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
   * Handle a notebook cells changed event.
   */
  private _onCellsChanged(): void {
    this._notebookPanel.content.widgets.forEach(cell =>
      this._addEditorHandler(cell)
    );
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
      editor: codeCell.editor
    });
    codeCell.disposed.connect(() => {
      this._cellMap.delete(modelId);
      editorHandler.dispose();
    });
    this._cellMap.set(cell.model.id, editorHandler);
  }

  /**
   * Handle a new active cell.
   *
   * @param notebook The notebook for which the active cell has changed.
   * @param cell The new active cell.
   */
  private _onActiveCellChanged(notebook: Notebook, cell: Cell): void {
    if (this._notebookPanel.content !== notebook) {
      return;
    }
    this._addEditorHandler(cell);
  }

  private _debuggerService: IDebugger;
  private _notebookPanel: NotebookPanel;
  private _cellMap: IObservableMap<EditorHandler>;
}

/**
 * A namespace for NotebookHandler statics.
 */
export namespace NotebookHandler {
  /**
   * Instantiation options for `NotebookHandler`.
   */
  export interface IOptions {
    /**
     * The debugger service.
     */
    debuggerService: IDebugger;

    /**
     * The widget to handle.
     */
    widget: NotebookPanel;
  }
}
