// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Message
} from '@phosphor/messaging';

import {
  Panel
} from '@phosphor/widgets';


/**
 * A panel which handles tab events according to JupyterLab convention.
 */
export
class FocusPanel extends Panel {
  /**
   * Construct a new focus panel.
   *
   * @param options - The options for initializing the panel.
   */
  constructor(options: Panel.IOptions) {
    super(options);
    this.node.tabIndex = -1;
    this.addClass('jp-FocusPanel');
  }

  /**
   * Handle `'activate-request'` messages.
   */
  protected onActivateRequest(msg: Message): void {
    this.node.focus();
  }

  /**
   * Handle `'close-request'` messages.
   */
  protected onCloseRequest(msg: Message): void {
    this.dispose();
  }
};
