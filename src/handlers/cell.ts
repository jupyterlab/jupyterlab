// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { CodeCell } from '@jupyterlab/cells';

import { CodeMirrorEditor } from '@jupyterlab/codemirror';

import { Doc, Editor } from 'codemirror';

import { Breakpoints, SessionTypes } from '../breakpoints';

import { IDisposable } from '@phosphor/disposable';

import { Debugger } from '../debugger';

import { IDebugger } from '../tokens';

import { Signal } from '@phosphor/signaling';

const LINE_HIGHLIGHT_CLASS = 'jp-breakpoint-line-highlight';

export class CellManager implements IDisposable {
  constructor(options: CellManager.IOptions) {
    this._debuggerModel = options.debuggerModel;
    this._debuggerService = options.debuggerService;
    this.breakpointsModel = options.breakpointsModel;
    this.activeCell = options.activeCell;
    this.onActiveCellChanged();

    this._debuggerModel.currentLineChanged.connect((_, lineNumber) => {
      this.showCurrentLine(lineNumber);
    });

    this._debuggerModel.linesCleared.connect(() => {
      this.cleanupHighlight();
    });

    this.breakpointsModel.breakpointsChanged.connect(async () => {
      this.addBreakpointsToEditor(this.activeCell);
      await this._debuggerService.updateBreakpoints();
    });
  }

  isDisposed: boolean;

  private showCurrentLine(lineNumber: number) {
    if (!this.activeCell) {
      return;
    }
    const editor = this.activeCell.editor as CodeMirrorEditor;
    this.cleanupHighlight();
    editor.editor.addLineClass(lineNumber - 1, 'wrap', LINE_HIGHLIGHT_CLASS);
  }

  // TODO: call when the debugger stops
  private cleanupHighlight() {
    if (!this.activeCell) {
      return;
    }
    const editor = this.activeCell.editor as CodeMirrorEditor;
    editor.doc.eachLine(line => {
      editor.editor.removeLineClass(line, 'wrap', LINE_HIGHLIGHT_CLASS);
    });
  }

  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    if (this.previousCell) {
      this.removeListener(this.previousCell);
    }
    this.removeListener(this.activeCell);
    this.cleanupHighlight();
    Signal.clearData(this);
  }

  set previousCell(cell: CodeCell) {
    this._previousCell = cell;
  }

  get previousCell() {
    return this._previousCell;
  }

  set activeCell(cell: CodeCell) {
    if (cell) {
      this._activeCell = cell;
      this._debuggerModel.codeValue = cell.model.value;
      this.onActiveCellChanged();
    }
  }

  get activeCell(): CodeCell {
    return this._activeCell;
  }

  protected clearGutter(cell: CodeCell) {
    const editor = cell.editor as CodeMirrorEditor;
    editor.doc.eachLine(line => {
      if ((line as ILineInfo).gutterMarkers) {
        editor.editor.setGutterMarker(line, 'breakpoints', null);
      }
    });
  }

  onActiveCellChanged() {
    if (
      this.activeCell &&
      this.activeCell.isAttached &&
      this.activeCell.editor &&
      this._debuggerService &&
      this._debuggerService.session
    ) {
      if (this.previousCell && !this.previousCell.isDisposed) {
        this.removeListener(this.previousCell);
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

    const editorBreakpoints = this.getBreakpointsInfo(cell).map(lineInfo => {
      return Private.createBreakpoint(
        this._debuggerService.session.client.name,
        this.getEditorId(),
        lineInfo.line + 1
      );
    });
    this._debuggerModel.breakpointsModel.breakpoints = editorBreakpoints;

    editor.setOption('lineNumbers', true);
    editor.editor.setOption('gutters', [
      'CodeMirror-linenumbers',
      'breakpoints'
    ]);

    editor.editor.on('gutterClick', this.onGutterClick);
    editor.editor.on('renderLine', this.onNewRenderLine);
  }

  protected removeListener(cell: CodeCell) {
    const editor = cell.editor as CodeMirrorEditor;
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
      this.breakpointsModel.removeBreakpointAtLine(info.line + 1);
    } else {
      this.breakpointsModel.addBreakpoint(
        Private.createBreakpoint(
          this._debuggerService.session.client.name,
          this.getEditorId(),
          info.line + 1
        )
      );
    }
  };

  protected onNewRenderLine = (editor: Editor, line: any) => {
    const lineInfo = editor.lineInfo(line);
    if (lineInfo.handle && lineInfo.handle.order === false) {
      return;
    }
    const doc: Doc = editor.getDoc();
    const linesNumber = doc.lineCount();
    if (this.previousLineCount !== linesNumber) {
      let lines: number[] = [];
      doc.eachLine(line => {
        if ((line as ILineInfo).gutterMarkers) {
          const lineInfo = editor.lineInfo(line);
          lines.push(lineInfo.line + 1);
        }
      });
      this.breakpointsModel.changeLines(lines);
      this.previousLineCount = linesNumber;
    }
  };

  private addBreakpointsToEditor(cell: CodeCell) {
    this.clearGutter(cell);
    const editor = cell.editor as CodeMirrorEditor;
    const breakpoints = this._debuggerModel.breakpointsModel.breakpoints;
    breakpoints.forEach(breakpoint => {
      editor.editor.setGutterMarker(
        breakpoint.line - 1,
        'breakpoints',
        Private.createMarkerNode()
      );
    });
  }

  private getBreakpointsInfo(cell: CodeCell): ILineInfo[] {
    const editor = cell.editor as CodeMirrorEditor;
    let lines = [];
    for (let i = 0; i < editor.doc.lineCount(); i++) {
      const info = editor.editor.lineInfo(i);
      if (info.gutterMarkers) {
        lines.push(info);
      }
    }
    return lines;
  }

  private _previousCell: CodeCell;
  private previousLineCount: number;
  private _debuggerModel: Debugger.Model;
  private breakpointsModel: Breakpoints.Model;
  private _activeCell: CodeCell;
  private _debuggerService: IDebugger;
}

export namespace CellManager {
  export interface IOptions {
    debuggerModel: Debugger.Model;
    debuggerService: IDebugger;
    breakpointsModel: Breakpoints.Model;
    activeCell?: CodeCell;
    type: SessionTypes;
  }
}

export interface ILineInfo {
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

namespace Private {
  export function createMarkerNode() {
    let marker = document.createElement('div');
    marker.className = 'jp-breakpoint-marker';
    marker.innerHTML = '●';
    return marker;
  }
  export function createBreakpoint(
    session: string,
    type: string,
    line: number
  ) {
    return {
      line,
      active: true,
      verified: true,
      source: {
        name: session
      }
    };
  }
}
