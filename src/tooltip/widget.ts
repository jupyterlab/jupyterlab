// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Message
} from 'phosphor/lib/core/messaging';

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
    this.model = options.model;
    this.addClass(TOOLTIP_CLASS);
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
    super.onUpdateRequest(msg);
  }
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
