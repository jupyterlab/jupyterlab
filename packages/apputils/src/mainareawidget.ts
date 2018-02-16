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
 * A widget meant to be contained in the JupyterLab main area.
 *
 * #### Notes
 * The content and the toolbar are populated asynchronously and
 * a spinner is shown until they are ready.
 * Mirrors all of the `title` attributes of the content.
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

    const layout = this.layout = new BoxLayout();
    layout.direction = 'top-to-bottom';
    this._spinner = new Spinner();
    layout.addWidget(this._spinner);

    this._toolbar = options.toolbar || new Toolbar();

    Promise.resolve(options.content).then(content => {
      if (this.isDisposed) {
        content.dispose();
        return;
      }
      this._content = content;
      let active = document.activeElement;
      this._spinner.parent = null;
      layout.addWidget(content);
      layout.addWidget(this._toolbar);
      BoxLayout.setStretch(this._toolbar, 0);
      BoxLayout.setStretch(content, 1);

      if (!content.id) {
        content.id = uuid();
      }
      content.node.tabIndex = -1;

      this._updateTitle();
      content.title.changed.connect(this._updateTitle, this);
      this.title.closable = true;
      this.title.changed.connect(this._updateContentTitle, this);
      content.disposed.connect(() => this.dispose());

      if (active === this._spinner.node) {
        this._focusContent();
      }
      this._spinner.dispose();
    });
  }

  /**
   * The content hosted by the widget.
   */
  readonly content(): T {
    return this._content;
  }

  /**
   * The toolbar hosted by the widget.
   */
  get toolbar(): Toolbar {
    return this._content ? this._toolbar : null;
  }

  /**
   * A promise fulfilled when the widget is ready.
   */
  readonly ready: Promise<void>;

  /**
   * Dispose of the resources used by the widget.
   */
  dispose(): void {
    this._toolbar.dispose();
    this._spinner.dispose();
    super.dispose();
  }

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
      if (this._content &&
          this._toolbar.node.contains(document.activeElement) &&
          target.tagName !== 'SELECT') {
        this._content.node.focus();
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
    this._toolbar.node.addEventListener('mouseup', this);
    this._toolbar.node.addEventListener('mouseout', this);
  }

  /**
   * Handle `before-detach` messages for the widget.
   */
  protected onBeforeDetach(msg: Message): void {
    this._toolbar.node.removeEventListener('mouseup', this);
    this._toolbar.node.removeEventListener('mouseout', this);
  }

  /**
   * Handle `'activate-request'` messages.
   */
  protected onActivateRequest(msg: Message): void {
    if (!this._content) {
      this._spinner.node.focus();
      return;
    }
    this._focusContent();
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
    const content = this._content;
    this.title.label = content.title.label;
    this.title.mnemonic = content.title.mnemonic;
    this.title.iconClass = content.title.iconClass;
    this.title.iconLabel = content.title.iconLabel;
    this.title.caption = content.title.caption;
    this.title.className = content.title.className;
    this.title.dataset = content.title.dataset;
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
    const content = this._content;
    content.title.label = this.title.label;
    content.title.mnemonic = this.title.mnemonic;
    content.title.iconClass = this.title.iconClass;
    content.title.iconLabel = this.title.iconLabel;
    content.title.caption = this.title.caption;
    content.title.className = this.title.className;
    content.title.dataset = this.title.dataset;
    this._changeGuard = false;
  }

  /**
   * Focus the content node.
   */
  private _focusContent(): void {
    if (!this.node.contains(document.activeElement)) {
      this._content.node.focus();
    }
    // Give the content a chance to activate.
    this._content.activate();
  }

  private _changeGuard = false;
  private _content: Widget | null = null;
  private _toolbar: Toolbar;
  private _spinner: Spinner;
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
    content: T | Promise<T>;

    /**
     * The toolbar to use for the widget.  Defaults to an empty toolbar.
     */
    toolbar?: Toolbar;
  }
}
