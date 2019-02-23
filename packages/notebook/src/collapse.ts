// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Widget, Panel, PanelLayout, Title } from '@phosphor/widgets';
import { ISignal, Signal } from '@phosphor/signaling';

/**
 * A panel that supports a collapsible header, made from the widget's title.
 * Clicking on the title expands or contracts the widget.
 */
export class Collapse<T extends Widget = Widget> extends Widget {
  constructor(options: Collapse.IOptions<T> = {}) {
    super(options);
    this.addClass('jp-Collapse');
    this._header = new Widget();
    this._header.addClass('jp-Collapse-header');
    this._header.node.addEventListener('click', this);
    this._content = new Panel();
    this._content.addClass('jp-Collapse-contents');

    let layout = new PanelLayout();
    this.layout = layout;
    layout.addWidget(this._header);
    layout.addWidget(this._content);
    if (options.widget) {
      this.widget = options.widget;
    }
    this.collapsed = false;
  }

  dispose() {
    if (this.isDisposed) {
      return;
    }
    super.dispose();
    this._header = null;
    this._widget = null;
    this._content = null;
  }

  get widget(): T {
    return this._widget;
  }

  set widget(widget: T) {
    let oldWidget = this._widget;
    if (oldWidget) {
      oldWidget.title.changed.disconnect(this._onTitleChanged, this);
      oldWidget.parent = null;
    }
    this._widget = widget;
    widget.title.changed.connect(
      this._onTitleChanged,
      this
    );
    this._onTitleChanged(widget.title);
    this._content.addWidget(widget);
  }

  get collapsed() {
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

  toggle() {
    this.collapsed = !this.collapsed;
  }

  get collapseChanged(): ISignal<Collapse, void> {
    return this._collapseChanged;
  }

  private _collapse() {
    this._collapsed = true;
    if (this._content) {
      this._content.hide();
    }
    this.removeClass('jp-Collapse-open');
    this._collapseChanged.emit(void 0);
  }
  private _uncollapse() {
    this._collapsed = false;
    if (this._content) {
      this._content.show();
    }
    this.addClass('jp-Collapse-open');
    this._collapseChanged.emit(void 0);
  }

  /**
   * Handle the DOM events for the Collapse widget.
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

  private _evtClick(event: MouseEvent) {
    this.toggle();
  }

  /**
   * Handle the `changed` signal of a title object.
   */
  private _onTitleChanged(sender: Title<Widget>): void {
    this._header.node.textContent = this._widget.title.label;
  }

  private _collapseChanged = new Signal<Collapse, void>(this);

  _collapsed: boolean;
  _content: Panel;
  _widget: T;
  _header: Widget;
}

export namespace Collapse {
  export interface IOptions<T extends Widget = Widget> extends Widget.IOptions {
    widget?: T;
  }
}
