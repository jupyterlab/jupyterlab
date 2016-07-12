// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Message
} from 'phosphor-messaging';

import {
  PanelLayout
} from 'phosphor-panel';

import {
  Widget
} from 'phosphor-widget';

/**
 * The class name added to tooltip widgets.
 */
const TOOLTIP_CLASS = 'jp-ConsoleTooltip';

/**
 * A flag to indicate that event handlers are caught in the capture phase.
 */
const USE_CAPTURE = true;


/**
 * A tooltip widget for a console.
 */
export
class ConsoleTooltip extends Widget {
  /**
   * Construct a console tooltip widget.
   */
  constructor() {
    super();
    this.addClass(TOOLTIP_CLASS);
    this.layout = new PanelLayout();
    this.hide();
  }

  /**
   * The semantic parent of the tooltip, its reference widget.
   */
  get reference(): Widget {
    return this._reference;
  }
  set reference(widget: Widget) {
    this._reference = widget;
  }

  /**
   * The text of the tooltip.
   */
  get content(): Widget {
    return this._content;
  }
  set content(newValue: Widget) {
    if (newValue === this._content) {
      return;
    }
    if (this._content) {
      this._content.dispose();
    }
    this._content = newValue;
    if (this._content) {
      let layout = this.layout as PanelLayout;
      layout.addChild(this._content);
    }
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
    case 'scroll':
      this._evtScroll(event as MouseEvent);
      break;
    default:
      break;
    }
  }

  /**
   * Handle `after_attach` messages for the widget.
   *
   * #### Notes
   * Captures document events to dismiss the tooltip widget.
   */
  protected onAfterAttach(msg: Message): void {
    document.addEventListener('mousedown', this, USE_CAPTURE);
    document.addEventListener('scroll', this);
  }

  /**
   * Handle `before_detach` messages for the widget.
   */
  protected onBeforeDetach(msg: Message): void {
    document.removeEventListener('mousedown', this, USE_CAPTURE);
    document.removeEventListener('scroll', this);
  }

  /**
   * Handle `update_request` messages.
   */
  protected onUpdateRequest(msg: Message): void {
    this.show();
  }

  /**
   * Handle mousedown events for the widget.
   *
   * #### Notes
   * Hides the tooltip if a mousedown happens anywhere outside the tooltip.
   */
  private _evtMousedown(event: MouseEvent) {
    let target = event.target as HTMLElement;
    while (target !== document.documentElement) {
      if (target === this.node) {
        return;
      }
      target = target.parentElement;
    }
    this.hide();
  }

  /**
   * Handle scroll events for the widget
   */
  private _evtScroll(event: MouseEvent) {
    if (!this._reference || this.isHidden) {
      this.hide();
      return;
    }

    let target = event.target as HTMLElement;
    while (target !== document.documentElement) {
      // If the scroll event happened in the tooltip widget, allow it.
      if (target === this.node) {
        return;
      }
      target = target.parentElement;
    }
    this.hide();
  }

  private _reference: Widget = null;
  private _content: Widget = null;
}
