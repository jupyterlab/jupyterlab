// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Widget
} from 'phosphor/lib/ui/widget';


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
  constructor() {
    super();
    this.addClass(TOOLTIP_CLASS);
  }

}
