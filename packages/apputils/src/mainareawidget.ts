// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  uuid
} from '@jupyterlab/coreutils';

import {
  Message
} from '@phosphor/messaging';

import {
  BoxLayout, Widget
} from '@phosphor/widgets';


/**
 * A widget which handles tab events according to JupyterLab convention.
 *
 * #### Notes
 * Mirrors all of the `title` attributes of the child, except `closable`.
 * This widget is `closable` by default.
 * This widget is automatically disposed when closed.
 * This widget ensures its own focus when activated.
 */
export
class MainAreaWidget<T extends Widget = Widget> extends Widget {
  /**
   * Construct a new main area widget.
   *
   * @param options - The options for initializing the widget.
   */
  constructor(options: MainAreaWidget.IOptions<T>) {
    super(options);
    this.addClass('jp-MainAreaWidget');
    this.id = uuid();
    let content = this.content = options.content;
    if (!content.id) {
      content.id = uuid();
    }
    content.node.tabIndex = -1;
    let layout = this.layout = new BoxLayout();
    layout.direction = 'top-to-bottom';
    if (options.toolbar) {
      layout.addWidget(options.toolbar);
    } else {
      let toolbar = new Widget();
      toolbar.addClass('jp-MicroToolbar');
      layout.addWidget(toolbar);
      BoxLayout.setStretch(toolbar, 0);
    }
    layout.addWidget(content);
    this._updateTitle();
    content.title.changed.connect(this._updateTitle, this);
    this.title.closable = true;
  }

  /**
   * The content hosted by the widget.
   */
  readonly content: T;

  /**
   * Handle `'activate-request'` messages.
   */
  protected onActivateRequest(msg: Message): void {
    if (!this.node.contains(document.activeElement)) {
      this.content.node.focus();
    }
    this.content.activate();
  }

  /**
   * Handle `'close-request'` messages.
   */
  protected onCloseRequest(msg: Message): void {
    this.dispose();
  }

  /**
   * Update the title based on the attributes of the child widget.
   */
  private _updateTitle(): void {
    this.title.label = this.content.title.label;
    this.title.mnemonic = this.content.title.mnemonic;
    this.title.iconClass = this.content.title.iconClass;
    this.title.iconLabel = this.content.title.iconLabel;
    this.title.caption = this.content.title.caption;
    this.title.className = this.content.title.className;
    this.title.dataset = this.content.title.dataset;
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
  interface IOptions<T extends Widget> extends Widget.IOptions {
    /**
     * The child widget to wrap.
     */
    content: T;

    /**
     * The toolbar to use for the widget.  Defaults to a micro toolbar.
     */
    toolbar?: Widget;
  }
}
