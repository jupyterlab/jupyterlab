// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Toolbar, ToolbarButton } from '@jupyterlab/apputils';

import { Widget, Panel, PanelLayout } from '@phosphor/widgets';
import { DebugProtocol } from 'vscode-debugprotocol';
import { Body } from './body';
import { Signal, ISignal } from '@phosphor/signaling';
import { INotebookTracker } from '@jupyterlab/notebook';
import { CodeMirrorEditor } from '@jupyterlab/codemirror';
import { Editor, Doc } from 'codemirror';
import { CodeCell } from '@jupyterlab/cells';

export class Breakpoints extends Panel {
  constructor(options: Breakpoints.IOptions) {
    super();

    this.model = new Breakpoints.IModel([]);
    this.addClass('jp-DebuggerBreakpoints');
    this.title.label = 'Breakpoints';

    const header = new BreakpointsHeader(this.title.label);
    this.body = new Body(this.model);

    this.addWidget(header);
    this.addWidget(this.body);

    header.toolbar.addItem(
      'deactivate',
      new ToolbarButton({
        iconClassName: 'jp-DebuggerDeactivateIcon',
        tooltip: `${this.isAllActive ? 'Deactivate' : 'Activate'} Breakpoints`,
        onClick: () => {
          this.isAllActive = !this.isAllActive;
          this.model.breakpoints.map((breakpoint: Breakpoints.IBreakpoint) => {
            breakpoint.active = this.isAllActive;
            this.model.breakpoint = breakpoint;
          });
        }
      })
    );

    header.toolbar.addItem(
      'closeAll',
      new ToolbarButton({
        iconClassName: 'jp-CloseAllIcon',
        onClick: () => {
          this.model.breakpoints = [];
          this.cellsBreakpoints[this.getCell().id] = [];
          this.removeAllGutterBreakpoints(this.getCell());
        },
        tooltip: 'Remove All Breakpoints'
      })
    );

    this.noteTracker = options.noteTracker;
    if (this.noteTracker) {
      this.noteTracker.activeCellChanged.connect(
        this.onActiveCellChanged,
        this
      );
    }
  }

  private isAllActive = true;
  readonly body: Widget;
  readonly model: Breakpoints.IModel;
  noteTracker: INotebookTracker;
  previousCell: CodeCell;
  previousLineCount: number;
  cellsBreakpoints: { [id: string]: Breakpoints.IBreakpoint[] } = {};

  protected onActiveCellChanged() {
    const activeCell = this.getCell();
    if (this.model && activeCell) {
      if (this.previousCell && !this.previousCell.isDisposed) {
        this.removeListner(this.previousCell);
      }
      this.previousCell = activeCell;
      const id: string = activeCell.model.id;
      if (id && !this.cellsBreakpoints[id]) {
        this.cellsBreakpoints[id] = [];
      }
      this.model.breakpoints = this.cellsBreakpoints[id];
      this.setEditor(activeCell);
    }
  }

  protected getCell(): CodeCell {
    return this.noteTracker.activeCell as CodeCell;
  }

  protected removeAllGutterBreakpoints(cell: CodeCell) {
    const editor = cell.editor as CodeMirrorEditor;
    editor.editor.getDoc().eachLine(line => {
      editor.editor.setGutterMarker(line, 'breakpoints', null);
    });
  }

  removeListner(cell: CodeCell) {
    const editor = cell.editor as CodeMirrorEditor;
    this.cellsBreakpoints[cell.model.id] = this.model.breakpoints;
    this.model.breakpoints = [];
    editor.setOption('lineNumbers', false);
    editor.editor.off('gutterClick', this.onGutterClick);
    editor.editor.off('renderLine', this.onNewRenderLine);
  }

  setEditor(cell: CodeCell) {
    if (!cell || !cell.editor) {
      return;
    }

    const editor = cell.editor as CodeMirrorEditor;
    editor.setOption('lineNumbers', true);
    editor.editor.setOption('gutters', [
      'CodeMirror-linenumbers',
      'breakpoints'
    ]);

    editor.editor.on('gutterClick', this.onGutterClick);
    editor.editor.on('renderLine', this.onNewRenderLine);
  }

  protected onNewRenderLine = (editor: Editor, line: any) => {
    const lineInfo = editor.lineInfo(line);
    if (
      !this.model.breakpoints &&
      this.model.breakpoints.length < 1 &&
      lineInfo.handle &&
      lineInfo.handle.order === false
    ) {
      return;
    }

    const doc: Doc = editor.getDoc();
    const linesNumber = doc.lineCount();

    if (this.previousLineCount !== linesNumber) {
      if (this.previousLineCount > linesNumber) {
        this.model.changeLines(lineInfo.line, -1);
      }
      if (this.previousLineCount < linesNumber) {
        this.model.changeLines(lineInfo.line, +1);
      }
      this.previousLineCount = linesNumber;
    }
    // eage case for backspace line 2
    if (lineInfo.line === 0) {
      const breakpoint: Breakpoints.IBreakpoint = this.model.getBreakpointByLineNumber(
        -1
      );
      if (breakpoint) {
        this.model.removeBreakpoint(breakpoint);
      }
    }
  };

  private addBreakpoint(line: number) {
    this.model.breakpoint = {
      id: this.model.breakpoints.length + 1,
      active: true,
      verified: true,
      source: {
        // TODO: need get filename
        name: 'untitled.py'
      },
      line: line
    };
  }

  protected onGutterClick = (editor: Editor, lineNumber: number) => {
    const info = editor.lineInfo(lineNumber);
    if (!info) {
      return;
    }
    const isRemoveGutter = !!info.gutterMarkers;

    const breakpoint: Breakpoints.IBreakpoint = this.model.getBreakpointByLineNumber(
      lineNumber
    );

    if (!breakpoint && !isRemoveGutter) {
      this.addBreakpoint(lineNumber);
    } else if (isRemoveGutter) {
      this.model.removeBreakpoint(breakpoint);
    }

    editor.setGutterMarker(
      lineNumber,
      'breakpoints',
      isRemoveGutter ? null : this.createMarkerNode()
    );
  };

  createMarkerNode() {
    var marker = document.createElement('div');
    marker.className = 'jp-breakpoint-marker';
    marker.innerHTML = '●';
    return marker;
  }
}
class BreakpointsHeader extends Widget {
  constructor(title: string) {
    super({ node: document.createElement('header') });

    const layout = new PanelLayout();
    const span = new Widget({ node: document.createElement('span') });

    this.layout = layout;
    span.node.textContent = title;
    layout.addWidget(span);
    layout.addWidget(this.toolbar);
  }

  readonly toolbar = new Toolbar();
}

export namespace Breakpoints {
  export interface IBreakpoint extends DebugProtocol.Breakpoint {
    active: boolean;
  }

  /**
   * The breakpoints UI model.
   */
  export interface IModel {}

  export class IModel implements IModel {
    constructor(model: IBreakpoint[]) {
      this._state = model;
    }

    get breakpointsChanged(): ISignal<this, IBreakpoint[]> {
      return this._breakpointsChanged;
    }

    get breakpoints(): IBreakpoint[] {
      return this._state;
    }

    get breakpointChanged(): ISignal<this, IBreakpoint> {
      return this._breakpointChanged;
    }

    set breakpoints(breakpoints: IBreakpoint[]) {
      this._state = breakpoints;
      this._breakpointsChanged.emit(this._state);
    }

    set breakpoint(breakpoint: IBreakpoint) {
      const index = this._state.findIndex(ele => ele.line === breakpoint.line);
      if (index !== -1) {
        this._state[index] = breakpoint;
        this._breakpointChanged.emit(breakpoint);
      } else {
        this.breakpoints = [...this.breakpoints, breakpoint];
      }
    }

    removeBreakpoint(breakpoint: IBreakpoint) {
      const breakpoints = this.breakpoints.filter(
        ele => ele.line !== breakpoint.line
      );
      this.breakpoints = breakpoints;
    }

    changeLines(lineEnter: number, howMany: number) {
      const breakpoints = this.breakpoints.map(ele => {
        ele.line = lineEnter <= ele.line ? ele.line + howMany : ele.line;
        return ele;
      });
      this.breakpoints = breakpoints;
    }

    getBreakpointByLineNumber(lineNumber: number) {
      return this.breakpoints.find(ele => ele.line === lineNumber);
    }

    private _state: IBreakpoint[];
    private _breakpointsChanged = new Signal<this, IBreakpoint[]>(this);
    private _breakpointChanged = new Signal<this, IBreakpoint>(this);
  }

  /**
   * Instantiation options for `Breakpoints`;
   */
  export interface IOptions extends Panel.IOptions {
    noteTracker?: INotebookTracker;
  }
}
