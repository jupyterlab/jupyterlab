// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { CodeCell } from '@jupyterlab/cells';

import { Notebook, NotebookPanel } from '@jupyterlab/notebook';

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
    this.notebookPanel = options.widget;

    this.createNewEditorHandler();

    const notebook = this.notebookPanel.content;
    notebook.activeCellChanged.connect(this.onActiveCellChanged, this);

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

  protected createNewEditorHandler() {
    this.editorHandler = new EditorHandler({
      debuggerModel: this.debuggerModel,
      debuggerService: this.debuggerService,
      editor: this.notebookPanel.content.activeCell.editor
    });
  }

  protected onActiveCellChanged(notebook: Notebook, codeCell: CodeCell) {
    if (this.notebookPanel.content !== notebook) {
      return;
    }
    this.editorHandler.dispose();
    this.createNewEditorHandler();
  }

  private onCurrentFrameChanged(
    callstackModel: Callstack.Model,
    frame: Callstack.IFrame
  ) {
    const cells = this.notebookPanel.content.widgets;
    cells.forEach(cell => EditorHandler.clearHighlight(cell.editor));

    if (!frame) {
      return;
    }

    cells.forEach((cell, i) => {
      // check the event is for the correct cell
      const code = cell.model.value.text;
      const codeId = this.debuggerService.getCodeId(code);
      if (frame.source.path !== codeId) {
        return;
      }
      this.notebookPanel.content.activeCellIndex = i;
      // request drawing the line after the editor has been cleared above
      requestAnimationFrame(() => {
        EditorHandler.showCurrentLine(cell.editor, frame);
      });
    });
  }

  private debuggerModel: Debugger.Model;
  private debuggerService: IDebugger;
  private notebookPanel: NotebookPanel;
  private editorHandler: EditorHandler;
}

export namespace NotebookHandler {
  export interface IOptions {
    debuggerService: IDebugger;
    widget: NotebookPanel;
  }
}
