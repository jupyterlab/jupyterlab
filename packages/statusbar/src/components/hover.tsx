// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { HoverBox } from '@jupyterlab/apputils';

import { Message } from '@lumino/messaging';

import { Widget, PanelLayout } from '@lumino/widgets';

import { style } from 'typestyle/lib';

import { clickedItem, interactiveItem } from '../style/statusbar';

const hoverItem = style({
  boxShadow: '0px 4px 4px rgba(0, 0, 0, 0.25)'
});

/**
 * Create and show a popup component.
 *
 * @param options - options for the popup
 *
 * @returns the popup that was created.
 */
export function showPopup(options: Popup.IOptions): Popup {
  const dialog = new Popup(options);
  dialog.launch();
  return dialog;
}

/**
 * A class for a Popup widget.
 */
export class Popup extends Widget {
  /**
   * Construct a new Popup.
   */
  constructor(options: Popup.IOptions) {
    super();
    this._body = options.body;
    this._body.addClass(hoverItem);
    this._anchor = options.anchor;
    this._align = options.align;
    const layout = (this.layout = new PanelLayout());
    layout.addWidget(options.body);
    this._body.node.addEventListener('resize', () => {
      this.update();
    });
  }

  /**
   * Attach the popup widget to the page.
   */
  launch() {
    this._setGeometry();
    Widget.attach(this, document.body);
    this.update();
    this._anchor.addClass(clickedItem);
    this._anchor.removeClass(interactiveItem);
  }

  /**
   * Handle `'update'` messages for the widget.
   */
  protected onUpdateRequest(msg: Message): void {
    this._setGeometry();
    super.onUpdateRequest(msg);
  }

  /**
   * Handle `'after-attach'` messages for the widget.
   */
  protected onAfterAttach(msg: Message): void {
    document.addEventListener('click', this, false);
    this.node.addEventListener('keydown', this, false);
    window.addEventListener('resize', this, false);
  }

  /**
   * Handle `'after-detach'` messages for the widget.
   */
  protected onAfterDetach(msg: Message): void {
    document.removeEventListener('click', this, false);
    this.node.removeEventListener('keydown', this, false);
    window.removeEventListener('resize', this, false);
  }

  /**
   * Handle `'resize'` messages for the widget.
   */
  protected onResize(): void {
    this.update();
  }

  /**
   * Dispose of the widget.
   */
  dispose() {
    super.dispose();
    this._anchor.removeClass(clickedItem);
    this._anchor.addClass(interactiveItem);
  }

  /**
   * Handle DOM events for the widget.
   */
  handleEvent(event: Event): void {
    switch (event.type) {
      case 'keydown':
        this._evtKeydown(event as KeyboardEvent);
        break;
      case 'click':
        this._evtClick(event as MouseEvent);
        break;
      case 'resize':
        this.onResize();
        break;
      default:
        break;
    }
  }

  private _evtClick(event: MouseEvent): void {
    if (
      !!event.target &&
      !(
        this._body.node.contains(event.target as HTMLElement) ||
        this._anchor.node.contains(event.target as HTMLElement)
      )
    ) {
      this.dispose();
    }
  }

  private _evtKeydown(event: KeyboardEvent): void {
    // Check for escape key
    switch (event.keyCode) {
      case 27: // Escape.
        event.stopPropagation();
        event.preventDefault();
        this.dispose();
        break;
      default:
        break;
    }
  }

  private _setGeometry(): void {
    let aligned = 0;
    const anchorRect = this._anchor.node.getBoundingClientRect();
    const bodyRect = this._body.node.getBoundingClientRect();
    if (this._align === 'right') {
      aligned = -(bodyRect.width - anchorRect.width);
    }
    const style = window.getComputedStyle(this._body.node);
    HoverBox.setGeometry({
      anchor: anchorRect,
      host: document.body,
      maxHeight: 500,
      minHeight: 20,
      node: this._body.node,
      offset: {
        horizontal: aligned
      },
      privilege: 'forceAbove',
      style
    });
  }

  private _body: Widget;
  private _anchor: Widget;
  private _align: 'left' | 'right' | undefined;
}

/**
 * A namespace for Popup statics.
 */
export namespace Popup {
  /**
   * Options for creating a Popup widget.
   */
  export interface IOptions {
    /**
     * The content of the popup.
     */
    body: Widget;

    /**
     * The widget to which we are attaching the popup.
     */
    anchor: Widget;

    /**
     * Whether to align the popup to the left or the right of the anchor.
     */
    align?: 'left' | 'right';
  }
}
