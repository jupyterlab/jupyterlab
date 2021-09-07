// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ITranslator } from '@jupyterlab/translation';
import { PanelHeader } from '../header';

/**
 * The header for a Callstack Panel.
 */
export class CallstackHeader extends PanelHeader {
  /**
   * Instantiate a new CallstackHeader.
   */
  constructor(translator?: ITranslator) {
    super(translator);
    this.titleWidget.node.textContent = this._trans.__('Callstack');
  }

}
