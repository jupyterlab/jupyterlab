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

    this.model = new Breakpoints.IModel([] as Breakpoints.IBreakpoint[]);
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
        },
        tooltip: 'Remove All Breakpoints'
      })
    );

    this.notebook = options.notebook;

    this.notebook.activeCellChanged.connect(this.onActiveCellChanged, this);
  }

  private isAllActive = true;
  readonly body: Widget;
  readonly model: Breakpoints.IModel;
  notebook: INotebookTracker;
  previousCell: CodeCell;
  previousLineCount: number;

  protected onActiveCellChanged() {
    const activeCell = this.getCell();
    if (this.previousCell && !this.previousCell.isDisposed) {
      this.removeListner(this.previousCell);
    }
    this.previousCell = activeCell;
    this.setEditor(activeCell);
  }

  protected getCell(): CodeCell {
    return this.notebook.activeCell as CodeCell;
  }

  removeListner(cell: CodeCell) {
    const editor = cell.editor as CodeMirrorEditor;
    editor.setOption('lineNumbers', false);
    editor.editor.off('gutterClick', this.addBreakpoint);
    editor.editor.off('renderLine', this.onNewRenderLine);
    this.model.breakpoints = [];
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

    editor.editor.on('gutterClick', this.addBreakpoint);
    editor.editor.on('renderLine', this.onNewRenderLine);
  }

  protected onNewRenderLine = (editor: Editor, line: any) => {
    const lineInfo = editor.lineInfo(line);
    if (lineInfo.handle && lineInfo.handle.order === false) {
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
  };

  protected addBreakpoint = (editor: Editor, lineNumber: number) => {
    const info = editor.lineInfo(lineNumber);
    if (!info) {
      return;
    }
    const removeGutter = !!info.gutterMarkers;

    const breakpoint: Breakpoints.IBreakpoint = this.model.getBreakpointByLineNumber(
      lineNumber
    );

    if (!breakpoint && !removeGutter) {
      this.model.breakpoint = {
        id: this.model.breakpoints.length + 1,
        active: true,
        verified: true,
        source: {
          // TODO: need get filename
          name: 'untitled.py'
        },
        line: lineNumber
      };
    } else if (removeGutter) {
      this.model.removeBreakpoint(breakpoint);
    }

    editor.setGutterMarker(
      lineNumber,
      'breakpoints',
      removeGutter ? null : this.createMarkerNode()
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
      const index = this._state.findIndex(ele => ele.id === breakpoint.id);
      if (index !== -1) {
        this._state[index] = breakpoint;
        this._breakpointChanged.emit(breakpoint);
      } else {
        const breakpoints = this.breakpoints;
        breakpoints.push(breakpoint);
        this.breakpoints = [];
        this.breakpoints = breakpoints;
      }
    }

    removeBreakpoint(breakpoint: IBreakpoint) {
      this.breakpoints = this.breakpoints.filter(
        ele => ele.line !== breakpoint.line
      );
    }

    changeLines(lineEnter: number, howMany: number) {
      const breakpoints = this.breakpoints.map(ele => {
        ele.line = lineEnter <= ele.line ? ele.line + howMany : ele.line;
        return ele;
      });
      this.breakpoints = [];
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
    notebook?: INotebookTracker;
  }
}
