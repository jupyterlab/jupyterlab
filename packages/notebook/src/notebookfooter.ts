/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { Widget } from '@lumino/widgets';
import { Message } from '@lumino/messaging';
import { Notebook } from './widget';
import { NotebookActions } from './actions';

/**
 * A footer widget added after the last cell of the notebook.
 */
export class NotebookFooter extends Widget {
  /**
   * Construct a footer widget.
   */
  constructor(protected notebook: Notebook) {
    super();
    this.node.className = 'jp-Notebook-footer';
  }

  /**
   * Handle incoming events.
   */
  handleEvent(event: Event): void {
    switch (event.type) {
      case 'click':
        this.onClick(event);
        break;
    }
  }

  /**
   * On single click, insert a cell below (at the end of the notebook as default behavior).
   */
  onClick(event: any): void {
    NotebookActions.insertBelow(this.notebook);
  }

  /*
   * Handle `before-detach` messages for the widget.
   */
  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    this.node.addEventListener('click', this);
  }

  /**
   * Handle `before-detach` messages for the widget.
   */
  protected onBeforeDetach(msg: Message): void {
    this.node.removeEventListener('click', this);
    super.onBeforeDetach(msg);
  }
}
