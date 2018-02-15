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

import {
  Spinner
} from './spinner';

import {
  Toolbar
} from './toolbar';


/**
 * A widget which handles tab events according to JupyterLab convention.
 *
 * #### Notes
 * Mirrors all of the `title` attributes of the child.
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
    const content = this.content = options.content;
    if (!content.id) {
      content.id = uuid();
    }
    content.node.tabIndex = -1;
    const layout = this.layout = new BoxLayout();
    layout.direction = 'top-to-bottom';
    const toolbar = this.toolbar = options.toolbar || new Toolbar();

    const spinner = new Spinner();
    layout.addWidget(spinner);

    this.ready = options.ready || Promise.resolve(void 0);

    this._updateTitle();
    content.title.changed.connect(this._updateTitle, this);
    this.title.closable = true;
    this.title.changed.connect(this._updateContentTitle, this);
    content.disposed.connect(() => this.dispose());

    this.ready.then(() => {
      spinner.parent = null;
      layout.addWidget(toolbar);
      layout.addWidget(content);
      BoxLayout.setStretch(toolbar, 0);
      BoxLayout.setStretch(content, 1);
    });
  }

  /**
   * The content hosted by the widget.
   */
  readonly content: T;

  /**
   * The toolbar hosted by the widget.
   */
  readonly toolbar: Toolbar;

  /**
   * A promise that resolves when the main area widget is ready.
   *
   * #### Notes
   * The toolbar and content should not be considered programmatically
   * active until this promise has resolved.  A spinner will be shown
   * until the ready promise is fulfilled.
   */
   readonly ready: Promise<void>;

  /**
   * Handle the DOM events for the widget.
   *
   * @param event - The DOM event sent to the widget.
   *
   * #### Notes
   * This method implements the DOM `EventListener` interface and is
   * called in response to events on the dock panel's node. It should
   * not be called directly by user code.
   */
  handleEvent(event: Event): void {
    switch (event.type) {
    case 'mouseup':
    case 'mouseout':
      let target = event.target as HTMLElement;
      if (this.toolbar.node.contains(document.activeElement) &&
          target.tagName !== 'SELECT') {
        this.content.node.focus();
      }
      break;
    default:
      break;
    }
  }

  /**
   * Handle `after-attach` messages for the widget.
   */
  protected onAfterAttach(msg: Message): void {
    this.toolbar.node.addEventListener('mouseup', this);
    this.toolbar.node.addEventListener('mouseout', this);
  }

  /**
   * Handle `before-detach` messages for the widget.
   */
  protected onBeforeDetach(msg: Message): void {
    this.toolbar.node.removeEventListener('mouseup', this);
    this.toolbar.node.removeEventListener('mouseout', this);
  }

  /**
   * Handle `'activate-request'` messages.
   */
  protected onActivateRequest(msg: Message): void {
    if (!this.node.contains(document.activeElement)) {
      this.content.node.focus();
    }
    // Give the content a chance to activate.
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
    if (this._changeGuard) {
      return;
    }
    this._changeGuard = true;
    this.title.label = this.content.title.label;
    this.title.mnemonic = this.content.title.mnemonic;
    this.title.iconClass = this.content.title.iconClass;
    this.title.iconLabel = this.content.title.iconLabel;
    this.title.caption = this.content.title.caption;
    this.title.className = this.content.title.className;
    this.title.dataset = this.content.title.dataset;
    this._changeGuard = false;
  }

  /**
   * Update the content title based on attributes of the main widget.
   */
  private _updateContentTitle(): void {
    if (this._changeGuard) {
      return;
    }
    this._changeGuard = true;
    this.content.title.label = this.title.label;
    this.content.title.mnemonic = this.title.mnemonic;
    this.content.title.iconClass = this.title.iconClass;
    this.content.title.iconLabel = this.title.iconLabel;
    this.content.title.caption = this.title.caption;
    this.content.title.className = this.title.className;
    this.content.title.dataset = this.title.dataset;
    this._changeGuard = false;
  }

  private _changeGuard = false;
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
  interface IOptions<T extends Widget = Widget> extends Widget.IOptions {
    /**
     * The child widget to wrap.
     */
    content: T;

    /**
     * The toolbar to use for the widget.  Defaults to an empty toolbar.
     */
    toolbar?: Toolbar;

    /**
     * An optional promise for when the widget is ready.
     */
    ready?: Promise<void>;
  }
}
