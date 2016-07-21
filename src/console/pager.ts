// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  PanelLayout
} from 'phosphor-panel';

import {
  Widget
} from 'phosphor-widget';

/**
 * The class name added to pager widgets.
 */
const PAGER_CLASS = 'jp-ConsolePager';

/**
 * A pager widget for a console.
 */
export
class ConsolePager extends Widget {
  /**
   * Construct a console pager widget.
   */
  constructor() {
    super();
    this.addClass(PAGER_CLASS);
    this.layout = new PanelLayout();
    this.hide();
  }

  /**
   * The semantic parent of the pager, its reference widget.
   */
  get reference(): Widget {
    return this._reference;
  }
  set reference(widget: Widget) {
    this._reference = widget;
  }

  /**
   * The text of the pager.
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

  private _reference: Widget = null;
  private _content: Widget = null;
}
