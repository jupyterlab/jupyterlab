// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { BlueCreateCommentIcon } from './icons';
import { Widget } from '@lumino/widgets';
import { Message } from '@lumino/messaging';
import { ISignal, Signal } from '@lumino/signaling';

export class NewCommentButton extends Widget {
  constructor() {
    super({ node: Private.createNode() });
  }

  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    this.node.addEventListener('click', this);
  }

  protected onAfterDetach(msg: Message): void {
    super.onAfterDetach(msg);
    this.node.removeEventListener('click', this);
  }

  handleEvent(event: Event): void {
    switch (event.type) {
      case 'click':
        this._handleClick(event as MouseEvent);
        break;
    }
  }

  private _handleClick(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this._onClick();
    this.close();
  }

  close(): void {
    super.close();
    this._closed.emit(undefined);
  }

  open(x: number, y: number, f: () => void, anchor?: HTMLElement): void {
    // Bail if button is already attached
    // if (this.isAttached) {
    //   return;
    // }

    // Get position/size of main viewport
    const px = window.pageXOffset;
    const py = window.pageYOffset;
    const cw = document.documentElement.clientWidth;
    const ch = document.documentElement.clientHeight;
    let ax = 0;
    let ay = 0;

    if (anchor != null) {
      const { left, top } = anchor.getBoundingClientRect();
      ax = anchor.scrollLeft - left;
      ay = anchor.scrollTop - top;
    }

    // Reset position
    const style = this.node.style;
    style.top = '';
    style.left = '';
    style.visibility = 'hidden';

    if (!this.isAttached) {
      Widget.attach(this, anchor ?? document.body);
    }

    const { width, height } = this.node.getBoundingClientRect();

    // Constrain button to the viewport
    if (x + width > px + cw) {
      x = px + cw - width;
    }
    if (y + height > py + ch) {
      if (y > py + ch) {
        y = py + ch - height;
      } else {
        y = y - height;
      }
    }

    // Adjust according to anchor
    x += ax;
    y += ay;

    // Add onclick function
    this._onClick = f;

    // Update button position and visibility
    style.top = `${Math.max(0, y)}px`;
    style.left = `${Math.max(0, x)}px`;
    style.visibility = '';
  }

  get closed(): ISignal<this, undefined> {
    return this._closed;
  }

  private _onClick: () => void = () =>
    console.warn('no onClick function registered', this);

  private _closed = new Signal<this, undefined>(this);
}

namespace Private {
  export function createNode() {
    const node = document.createElement('div');
    node.className = 'jp-comments-Indicator';
    const icon = BlueCreateCommentIcon.element();
    node.appendChild(icon);
    return node;
  }
}
