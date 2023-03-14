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
 * A footer widget added after the last cell of the notebook.
 */
export class NotebookFooter extends Widget {
  /**
   * Construct a footer widget.
   */
  constructor(protected notebook: Notebook) {
    super();
    this.addClass(NOTEBOOK_FOOTER_CLASS);
    this._createHiddenButton();
    const text = document.createElement('p');
    text.innerText = 'Click to add a cell.';
    this.node.appendChild(text);
  }

  /**
   * Handle incoming events.
   */
  handleEvent(event: Event): void {
    switch (event.type) {
      case 'click':
        this.onClick(event as MouseEvent);
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
  onClick(event: any): void {
    NotebookActions.insertBelow(this.notebook);
  }

  /**
   * On arrow up key pressed (keydown keyboard event), blur the footer and switch to command mode.
   */
  onArrowUp(): void {
    this.blur();
    this.notebook.mode = 'command';
  }
  /**
   * Focus the footer and the hidden button
   */
  focus(): void {
    this.addClass('focused');
    this._hiddenButton.focus();
  }

  /**
   * Blur the footer and the hidden button
   */
  blur(): void {
    this.removeClass('focused');
    this._hiddenButton.blur();
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
  /**
   * Create an hidden button in the notebookfooter widget that enables to add a new cell when it is cliked.
   */
  private _createHiddenButton(): void {
    this._hiddenButton = document.createElement('button');
    this._hiddenButton.classList.add('hidden');
    this.node.appendChild(this._hiddenButton);
  }
  private _hiddenButton: HTMLButtonElement;
}
