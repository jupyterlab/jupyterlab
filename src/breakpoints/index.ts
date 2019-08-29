// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Toolbar, ToolbarButton } from '@jupyterlab/apputils';

import { Widget, Panel, PanelLayout } from '@phosphor/widgets';
import { DebugProtocol } from 'vscode-debugprotocol';
import { Body } from './body';
import { Signal, ISignal } from '@phosphor/signaling';

export class Breakpoints extends Panel {
  constructor(options: Breakpoints.IOptions = {}) {
    super();

    this.model = new Breakpoints.IModel(MOCK_BREAKPOINTS);
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
  }

  private isAllActive = true;
  readonly body: Widget;
  readonly model: Breakpoints.IModel;
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
      }
    }

    private _state: IBreakpoint[];
    private _breakpointsChanged = new Signal<this, IBreakpoint[]>(this);
    private _breakpointChanged = new Signal<this, IBreakpoint>(this);
  }

  /**
   * Instantiation options for `Breakpoints`;
   */
  export interface IOptions extends Panel.IOptions {}
}

const MOCK_BREAKPOINTS = [
  {
    id: 0,
    active: true,
    verified: true,
    source: {
      name: 'untitled.py'
    },
    line: 6
  },
  {
    id: 1,
    verified: true,
    active: false,
    source: {
      name: 'untitled.py'
    },
    line: 7
  }
];
