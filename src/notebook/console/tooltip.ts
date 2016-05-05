// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  Message
} from 'phosphor-messaging';

import {
  Widget
} from 'phosphor-widget';

/**
 * The class name added to tooltip widgets.
 */
const TOOLTIP_CLASS = 'jp-ConsoleTooltip';

/**
 * The class name added to tooltip contens.
 */
const CONTENT_CLASS = 'jp-ConsoleTooltip-content';

export
class ConsoleTooltip extends Widget {
  /**
   * Create the DOM node for a console tooltip.
   */
  static createNode(): HTMLElement {
    let node = document.createElement('div');
    let pre = document.createElement('pre');
    pre.className = CONTENT_CLASS;
    node.appendChild(pre);
    return node;
  }

  /**
   * The current kernel supplying navigation history.
   */
  get text(): string {
    return this._text;
  }
  set text(newValue: string) {
    if (newValue === this._text) {
      return;
    }
    this._text = newValue;
    this.node.getElementsByTagName('pre')[0].textContent = this._text;
  }

  /**
   * Construct a console tooltip widget.
   */
  constructor() {
    super();
    this.addClass(TOOLTIP_CLASS);
  }

  /**
   * Handle the DOM events for the widget.
   *
   * @param event - The DOM event sent to the widget.
   *
   * #### Notes
   * This method implements the DOM `EventListener` interface and is
   * called in response to events on the dock panel's node. It should
   * not be called directly by user code.
   */
  handleEvent(event: Event): void {
    switch (event.type) {
    case 'mousedown':
      this._evtMousedown(event as MouseEvent);
      break;
    }
  }

  /**
   * Handle `after_attach` messages for the widget.
   *
   * #### Notes
   * Captures document events in the capture phase to dismiss the tooltip.
   */
  protected onAfterAttach(msg: Message): void {
    document.addEventListener('keydown', this, true);
    document.addEventListener('mousedown', this, true);
  }

  /**
   * Handle `before_detach` messages for the widget.
   */
  protected onBeforeDetach(msg: Message): void {
    this.node.removeEventListener('keydown', this);
    this.node.removeEventListener('mousedown', this);
  }

  /**
   * Handle keydown events for the widget.
   *
   * #### Notes
   * Disposes the tooltip if a keydown happens anywhere on the document.
   */
  private _evtKeydown(event: KeyboardEvent) {
    this.dispose();
  }

  /**
   * Handle mousedown events for the widget.
   *
   * #### Notes
   * Disposes the tooltip if a mousedown happens anywhere outside the tooltip.
   */
  private _evtMousedown(event: MouseEvent) {
    let target = event.target as HTMLElement;
    while (target !== document.documentElement) {
      if (target === this.node) return;
      target = target.parentElement;
    }
    this.dispose();
  }

  private _text = '';
}
