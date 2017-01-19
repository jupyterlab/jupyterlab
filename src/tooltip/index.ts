// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Message
} from 'phosphor/lib/core/messaging';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  CodeEditor
} from '../codeeditor';


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
    this.editor = options.editor;
    this.addClass(TOOLTIP_CLASS);
  }

  /**
   * The editor referent of the tooltip widget.
   */
  readonly editor: CodeEditor.IEditor;

  /**
   * Handle `'activate-request'` messages.
   */
  protected onActivateRequest(msg: Message): void {
    this.node.tabIndex = -1;
    this.node.focus();
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
     * The editor referent of the tooltip widget.
     */
    editor: CodeEditor.IEditor;
  }
}
