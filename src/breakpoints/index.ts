// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Toolbar, ToolbarButton } from '@jupyterlab/apputils';
import { IDisposable } from '@phosphor/disposable';
import { Signal } from '@phosphor/signaling';

import { Panel, PanelLayout, Widget } from '@phosphor/widgets';

import { IDebugger } from '../tokens';

import { Body } from './body';

export class Breakpoints extends Panel {
  constructor(options: Breakpoints.IOptions) {
    super();
    this.model = options.model;
    this.service = options.service;
    this.addClass('jp-DebuggerBreakpoints');
    this.title.label = 'Breakpoints';

    const header = new BreakpointsHeader(this.title.label);
    this.body = new Body(this.model);

    this.addWidget(header);
    this.addWidget(this.body);

    // header.toolbar.addItem(
    //   'deactivate',
    //   new ToolbarButton({
    //     iconClassName: 'jp-DebuggerDeactivateIcon',
    //     tooltip: `${this.isAllActive ? 'Deactivate' : 'Activate'} Breakpoints`,
    //     onClick: () => {
    //       this.isAllActive = !this.isAllActive;

    //       // TODO: this requires a set breakpoint(bp: Breakpoints.IBreakpoint[]) method in the model
    //       /*Array.from(this.model.breakpoints.values()).map((breakpoints: Breakpoints.IBreakpoint[]) => {
    //         breakpoints.map((breakpoint: Breakpoints.IBreakpoint) => {
    //           breakpoint.active = this.isAllActive;
    //           this.model.breakpoint = breakpoint;
    //         });
    //       });*/
    //     }
    //   })
    // );

    header.toolbar.addItem(
      'closeAll',
      new ToolbarButton({
        iconClassName: 'jp-CloseAllIcon',
        onClick: () => {
          void this.service.clearBreakpoints();
        },
        tooltip: 'Remove All Breakpoints'
      })
    );
  }

  // private isAllActive = true;
  readonly body: Widget;
  readonly model: Breakpoints.Model;
  readonly service: IDebugger;
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
  export class Model implements IDisposable {
    get changed(): Signal<this, IDebugger.IBreakpoint[]> {
      return this._changed;
    }

    get restored(): Signal<this, void> {
      return this._restored;
    }

    get breakpoints(): Map<string, IDebugger.IBreakpoint[]> {
      return this._breakpoints;
    }

    // kept for react component
    get breakpointChanged(): Signal<this, IDebugger.IBreakpoint> {
      return this._breakpointChanged;
    }

    get isDisposed(): boolean {
      return this._isDisposed;
    }

    dispose(): void {
      if (this._isDisposed) {
        return;
      }
      this._isDisposed = true;
      Signal.clearData(this);
    }

    setBreakpoints(id: string, breakpoints: IDebugger.IBreakpoint[]) {
      this._breakpoints.set(id, breakpoints);
      this.changed.emit(breakpoints);
    }

    getBreakpoints(id: string): IDebugger.IBreakpoint[] {
      return this._breakpoints.get(id) || [];
    }

    restoreBreakpoints(breakpoints: Map<string, IDebugger.IBreakpoint[]>) {
      this._breakpoints = breakpoints;
      this._restored.emit();
    }

    private _breakpoints = new Map<string, IDebugger.IBreakpoint[]>();
    private _changed = new Signal<this, IDebugger.IBreakpoint[]>(this);
    private _restored = new Signal<this, void>(this);
    // kept for react component
    private _breakpointChanged = new Signal<this, IDebugger.IBreakpoint>(this);
    private _isDisposed: boolean = false;
  }

  /**
   * Instantiation options for `Breakpoints`;
   */
  export interface IOptions extends Panel.IOptions {
    model: Model;
    service: IDebugger;
  }
}

export type SessionTypes = 'console' | 'notebook';
