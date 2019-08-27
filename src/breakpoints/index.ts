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
        onClick: () => {
          this.model.onActive = !this.model.isActive;
        },
        tooltip: 'Deactivate Breakpoints'
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
  export interface IBreakpoint extends DebugProtocol.Breakpoint {}

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

    get activesChange(): ISignal<this, boolean> {
      return this._activeChange;
    }

    get breakpoints(): IBreakpoint[] {
      return this._state;
    }

    get isActive(): boolean {
      return this._activeBreakpoints;
    }

    set onActive(value: boolean) {
      this._activeBreakpoints = value;
      this._activeChange.emit(value);
    }

    set breakpoints(breakpoints: IBreakpoint[]) {
      this._state = breakpoints;
      this._breakpointsChanged.emit(this._state);
    }

    set breakpoint(breakpoint: IBreakpoint) {
      const index = this._state.findIndex(ele => ele.id === breakpoint.id);
      if (index !== -1) this._state[index] = breakpoint;
    }

    private _state: IBreakpoint[];
    private _activeBreakpoints: boolean = true;
    private _breakpointsChanged = new Signal<this, IBreakpoint[]>(this);
    private _activeChange = new Signal<this, boolean>(this);
  }

  /**
   * Instantiation options for `Breakpoints`;
   */
  export interface IOptions extends Panel.IOptions {}
}

const MOCK_BREAKPOINTS = [
  {
    id: 0,
    verified: true,
    source: {
      name: 'untitled.py'
    },
    line: 6
  },
  {
    id: 1,
    verified: true,
    source: {
      name: 'untitled.py'
    },
    line: 7
  }
];
