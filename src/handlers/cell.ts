// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { CodeCell } from '@jupyterlab/cells';

import { CodeMirrorEditor } from '@jupyterlab/codemirror';

import { Editor, Doc } from 'codemirror';

import { Breakpoints, SessionTypes } from '../breakpoints';
import { Debugger } from '../debugger';

export class CellManager {
  constructor(options: CellManager.IOptions) {
    this._debuggerModel = options.debuggerModel;
    this.breakpointsModel = options.breakpointsModel;
    this.activeCell = options.activeCell;
    this._type = options.type;
    this.onActiveCellChanged();

    this.breakpointsModel.clearedBreakpoints.connect((_, type) => {
      if (type !== this._type) {
        return;
      }
      this.clearGutter(this.activeCell);
    });
  }

  private _previousCell: CodeCell;
  private previousLineCount: number;
  private _debuggerModel: Debugger.Model;
  private _type: SessionTypes;
  private breakpointsModel: Breakpoints.Model;
  private _activeCell: CodeCell;

  set previousCell(cell: CodeCell) {
    this._previousCell = cell;
  }

  get previousCell() {
    return this._previousCell;
  }

  set activeCell(cell: CodeCell) {
    this._activeCell = cell;
    this.onActiveCellChanged();
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
    console.log({ cell: this.activeCell });
    if (
      this.activeCell &&
      this.activeCell.isAttached &&
      this.activeCell.editor &&
      this._debuggerModel &&
      this._debuggerModel.session
    ) {
      if (this.previousCell && !this.previousCell.isDisposed) {
        this.removeListner(this.previousCell);
        this.clearGutter(this.previousCell);
        this.breakpointsModel.breakpoints = [];
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

  protected getEditorId(): string {
    return this.activeCell.editor.uuid;
  }

  protected onGutterClick = (editor: Editor, lineNumber: number) => {
    const info = editor.lineInfo(lineNumber);
    if (!info) {
      return;
    }

    const isRemoveGutter = !!info.gutterMarkers;
    if (isRemoveGutter) {
      this.breakpointsModel.removeBreakpoint(info as LineInfo);
    } else {
      this.breakpointsModel.addBreakpoint(
        this._debuggerModel.session.id,
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
      this.breakpointsModel.changeLines(lines);
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
    debuggerModel: Debugger.Model;
    breakpointsModel: Breakpoints.Model;
    activeCell?: CodeCell;
    type: SessionTypes;
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
