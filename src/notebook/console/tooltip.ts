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
   * The dimenions of the tooltip.
   *
   * #### Notes
   * `bottom` and `right` values are ignored as it is sufficient to provide
   * `top`, `left`, `width`, and `height` values.
   */
  get rect(): ClientRect {
    return this._rect;
  }
  set rect(newValue: ClientRect) {
    if (Private.matchClientRects(this._rect, newValue)) {
      return;
    }
    this._rect = newValue;
    Private.setBoundingClientRect(this.node, this._rect);
  }

  /**
   * The text of the tooltip.
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
  constructor(text: string, rect: ClientRect) {
    super();
    this.addClass(TOOLTIP_CLASS);
    this.text = text;
    this.rect = rect;
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
  private _rect: ClientRect = null;
}


/**
 * A namespace for ConsoleTooltip widget private data.
 */
namespace Private {
  /**
   * Compare two client rectangles.
   *
   * @param rectA - The first client rectangle.
   *
   * @param rectB - The second client rectangle.
   *
   * @returns `true` if the two rectangles have the same dimensions.
   *
   * #### Notes
   * `bottom` and `right` values are ignored as it is sufficient to provide
   * `top`, `left`, `width`, and `height` values.
   */
  export
  function matchClientRects(rectA: ClientRect, rectB: ClientRect): boolean {
    return (rectA.top === rectB.top &&
            rectA.right === rectB.right &&
            rectA.width === rectB.width &&
            rectA.height === rectB.height);
  }
  /**
   * Set the dimensions of an element.
   *
   * @param elem - The element of interest.
   *
   * @param rect - The dimensions of the element.
   *
   * #### Notes
   * `bottom` and `right` values are ignored as it is sufficient to provide
   * `top`, `left`, `width`, and `height` values.
   */
  export
  function setBoundingClientRect(elem: HTMLElement, rect: ClientRect): void {
    elem.style.top = rect.top + 'px';
    elem.style.left = rect.left + 'px';
    elem.style.width = rect.width + 'px';
    elem.style.height = rect.height + 'px';
  }
}
