// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Message
} from '@phosphor/messaging';

import {
  Layout, PanelLayout, Widget
} from '@phosphor/widgets';


/**
 * A widget which handles tab events according to JupyterLab convention.
 */
export
class MainAreaWidget extends Widget {
  /**
   * Construct a new main area widget.
   *
   * @param options - The options for initializing the widget.
   */
  constructor(options: MainAreaWidget.IOptions = {}) {
    super(options);
    this.node.tabIndex = -1;
    this.addClass('jp-MainAreaWidget');
    this.layout = Private.createLayout(options);
  }

  /**
   * Handle `'activate-request'` messages.
   */
  protected onActivateRequest(msg: Message): void {
    this.node.focus();
  }

  /**
   * Handle `'close-request'` messages.
   */
  protected onCloseRequest(msg: Message): void {
    this.dispose();
  }
}

/**
 * The namespace for the `MainAreaWidget` class statics.
 */
export
namespace MainAreaWidget {
  /**
   * An options object for creating a main area widget.
   */
  export
  interface IOptions extends Widget.IOptions {
    /**
     * The layout to use for the main area widget.
     *
     * The default is a new `PanelLayout`.
     */
    layout?: Layout;
  }
}

/**
 * The namespace for the module implementation details.
 */
namespace Private {
  /**
   * Create a layout for the given options.
   */
  export
  function createLayout(options: MainAreaWidget.IOptions): Layout {
    return options.layout || new PanelLayout();
  }
}
