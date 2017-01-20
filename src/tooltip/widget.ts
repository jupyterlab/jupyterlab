// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Message
} from 'phosphor/lib/core/messaging';

import {
  PanelLayout
} from 'phosphor/lib/ui/panel';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  TooltipModel
} from './model';


/**
 * The class name added to each tooltip.
 */
const TOOLTIP_CLASS = 'jp-Tooltip';


/**
 * A tooltip widget.
 */
export
class TooltipWidget extends Widget {
  /**
   * Instantiate a tooltip.
   */
  constructor(options: TooltipWidget.IOptions) {
    super();
    this.layout = new PanelLayout();
    this.model = options.model;
    this.model.contentChanged.connect(this._onContentChanged, this);
    this.addClass(TOOLTIP_CLASS);
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose(): void {
    if (this._content === null) {
      return;
    }
    this._content.dispose();
    this._content = null;
    super.dispose();
  }

  /**
   * The tooltip widget's data model.
   */
  readonly model: TooltipModel;

  /**
   * Handle `'activate-request'` messages.
   */
  protected onActivateRequest(msg: Message): void {
    this.node.tabIndex = -1;
    this.node.focus();
  }

  /**
   * Handle `'after-attach'` messages.
   */
  protected onAfterAttach(msg: Message): void {
    this.model.fetch();
  }

  /**
   * Handle `'update-request'` messages.
   */
  protected onUpdateRequest(msg: Message): void {
    let layout = this.layout as PanelLayout;
    if (this._content) {
      layout.addWidget(this._content);
    }
    super.onUpdateRequest(msg);
  }

  /**
   * Handle model content changes.
   */
  private _onContentChanged(): void {
    if (this._content) {
      this._content.dispose();
    }
    this._content = this.model.content;
    this.update();
  }

  private _content: Widget = null;
}

/**
 * A namespace for tooltip widget statics.
 */
export
namespace TooltipWidget {
  /**
   * Instantiation options for a tooltip widget.
   */
  export
  interface IOptions {
    /**
     * The data model for the tooltip widget.
     */
    model: TooltipModel;
  }
}
