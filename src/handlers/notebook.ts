// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Cell, CodeCell } from '@jupyterlab/cells';

import { IObservableMap, ObservableMap } from '@jupyterlab/observables';

import { Notebook, NotebookPanel } from '@jupyterlab/notebook';

import { IDisposable } from '@phosphor/disposable';

import { Signal } from '@phosphor/signaling';

import { EditorHandler } from './editor';

import { IDebugger } from '../tokens';

export class NotebookHandler implements IDisposable {
  constructor(options: NotebookHandler.IOptions) {
    this.debuggerService = options.debuggerService;
    this.notebookPanel = options.widget;
    this._cellMap = new ObservableMap<EditorHandler>();

    const notebook = this.notebookPanel.content;
    notebook.widgets.forEach(cell => this.addEditorHandler(cell));
    notebook.activeCellChanged.connect(this.onActiveCellChanged, this);
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
    if (cell.model.type !== 'code' || this._cellMap.has(cell.model.id)) {
      return;
    }
    const codeCell = cell as CodeCell;
    const editorHandler = new EditorHandler({
      debuggerService: this.debuggerService,
      editor: codeCell.editor
    });
    this._cellMap.set(cell.model.id, editorHandler);
  }

  protected onActiveCellChanged(notebook: Notebook, cell: Cell) {
    if (this.notebookPanel.content !== notebook) {
      return;
    }
    this.addEditorHandler(cell);
  }

  private debuggerService: IDebugger;
  private notebookPanel: NotebookPanel;
  private _cellMap: IObservableMap<EditorHandler> = null;
}

/**
 * A namespace for NotebookHandler statics.
 */
export namespace NotebookHandler {
  export interface IOptions {
    debuggerService: IDebugger;
    widget: NotebookPanel;
  }
}
