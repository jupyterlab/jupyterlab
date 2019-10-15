// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Toolbar, ToolbarButton } from '@jupyterlab/apputils';

import { Widget, Panel, PanelLayout } from '@phosphor/widgets';
import { DebugProtocol } from 'vscode-debugprotocol';
import { Body } from './body';
import { Signal } from '@phosphor/signaling';
import { ILineInfo } from '../handlers/cell';

export class Breakpoints extends Panel {
  constructor(options: Breakpoints.IOptions) {
    super();
    this.model = new Breakpoints.Model([]);
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
          this.model.clearSelectedBreakpoints();
        },
        tooltip: 'Remove All Breakpoints'
      })
    );
  }

  private isAllActive = true;
  readonly body: Widget;
  readonly model: Breakpoints.Model;
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

  export class Model {
    constructor(model: IBreakpoint[]) {
      this._breakpoints = model;
    }

    get breakpoints(): IBreakpoint[] {
      return this._breakpoints;
    }

    get breakpointChanged(): Signal<this, IBreakpoint> {
      return this._breakpointChanged;
    }

    set breakpoints(breakpoints: IBreakpoint[]) {
      this._breakpoints = [...breakpoints];
      this.breakpointsChanged.emit(this._breakpoints);
    }

    set breakpoint(breakpoint: IBreakpoint) {
      const index = this._breakpoints.findIndex(
        ele => ele.line === breakpoint.line
      );
      if (index !== -1) {
        this._breakpoints[index] = breakpoint;
        this._breakpointChanged.emit(breakpoint);
      } else {
        this.breakpoints = [...this.breakpoints, breakpoint];
      }
    }

    addBreakpoint(session: string, type: string, lineInfo: ILineInfo) {
      const breakpoint: Breakpoints.IBreakpoint = {
        line: lineInfo.line + 1,
        active: true,
        verified: true,
        source: {
          name: session
        }
      };
      this.breakpoints = [...this._breakpoints, breakpoint];
    }

    set type(newType: SessionTypes) {
      if (newType === this.selectedType) {
        return;
      }
      this.state[this.selectedType] = this.breakpoints;
      this.selectedType = newType;
      this.breakpoints = this.state[newType];
    }

    removeBreakpoint(lineInfo: any) {
      const breakpoints = this.breakpoints.filter(
        ele => ele.line !== lineInfo.line + 1
      );
      this.breakpoints = breakpoints;
    }

    clearSelectedBreakpoints() {
      this.breakpoints = [];
      this.clearedBreakpoints.emit(this.selectedType);
    }

    changeLines(linesInfo: ILineInfo[]) {
      if (!linesInfo && this.breakpoints.length === 0) {
        return;
      }
      if (linesInfo.length === 0) {
        this.breakpoints = [];
      } else {
        const breakpoint = { ...this.breakpoints[0] };
        let breakpoints: Breakpoints.IBreakpoint[] = [];
        linesInfo.forEach(ele => {
          breakpoints.push({ ...breakpoint, line: ele.line + 1 });
        });
        this.breakpoints = [...breakpoints];
      }
    }

    private _breakpoints: IBreakpoint[];
    breakpointsChanged = new Signal<this, IBreakpoint[]>(this);
    clearedBreakpoints = new Signal<this, SessionTypes | null>(this);
    private selectedType: SessionTypes;
    private _breakpointChanged = new Signal<this, IBreakpoint>(this);
    private state = {
      console: [] as Breakpoints.IBreakpoint[],
      notebook: [] as Breakpoints.IBreakpoint[]
    };
  }

  /**
   * Instantiation options for `Breakpoints`;
   */
  export interface IOptions extends Panel.IOptions {}
}

export type SessionTypes = 'console' | 'notebook';
