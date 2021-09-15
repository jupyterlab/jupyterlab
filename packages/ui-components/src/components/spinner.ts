/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { Message } from '@lumino/messaging';
import { Widget } from '@lumino/widgets';

/**
 * The spinner class.
 */
export class Spinner extends Widget {
  /**
   * Construct a spinner widget.
   */
  constructor() {
    super();
    this.addClass('jp-Spinner');
    this.node.tabIndex = -1;
    const content = document.createElement('div');
    content.className = 'jp-SpinnerContent';
    this.node.appendChild(content);
  }

  /**
   * Handle `'activate-request'` messages.
   */
  protected onActivateRequest(msg: Message): void {
    this.node.focus();
  }
}
