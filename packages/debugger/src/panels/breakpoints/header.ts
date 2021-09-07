// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ITranslator } from '@jupyterlab/translation';
import { PanelHeader } from '../header';
/**
 * The header for a Breakpoints Panel.
 */
export class BreakpointsHeader extends PanelHeader {
  /**
   * Instantiate a new BreakpointsHeader.
   */
  constructor(translator?: ITranslator) {
    super(translator);
    this.titleWidget.node.textContent = this._trans.__('Breakpoints');
  }
}
