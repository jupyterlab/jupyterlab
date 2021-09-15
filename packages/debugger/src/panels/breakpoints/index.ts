// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Dialog, showDialog } from '@jupyterlab/apputils';
import { ITranslator } from '@jupyterlab/translation';
import { ToolbarButton } from '@jupyterlab/ui-components';
import { Signal } from '@lumino/signaling';
import { Panel } from '@lumino/widgets';
import { closeAllIcon } from '../../icons';
import { IDebugger } from '../../tokens';
import { BreakpointsBody } from './body';
import { PanelWithToolbar } from '../panelwithtoolbar';
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
    const { model, service } = options;
    this.title.label = this.trans.__('Breakpoints');

    const body = new BreakpointsBody(model);

    this.toolbar.addItem(
      'closeAll',
      new ToolbarButton({
        icon: closeAllIcon,
        onClick: async (): Promise<void> => {
          if (model.breakpoints.size === 0) {
            return;
          }
          const result = await showDialog({
            title: this.trans.__('Remove All Breakpoints'),
            body: this.trans.__(
              'Are you sure you want to remove all breakpoints?'
            ),
            buttons: [
              Dialog.okButton({ label: this.trans.__('Remove breakpoints') }),
              Dialog.cancelButton({ label: this.trans.__('Cancel') })
            ],
            hasClose: true
          });
          if (result.button.accept) {
            return service.clearBreakpoints();
          }
        },
        tooltip: this.trans.__('Remove All Breakpoints')
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
     * The application language translator..
     */
    translator?: ITranslator;
  }
}
