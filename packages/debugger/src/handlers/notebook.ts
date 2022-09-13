// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Cell, CodeCell, ICellModel } from '@jupyterlab/cells';
import { NotebookPanel } from '@jupyterlab/notebook';
import {
  IObservableList,
  IObservableMap,
  ObservableMap
} from '@jupyterlab/observables';
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
    notebook.model!.cells.changed.connect(this._onCellsChanged, this);

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
    this._cellMap.values().forEach(handler => {
      handler.dispose();
      // Ensure to restore notebook editor settings
      handler.editor?.setOptions({
        ...this._notebookPanel.content.editorConfig.code
      });
    });
    this._cellMap.dispose();
    Signal.clearData(this);
  }

  /**
   * Handle a notebook cells changed event.
   */
  private _onCellsChanged(
    cells?: any,
    changes?: IObservableList.IChangedArgs<ICellModel>
  ): void {
    this._notebookPanel.content.widgets.forEach(cell =>
      this._addEditorHandler(cell)
    );

    if (changes?.type === 'move') {
      for (const cell of changes.newValues) {
        this._cellMap.get(cell.id)?.refreshBreakpoints();
      }
    }
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
    this._cellMap.set(cell.model.id, editorHandler);
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
