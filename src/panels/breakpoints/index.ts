// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ToolbarButton } from '@jupyterlab/apputils';

import { Signal } from '@lumino/signaling';

import { Panel } from '@lumino/widgets';

import { closeAllIcon } from '../../icons';

import { IDebugger } from '../../tokens';

import { BreakpointsBody } from './body';

import { BreakpointsHeader } from './header';

/**
 * A Panel to show a list of breakpoints.
 */
export class Breakpoints extends Panel {
  /**
   * Instantiate a new Breakpoints Panel.
   *
   * @param options The instantiation options for a Breakpoints Panel.
   */
  constructor(options: Breakpoints.IOptions) {
    super();
    const { model, service } = options;

    const header = new BreakpointsHeader();
    const body = new BreakpointsBody(model);

    header.toolbar.addItem(
      'closeAll',
      new ToolbarButton({
        icon: closeAllIcon,
        onClick: (): void => {
          void service.clearBreakpoints();
        },
        tooltip: 'Remove All Breakpoints'
      })
    );

    this.addWidget(header);
    this.addWidget(body);

    this.addClass('jp-DebuggerBreakpoints');
  }

  readonly clicked = new Signal<this, IDebugger.IBreakpoint>(this);
}

/**
 * A namespace for Breakpoints `statics`.
 */
export namespace Breakpoints {
  /**
   * Instantiation options for `Breakpoints`.
   */
  export interface IOptions extends Panel.IOptions {
    /**
     * The breakpoints model.
     */
    model: IDebugger.UI.IBreakpoints;

    /**
     * The debugger service.
     */
    service: IDebugger;
  }
}
