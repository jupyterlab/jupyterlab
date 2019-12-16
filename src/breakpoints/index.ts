// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Toolbar, ToolbarButton } from '@jupyterlab/apputils';

import { IDisposable } from '@phosphor/disposable';

import { ISignal, Signal } from '@phosphor/signaling';

import { Panel, PanelLayout, Widget } from '@phosphor/widgets';

import { IDebugger } from '../tokens';

import { Body } from './body';

/**
 * A Panel to show a list of breakpoints.
 */
export class Breakpoints extends Panel {
  /**
   * Instantiate a new Breakpoints Panel.
   * @param options The instantiation options for a Breakpoints Panel.
   */
  constructor(options: Breakpoints.IOptions) {
    super();
    const { model, service } = options;

    const header = new BreakpointsHeader();
    const body = new Body(model);

    header.toolbar.addItem(
      'closeAll',
      new ToolbarButton({
        iconClassName: 'jp-CloseAllIcon',
        onClick: () => {
          void service.clearBreakpoints();
        },
        tooltip: 'Remove All Breakpoints'
      })
    );

    this.addWidget(header);
    this.addWidget(body);

    this.addClass('jp-DebuggerBreakpoints');
  }
}

/**
 * The header for a Breakpoints Panel.
 */
class BreakpointsHeader extends Widget {
  /**
   * Instantiate a new BreakpointsHeader.
   */
  constructor() {
    super({ node: document.createElement('header') });

    const title = new Widget({ node: document.createElement('h2') });
    title.node.textContent = 'Breakpoints';

    const layout = new PanelLayout();
    layout.addWidget(title);
    layout.addWidget(this.toolbar);
    this.layout = layout;
  }

  /**
   * The toolbar for the breakpoints header.
   */
  readonly toolbar = new Toolbar();
}

/**
 * A namespace for Breakpoints `statics`.
 */
export namespace Breakpoints {
  /**
   * A model for a list of breakpoints.
   */
  export class Model implements IDisposable {
    /**
     * Whether the model is disposed.
     */
    get isDisposed(): boolean {
      return this._isDisposed;
    }

    /**
     * Signal emitted when the model changes.
     */
    get changed(): ISignal<this, IDebugger.IBreakpoint[]> {
      return this._changed;
    }

    /**
     * Signal emitted when the breakpoints are restored.
     */
    get restored(): Signal<this, void> {
      return this._restored;
    }

    /**
     * Signal emitted when a breakpoint is clicked.
     */
    get clicked(): Signal<this, IDebugger.IBreakpoint> {
      return this._clicked;
    }

    /**
     * Get all the breakpoints.
     */
    get breakpoints(): Map<string, IDebugger.IBreakpoint[]> {
      return this._breakpoints;
    }

    /**
     * Dispose the model.
     */
    dispose(): void {
      if (this._isDisposed) {
        return;
      }
      this._isDisposed = true;
      Signal.clearData(this);
    }

    /**
     * Set the breakpoints for a given id (path).
     * @param id The code id (path).
     * @param breakpoints The list of breakpoints.
     */
    setBreakpoints(id: string, breakpoints: IDebugger.IBreakpoint[]) {
      this._breakpoints.set(id, breakpoints);
      this._changed.emit(breakpoints);
    }

    /**
     * Get the breakpoints for a given id (path).
     * @param id The code id (path).
     */
    getBreakpoints(id: string): IDebugger.IBreakpoint[] {
      return this._breakpoints.get(id) ?? [];
    }

    /**
     * Restore a map of breakpoints.
     * @param breakpoints The map of breakpoints
     */
    restoreBreakpoints(breakpoints: Map<string, IDebugger.IBreakpoint[]>) {
      this._breakpoints = breakpoints;
      this._restored.emit();
    }

    private _isDisposed = false;
    private _breakpoints = new Map<string, IDebugger.IBreakpoint[]>();
    private _changed = new Signal<this, IDebugger.IBreakpoint[]>(this);
    private _restored = new Signal<this, void>(this);
    private _clicked = new Signal<this, IDebugger.IBreakpoint>(this);
  }

  /**
   * Instantiation options for `Breakpoints`.
   */
  export interface IOptions extends Panel.IOptions {
    /**
     * The debugger model.
     */
    model: Model;

    /**
     * The debugger service.
     */
    service: IDebugger;
  }
}
