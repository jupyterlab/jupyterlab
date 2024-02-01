// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Message } from '@lumino/messaging';
import { ISignal, Signal } from '@lumino/signaling';
import { Panel, PanelLayout, Title, Widget } from '@lumino/widgets';

import { caretDownIcon } from '../icon';

const COLLAPSE_CLASS = 'jp-Collapse';

const CONTENTS_CLASS = 'jp-Collapse-contents';

const HEADER_CLASS = 'jp-Collapse-header';

const HEADER_COLLAPSED_CLASS = 'jp-Collapse-header-collapsed';

const ICON_CLASS = 'jp-Collapser-icon';

const TITLE_CLASS = 'jp-Collapser-title';

/**
 * A panel that supports a collapsible header made from the widget's title.
 * Clicking on the title expands or contracts the widget.
 */
export class Collapser<T extends Widget = Widget> extends Widget {
  constructor(options: Collapser.IOptions<T>) {
    super(options);
    const { widget, collapsed = true } = options;

    this.addClass(COLLAPSE_CLASS);
    this._header = new Widget();
    this._header.addClass(HEADER_CLASS);
    if (collapsed) {
      this._header.addClass(HEADER_COLLAPSED_CLASS);
    }
    this._header.node.appendChild(
      caretDownIcon.element({
        className: ICON_CLASS
      })
    );
    const titleSpan = document.createElement('span');
    titleSpan.classList.add(TITLE_CLASS);
    titleSpan.textContent = widget.title.label;
    this._header.node.appendChild(titleSpan);

    this._content = new Panel();
    this._content.addClass(CONTENTS_CLASS);

    const layout = new PanelLayout();
    this.layout = layout;
    layout.addWidget(this._header);
    layout.addWidget(this._content);

    this.widget = widget;
    this.collapsed = collapsed;
  }

  /**
   * The widget inside the collapse panel.
   */
  get widget(): T {
    return this._widget;
  }
  set widget(widget: T) {
    const oldWidget = this._widget;
    if (oldWidget) {
      oldWidget.title.changed.disconnect(this._onTitleChanged, this);
      oldWidget.parent = null;
    }
    this._widget = widget;
    widget.title.changed.connect(this._onTitleChanged, this);
    this._onTitleChanged(widget.title);
    this._content.addWidget(widget);
  }

  /**
   * The collapsed state of the panel.
   */
  get collapsed(): boolean {
    return this._collapsed;
  }
  set collapsed(value: boolean) {
    if (value === this._collapsed) {
      return;
    }
    if (value) {
      this._collapse();
    } else {
      this._uncollapse();
    }
  }

  /**
   * A signal for when the widget collapse state changes.
   */
  get collapseChanged(): ISignal<Collapser, void> {
    return this._collapseChanged;
  }

  /**
   * Toggle the collapse state of the panel.
   */
  toggle(): void {
    this.collapsed = !this.collapsed;
  }

  /**
   * Dispose the widget.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }

    // Delete references we explicitly hold to other widgets.
    this._header = null!;
    this._widget = null!;
    this._content = null!;

    super.dispose();
  }

  /**
   * Handle the DOM events for the Collapser widget.
   *
   * @param event - The DOM event sent to the panel.
   *
   * #### Notes
   * This method implements the DOM `EventListener` interface and is
   * called in response to events on the panel's DOM node. It should
   * not be called directly by user code.
   */
  handleEvent(event: Event): void {
    switch (event.type) {
      case 'click':
        this._evtClick(event as MouseEvent);
        break;
      default:
        break;
    }
  }

  protected onAfterAttach(msg: Message): void {
    this._header.node.addEventListener('click', this);
  }

  protected onBeforeDetach(msg: Message): void {
    this._header.node.removeEventListener('click', this);
  }

  private _collapse() {
    this._collapsed = true;
    if (this._content) {
      this._content.hide();
    }
    this._setHeader();
    this._collapseChanged.emit(void 0);
  }

  private _uncollapse() {
    this._collapsed = false;
    if (this._content) {
      this._content.show();
    }
    this._setHeader();
    this._collapseChanged.emit(void 0);
  }

  private _evtClick(event: MouseEvent) {
    this.toggle();
  }

  /**
   * Handle the `changed` signal of a title object.
   */
  private _onTitleChanged(sender: Title<Widget>): void {
    this._setHeader();
  }

  private _setHeader(): void {
    if (this._collapsed) {
      this._header.addClass(HEADER_COLLAPSED_CLASS);
    } else {
      this._header.removeClass(HEADER_COLLAPSED_CLASS);
    }
  }

  private _collapseChanged = new Signal<this, void>(this);
  private _collapsed: boolean;
  private _content: Panel;
  private _header: Widget;
  private _widget: T;
}

export namespace Collapser {
  export interface IOptions<T extends Widget = Widget> extends Widget.IOptions {
    widget: T;
    collapsed?: boolean;
  }
}
