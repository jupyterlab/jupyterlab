// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ITranslator } from '@jupyterlab/translation';
import { PanelHeader } from '../header';

/**
 * The header for a Variables Panel.
 */
export class VariablesHeader extends PanelHeader {
  /**
   * Instantiate a new VariablesHeader.
   */
  constructor(translator?: ITranslator) {
    super(translator);
    this.titleWidget.node.textContent = this._trans.__('Variables');
  }
}
