import { Widget, PanelLayout } from '@phosphor/widgets';
import { HoverBox } from '@jupyterlab/apputils';

import { Message } from '@phosphor/messaging';
import { hoverItem } from '../style/lineForm';
import { clickedItem, interactiveItem } from '../style/statusBar';

export function showPopup(options: Popup.IOptions): Popup | null {
  let dialog = new Popup(options);
  dialog.launch();
  return dialog;
}

export class Popup extends Widget {
  constructor(options: Popup.IOptions) {
    super();
    this._body = options.body;
    this._body.addClass(hoverItem);
    this._anchor = options.anchor;
    this._align = options.align;
    let layout = (this.layout = new PanelLayout());
    layout.addWidget(options.body);
    this._body.node.addEventListener('resize', () => {
      this.update();
    });
  }

  launch() {
    this.setGeometry();
    Widget.attach(this, document.body);
    this.update();
    this._anchor.addClass(clickedItem);
    this._anchor.removeClass(interactiveItem);
  }

  setGeometry() {
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

  protected onUpdateRequest(msg: Message): void {
    this.setGeometry();
    this.setGeometry();
    super.onUpdateRequest(msg);
  }

  protected onAfterAttach(msg: Message): void {
    document.addEventListener('click', this, false);
    this.node.addEventListener('keypress', this, false);
    window.addEventListener('resize', this, false);
  }

  protected onAfterDetach(msg: Message): void {
    document.removeEventListener('click', this, false);
    this.node.removeEventListener('keypress', this, false);
    window.removeEventListener('resize', this, false);
  }

  protected _evtClick(event: MouseEvent): void {
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

  protected onResize(): void {
    this.update();
  }

  dispose() {
    super.dispose();
    this._anchor.removeClass(clickedItem);
    this._anchor.addClass(interactiveItem);
  }

  protected _evtKeydown(event: KeyboardEvent): void {
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

  private _body: Widget;
  private _anchor: Widget;
  private _align: 'left' | 'right' | undefined;
}

export namespace Popup {
  export interface IOptions {
    body: Widget;
    anchor: Widget;
    align?: 'left' | 'right';
  }
}
