// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { CodeCell } from '@jupyterlab/cells';
import { CodeMirrorEditor } from '@jupyterlab/codemirror';
import { Editor, Doc } from 'codemirror';
import { BreakpointsService } from '../breakpointsService';

export class CellManager {
  constructor(options: CellManager.IOptions) {
    this.breakpointService = options.breakpointService;
    this.activeCell = options.activeCell;
    this.debuggerSessionId = options.sessionId;
    this.onActiveCellChanged();
  }

  previousCell: CodeCell;
  previousLineCount: number;
  private _debuggerSessionId: string;
  breakpointService: BreakpointsService;
  private _activeCell: CodeCell;

  set debuggerSessionId(id: string) {
    this._debuggerSessionId = id;
  }

  get debuggerSessionId() {
    return this._debuggerSessionId;
  }

  set activeCell(cell: CodeCell) {
    this._activeCell = cell;
  }

  get activeCell(): CodeCell {
    return this._activeCell;
  }

  protected clearGutter(cell: CodeCell) {
    const editor = cell.editor as CodeMirrorEditor;
    editor.doc.eachLine(line => {
      if ((line as LineInfo).gutterMarkers) {
        editor.editor.setGutterMarker(line, 'breakpoints', null);
      }
    });
  }

  onActiveCellChanged() {
    // this run before change note, consider how to resolve this
    if (this.activeCell && this.activeCell.editor && this.debuggerSessionId) {
      this.breakpointService.onSelectedBreakpoints(
        this.debuggerSessionId,
        this.getEditorId()
      );
      if (this.previousCell && !this.previousCell.isDisposed) {
        this.removeListner(this.previousCell);
        this.clearGutter(this.previousCell);
        this.breakpointService.clearSelectedBreakpoints();
      }
      this.previousCell = this.activeCell;
      this.setEditor(this.activeCell);
    }
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
    return this.activeCell as CodeCell;
  }

  protected getEditorId(): string {
    return this.getCell().editor.uuid;
  }

  protected onGutterClick = (editor: Editor, lineNumber: number) => {
    const info = editor.lineInfo(lineNumber);
    if (!info) {
      return;
    }

    const isRemoveGutter = !!info.gutterMarkers;
    if (isRemoveGutter) {
      this.breakpointService.removeBreakpoint(
        this.debuggerSessionId,
        this.getEditorId,
        info as LineInfo
      );
    } else {
      this.breakpointService.addBreakpoint(
        this.debuggerSessionId,
        this.getEditorId(),
        info as LineInfo
      );
    }

    editor.setGutterMarker(
      lineNumber,
      'breakpoints',
      isRemoveGutter ? null : this.createMarkerNode()
    );
  };

  protected onNewRenderLine = (editor: Editor, line: any) => {
    const lineInfo = editor.lineInfo(line);
    if (lineInfo.handle && lineInfo.handle.order === false) {
      return;
    }
    const doc: Doc = editor.getDoc();
    const linesNumber = doc.lineCount();
    if (this.previousLineCount !== linesNumber) {
      var lines: LineInfo[] = [];
      doc.eachLine(line => {
        if ((line as LineInfo).gutterMarkers) {
          lines.push(editor.lineInfo(line));
        }
      });
      this.breakpointService.changeLines(lines);
      this.previousLineCount = linesNumber;
    }
  };

  private createMarkerNode() {
    var marker = document.createElement('div');
    marker.className = 'jp-breakpoint-marker';
    marker.innerHTML = '●';
    return marker;
  }
}

export namespace CellManager {
  export interface IOptions {
    sessionId: string;
    breakpointService: BreakpointsService;
    activeCell?: CodeCell;
  }
}

export interface LineInfo {
  line: any;
  handle: any;
  text: string;
  /** Object mapping gutter IDs to marker elements. */
  gutterMarkers: any;
  textClass: string;
  bgClass: string;
  wrapClass: string;
  /** Array of line widgets attached to this line. */
  widgets: any;
}
