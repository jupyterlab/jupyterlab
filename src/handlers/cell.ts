// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { CodeCell } from '@jupyterlab/cells';

import { CodeMirrorEditor } from '@jupyterlab/codemirror';

import { IDisposable } from '@phosphor/disposable';

import { Signal } from '@phosphor/signaling';

import { Editor } from 'codemirror';

import { Breakpoints, SessionTypes } from '../breakpoints';

import { Debugger } from '../debugger';

import { IDebugger } from '../tokens';

const LINE_HIGHLIGHT_CLASS = 'jp-breakpoint-line-highlight';

export class CellManager implements IDisposable {
  constructor(options: CellManager.IOptions) {
    this._debuggerService = options.debuggerService;
    this.onModelChanged();
    this._debuggerService.modelChanged.connect(() => this.onModelChanged());
    this.activeCell = options.activeCell;
    this.onActiveCellChanged();
  }

  isDisposed: boolean;

  private onModelChanged() {
    this._debuggerModel = this._debuggerService.model;
    if (!this._debuggerModel) {
      return;
    }
    this.breakpointsModel = this._debuggerModel.breakpointsModel;

    this._debuggerModel.variablesModel.changed.connect(() => {
      this.cleanupHighlight();
      const firstFrame = this._debuggerModel.callstackModel.frames[0];
      if (!firstFrame) {
        return;
      }
      this.showCurrentLine(firstFrame.line);
    });

    this.breakpointsModel.changed.connect(async () => {
      if (
        !this.activeCell ||
        !this.activeCell.isVisible ||
        this.activeCell.isDisposed
      ) {
        return;
      }
      this.addBreakpointsToEditor(this.activeCell);
    });

    this.breakpointsModel.restored.connect(async () => {
      if (!this.activeCell || this.activeCell.isDisposed) {
        return;
      }
      this.addBreakpointsToEditor(this.activeCell);
    });

    if (this.activeCell) {
      this._debuggerModel.codeValue = this.activeCell.model.value;
    }
  }

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
    if (!this.activeCell || this.activeCell.isDisposed) {
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
        this.previousCell.model.contentChanged.disconnect(
          this.sendEditorBreakpoints,
          this
        );
        this.removeListener(this.previousCell);
      }
      this.activeCell.model.contentChanged.connect(
        this.sendEditorBreakpoints,
        this
      );
      this.previousCell = this.activeCell;
      this.setEditor(this.activeCell);
    }
  }

  protected sendEditorBreakpoints() {
    // TODO: put behind a Debouncer / ActivityMonitor
    const cell = this.activeCell;
    if (!cell || !cell.editor) {
      return;
    }

    const breakpoints = this.getBreakpointsFromEditor(cell).map(lineInfo => {
      return Private.createBreakpoint(
        this._debuggerService.session.client.name,
        this.getEditorId(),
        lineInfo.line + 1
      );
    });

    void this._debuggerService.updateBreakpoints(
      cell.editor.model.value.text,
      breakpoints
    );
  }

  protected setEditor(cell: CodeCell) {
    if (!cell || !cell.editor) {
      return;
    }

    const editor = cell.editor as CodeMirrorEditor;
    this.addBreakpointsToEditor(cell);

    editor.setOption('lineNumbers', true);
    editor.editor.setOption('gutters', [
      'CodeMirror-linenumbers',
      'breakpoints'
    ]);

    editor.editor.on('gutterClick', this.onGutterClick);
  }

  protected removeListener(cell: CodeCell) {
    if (cell.isDisposed) {
      return;
    }
    const editor = cell.editor as CodeMirrorEditor;
    editor.editor.off('gutterClick', this.onGutterClick);
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
    let breakpoints: Breakpoints.IBreakpoint[] = this.getBreakpoints(
      this._activeCell
    );
    if (isRemoveGutter) {
      breakpoints = breakpoints.filter(ele => ele.line !== info.line + 1);
    } else {
      breakpoints.push(
        Private.createBreakpoint(
          this._debuggerService.session.client.name,
          this.getEditorId(),
          info.line + 1
        )
      );
    }

    void this._debuggerService.updateBreakpoints(
      this._activeCell.model.value.text,
      breakpoints
    );
  };

  private addBreakpointsToEditor(cell: CodeCell) {
    this.clearGutter(cell);
    const editor = cell.editor as CodeMirrorEditor;
    const breakpoints = this.getBreakpoints(cell);
    breakpoints.forEach(breakpoint => {
      editor.editor.setGutterMarker(
        breakpoint.line - 1,
        'breakpoints',
        Private.createMarkerNode()
      );
    });
  }

  private getBreakpointsFromEditor(cell: CodeCell): ILineInfo[] {
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

  private getBreakpoints(cell: CodeCell): Breakpoints.IBreakpoint[] {
    return this._debuggerModel.breakpointsModel.getBreakpoints(
      this._debuggerService.getCellId(cell.model.value.text)
    );
  }

  private _previousCell: CodeCell;
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
