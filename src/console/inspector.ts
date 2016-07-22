// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  PanelLayout
} from 'phosphor-panel';

import {
  Widget
} from 'phosphor-widget';


/**
 * The class name added to inspector widgets.
 */
const INSPECTOR_CLASS = 'jp-ConsoleInspector';


/**
 * An inspector widget for a console.
 */
export
class ConsoleInspector extends Widget {
  /**
   * Construct a console inspector widget.
   */
  constructor() {
    super();
    this.addClass(INSPECTOR_CLASS);
    this.layout = new PanelLayout();
  }

  /**
   * The text of the inspector.
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
   * The display rank of the inspector.
   */
  get rank(): number {
    return this._rank;
  }
  set rank(newValue: number) {
    this._rank = newValue;
  }

  private _content: Widget = null;
  private _rank: number = Infinity;
}
