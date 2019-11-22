// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { CodeCell } from '@jupyterlab/cells';

import {
  INotebookTracker,
  NotebookPanel,
  NotebookTracker
} from '@jupyterlab/notebook';

import { IDisposable } from '@phosphor/disposable';

import { Signal } from '@phosphor/signaling';

import { Callstack } from '../callstack';

import { Debugger } from '../debugger';

import { EditorHandler } from './editor';

import { IDebugger } from '../tokens';

export class NotebookHandler implements IDisposable {
  constructor(options: NotebookHandler.IOptions) {
    this.debuggerModel = options.debuggerService.model as Debugger.Model;
    this.debuggerService = options.debuggerService;
    this.notebookTracker = options.tracker;
    this.notebookPanel = this.notebookTracker.currentWidget;

    this.id = options.id;

    const activeCell = this.notebookTracker.activeCell;
    this.editorHandler = new EditorHandler({
      debuggerModel: this.debuggerModel,
      debuggerService: this.debuggerService,
      editor: activeCell.editor
    });

    this.notebookTracker.activeCellChanged.connect(
      this.onActiveCellChanged,
      this
    );

    this.debuggerModel.callstackModel.currentFrameChanged.connect(
      this.onCurrentFrameChanged,
      this
    );
  }

  isDisposed: boolean;

  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this.isDisposed = true;
    this.cleanAllCells();
    this.editorHandler.dispose();
    Signal.clearData(this);
  }

  protected cleanAllCells() {
    const cells = this.notebookPanel.content.widgets;
    cells.forEach(cell => {
      EditorHandler.clearHighlight(cell.editor);
      EditorHandler.clearGutter(cell.editor);
    });
  }

  protected onActiveCellChanged(
    notebookTracker: NotebookTracker,
    codeCell: CodeCell
  ) {
    if (notebookTracker.currentWidget.id !== this.id) {
      return;
    }
  }

  private onCurrentFrameChanged(
    callstackModel: Callstack.Model,
    frame: Callstack.IFrame
  ) {
    const notebook = this.notebookTracker.currentWidget;
    if (!notebook) {
      return;
    }

    const cells = notebook.content.widgets;
    cells.forEach(cell => EditorHandler.clearHighlight(cell.editor));

    if (!frame) {
      return;
    }

    cells.forEach((cell, i) => {
      // check the event is for the correct cell
      const code = cell.model.value.text;
      const cellId = this.debuggerService.getCellId(code);
      if (frame.source.path !== cellId) {
        return;
      }
      notebook.content.activeCellIndex = i;
      EditorHandler.showCurrentLine(cell.editor, frame);
    });
  }

  private notebookTracker: INotebookTracker;
  private debuggerModel: Debugger.Model;
  private debuggerService: IDebugger;
  private notebookPanel: NotebookPanel;
  private editorHandler: EditorHandler;
  private id: string;
}

export namespace NotebookHandler {
  export interface IOptions {
    debuggerService: IDebugger;
    tracker: INotebookTracker;
    id?: string;
  }
}
