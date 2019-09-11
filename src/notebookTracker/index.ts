// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';
import { CodeCell } from '@jupyterlab/cells';
import { CodeMirrorEditor } from '@jupyterlab/codemirror';
import { Editor, Doc } from 'codemirror';
import { DebugSession } from './../session';
import { Breakpoints } from '../breakpoints';

export class DebuggerNotebookTracker {
  constructor(options: DebuggerNotebookTracker.IOptions) {
    this.notebookTracker = options.notebookTracker;
    this.notebookTracker.widgetAdded.connect(
      (sender, notePanel: NotebookPanel) => {
        console.log('first');
        if (!this.debuggerSession) {
          this.debuggerSession = new DebugSession({
            client: notePanel.session
          });
        }
        this.debuggerSession.client = notePanel.session;
      }
    );

    // this.notebookTracker.currentChanged.connect(
    //   (sender, notePanel: NotebookPanel) => {

    //   }
    // );

    this.notebookTracker.activeCellChanged.connect(
      this.onActiveCellChanged,
      this
    );
  }
  notebookTracker: INotebookTracker;
  previousCell: CodeCell;
  previousLineCount: number;
  debuggerSession: DebugSession;

  protected onActiveCellChanged() {
    console.log('second');
    const activeCell = this.getCell();
    if (activeCell && activeCell.editor && this.debuggerSession) {
      if (this.previousCell && !this.previousCell.isDisposed) {
        this.removeListner(this.previousCell);
      }
      this.previousCell = activeCell;
      // console.log(activeCell.editor.uuid);
      this.setEditor(activeCell);
    }
    // console.log(this.debuggerSession);
  }

  protected setEditor(cell: CodeCell) {
    if (!cell || !cell.editor) {
      return;
    }

    const editor = cell.editor as CodeMirrorEditor;

    this.previousLineCount = editor.lineCount;

    editor.setOption('lineNumbers', true);
    editor.editor.setOption('gutters', [
      'CodeMirror-linenumbers',
      'breakpoints'
    ]);

    editor.editor.on('gutterClick', this.onGutterClick);
    editor.editor.on('renderLine', this.onNewRenderLine);
  }

  protected removeListner(cell: CodeCell) {
    const editor = cell.editor as CodeMirrorEditor;
    editor.setOption('lineNumbers', false);
    editor.editor.off('gutterClick', this.onGutterClick);
    editor.editor.off('renderLine', this.onNewRenderLine);
  }

  protected getCell(): CodeCell {
    return this.notebookTracker.activeCell as CodeCell;
  }

  protected getEditorId(): string {
    return this.getCell().editor.uuid;
  }

  protected getCurrentNoteBook(): NotebookPanel {
    return this.notebookTracker.currentWidget;
  }

  protected onGutterClick = (editor: Editor, lineNumber: number) => {
    const info = editor.lineInfo(lineNumber);
    if (!info) {
      return;
    }

    const isRemoveGutter = !!info.gutterMarkers;
    if (isRemoveGutter) {
      this.removeBreakpoint(lineNumber);
    } else {
      this.addBreakpoint(lineNumber);
    }

    editor.setGutterMarker(
      lineNumber,
      'breakpoints',
      isRemoveGutter ? null : this.createMarkerNode()
    );
  };

  protected removeBreakpoint(lineNumber: number) {}

  protected addBreakpoint(lineNumber: number) {}

  protected onNewRenderLine = (editor: Editor, line: any) => {
    const lineInfo = editor.lineInfo(line);
    if (lineInfo.handle && lineInfo.handle.order === false) {
      return;
    }

    const doc: Doc = editor.getDoc();
    const linesNumber = doc.lineCount();

    if (this.previousLineCount !== linesNumber) {
      if (this.previousLineCount < linesNumber) {
      }
      if (this.previousLineCount > linesNumber) {
      }
      this.previousLineCount = linesNumber;
    }
    // eage case for backspace line 2
    if (lineInfo.line === 0) {
    }
  };

  protected changeLines(
    breakpoints: Breakpoints.IBreakpoint[],
    lineInfo: any,
    sign: number
  ) {
    breakpoints.map(ele => {
      if (
        ele.line > lineInfo.line ||
        (lineInfo.text === '' && lineInfo.line === ele.line)
      ) {
        ele.line = ele.line + sign;
      }
      return ele;
    });
  }

  private createMarkerNode() {
    var marker = document.createElement('div');
    marker.className = 'jp-breakpoint-marker';
    marker.innerHTML = '●';
    return marker;
  }
}

export namespace DebuggerNotebookTracker {
  export interface IOptions {
    notebookTracker: INotebookTracker;
  }
}
