// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Toolbar, ToolbarButton } from '@jupyterlab/apputils';

import { Signal } from '@phosphor/signaling';
import { Panel, PanelLayout, Widget } from '@phosphor/widgets';
import { DebugProtocol } from 'vscode-debugprotocol';
import { Body } from './body';

export class Breakpoints extends Panel {
  constructor(options: Breakpoints.IOptions) {
    super();
    this.model = options.model;
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

    breakpointsChanged = new Signal<this, IBreakpoint[]>(this);
    clearedBreakpoints = new Signal<this, SessionTypes | null>(this);

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

    addBreakpoint(breakpoint: IBreakpoint) {
      this.breakpoints = [...this._breakpoints, breakpoint];
    }

    set type(newType: SessionTypes) {
      if (newType === this._selectedType) {
        return;
      }
      this._state[this._selectedType] = this.breakpoints;
      this._selectedType = newType;
      this.breakpoints = this._state[newType];
    }

    removeBreakpointAtLine(line: number) {
      const breakpoints = this.breakpoints.filter(ele => ele.line !== line);
      this.breakpoints = breakpoints;
    }

    clearSelectedBreakpoints() {
      this.breakpoints = [];
      this.clearedBreakpoints.emit(this._selectedType);
    }

    changeLines(lines: number[]) {
      if (!lines && this.breakpoints.length === 0) {
        return;
      }
      if (lines.length === 0) {
        this.breakpoints = [];
      } else {
        const breakpoint = { ...this.breakpoints[0] };
        let breakpoints: Breakpoints.IBreakpoint[] = [];
        lines.forEach(line => {
          breakpoints.push({ ...breakpoint, line });
        });
        this.breakpoints = [...breakpoints];
      }
    }

    private _selectedType: SessionTypes;
    private _breakpointChanged = new Signal<this, IBreakpoint>(this);
    private _breakpoints: IBreakpoint[];
    private _state = {
      console: [] as Breakpoints.IBreakpoint[],
      notebook: [] as Breakpoints.IBreakpoint[]
    };
  }

  /**
   * Instantiation options for `Breakpoints`;
   */
  export interface IOptions extends Panel.IOptions {
    model: Model;
  }
}

export type SessionTypes = 'console' | 'notebook';
