// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Dialog, showDialog } from '@jupyterlab/apputils';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import {
  closeAllIcon,
  exceptionsIcon,
  PanelWithToolbar,
  ToolbarButton
} from '@jupyterlab/ui-components';
import { CommandRegistry } from '@lumino/commands';
import { Signal } from '@lumino/signaling';
import { Panel } from '@lumino/widgets';
import { IDebugger } from '../../tokens';
import { BreakpointsBody } from './body';
import { PauseOnExceptionsWidget } from './pauseonexceptions';

/**
 * A Panel to show a list of breakpoints.
 */
export class Breakpoints extends PanelWithToolbar {
  /**
   * Instantiate a new Breakpoints Panel.
   *
   * @param options The instantiation options for a Breakpoints Panel.
   */
  constructor(options: Breakpoints.IOptions) {
    super(options);
    const { model, service, commands } = options;
    const trans = (options.translator ?? nullTranslator).load('jupyterlab');
    this.title.label = trans.__('Breakpoints');

    const body = new BreakpointsBody(model);

    this.toolbar.node.setAttribute(
      'aria-label',
      trans.__('Breakpoints panel toolbar')
    );
    this.toolbar.addItem(
      'pauseOnException',
      new PauseOnExceptionsWidget({
        service: service,
        commands: commands,
        icon: exceptionsIcon,
        tooltip: trans.__('Pause on exception filter')
      })
    );

    this.toolbar.addItem(
      'closeAll',
      new ToolbarButton({
        icon: closeAllIcon,
        onClick: async (): Promise<void> => {
          if (model.breakpoints.size === 0) {
            return;
          }
          const result = await showDialog({
            title: trans.__('Remove All Breakpoints'),
            body: trans.__('Are you sure you want to remove all breakpoints?'),
            buttons: [
              Dialog.okButton({ label: trans.__('Remove breakpoints') }),
              Dialog.cancelButton()
            ],
            hasClose: true
          });
          if (result.button.accept) {
            return service.clearBreakpoints();
          }
        },
        tooltip: trans.__('Remove All Breakpoints')
      })
    );

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
   * The toolbar commands and registry for the breakpoints.
   */
  export interface ICommands {
    /**
     * The command registry.
     */
    registry: CommandRegistry;

    /**
     * The pause on exceptions command ID.
     */
    pauseOnExceptions: string;
  }
  /**
   * Instantiation options for `Breakpoints`.
   */
  export interface IOptions extends Panel.IOptions {
    /**
     * The breakpoints model.
     */
    model: IDebugger.Model.IBreakpoints;

    /**
     * The debugger service.
     */
    service: IDebugger;

    /**
     * The toolbar commands interface for the callstack.
     */
    commands: ICommands;

    /**
     * The application language translator..
     */
    translator?: ITranslator;
  }
}
