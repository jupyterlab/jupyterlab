// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IDebugger } from '../tokens';

import { Panel, Widget } from '@lumino/widgets';

// import { VariablesBody } from './body';

import { VariablesBodyTable } from './table';

import { VariablesHeader } from './header';

import { VariablesModel } from './model';

/**
 * A Panel to show a variable explorer.
 */
export class Variables extends Panel {
  /**
   * Instantiate a new Variables Panel.
   * @param options The instantiation options for a Variables Panel.
   */
  constructor(options: Variables.IOptions) {
    super();

    const { model, service } = options;

    this._header = new VariablesHeader();
    this._body = new VariablesBodyTable({ model, service });

    this.addWidget(this._header);
    this.addWidget(this._body);

    this.addClass('jp-DebuggerVariables');
  }

  private _header: VariablesHeader;
  private _body: Widget;

  /**
   * A message handler invoked on a `'resize'` message.
   */
  protected onResize(msg: Widget.ResizeMessage): void {
    super.onResize(msg);
    this._resizeBody(msg);
  }

  /**
   * Resize the body.
   * @param msg The resize message.
   */
  private _resizeBody(msg: Widget.ResizeMessage) {
    const height = msg.height - this._header.node.offsetHeight;
    this._body.node.style.height = `${height}px`;
  }
}

/**
 * A namespace for Variables `statics`.
 */
export namespace Variables {
  /**
   * Instantiation options for `Variables`.
   */
  export interface IOptions extends Panel.IOptions {
    /**
     * The variables model.
     */
    model: VariablesModel;
    /**
     * The debugger service.
     */
    service: IDebugger;
  }
}
