/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { Widget } from '@lumino/widgets';
import { Message } from '@lumino/messaging';
import { Notebook } from './widget';
import { NotebookActions } from './actions';

const NOTEBOOK_FOOTER_CLASS = 'jp-Notebook-footer';

/**
 * The data attribute added to a widget that can be traversed with up/down arrow and j/k shortcuts.
 */
const TRAVERSABLE = 'jpTraversable';

/**
 * A footer widget added after the last cell of the notebook.
 */
export class NotebookFooter extends Widget {
  /**
   * Construct a footer widget.
   */
  constructor(protected notebook: Notebook) {
    super({ node: document.createElement('button') });
    this.node.dataset[TRAVERSABLE] = 'true';
    const trans = notebook.translator.load('jupyterlab');
    this.addClass(NOTEBOOK_FOOTER_CLASS);
    this.node.innerText = trans.__('Click to add a cell.');
  }

  /**
   * Handle incoming events.
   */
  handleEvent(event: Event): void {
    switch (event.type) {
      case 'click':
        this.onClick();
        break;
      case 'keydown':
        if ((event as KeyboardEvent).key === 'ArrowUp') {
          this.onArrowUp();
          break;
        }
    }
  }

  /**
   * On single click (mouse event), insert a cell below (at the end of the notebook as default behavior).
   */
  protected onClick(): void {
    if (this.notebook.widgets.length > 0) {
      this.notebook.activeCellIndex = this.notebook.widgets.length - 1;
    }
    NotebookActions.insertBelow(this.notebook);
  }

  /**
   * On arrow up key pressed (keydown keyboard event).
   * @deprecated To be removed in v5, this is a no-op
   */
  protected onArrowUp(): void {
    // The specific behavior has been removed in https://github.com/jupyterlab/jupyterlab/pull/14796
  }

  /*
   * Handle `after-detach` messages for the widget.
   */
  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    this.node.addEventListener('click', this);
    this.node.addEventListener('keydown', this);
  }

  /**
   * Handle `before-detach` messages for the widget.
   */
  protected onBeforeDetach(msg: Message): void {
    this.node.removeEventListener('click', this);
    this.node.removeEventListener('keydown', this);
    super.onBeforeDetach(msg);
  }
}
