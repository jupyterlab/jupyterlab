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
  HoverBox
} from '../common/hoverbox';

import {
  TooltipModel
} from './model';


/**
 * The class name added to each tooltip.
 */
const TOOLTIP_CLASS = 'jp-Tooltip';

/**
 * The class added to widgets that have spawned a tooltip and anchor it.
 */
const ANCHOR_CLASS = 'jp-Tooltip-anchor';

/**
 * The minimum height of a tooltip widget.
 */
const MIN_HEIGHT = 20;

/**
 * The maximum height of a tooltip widget.
 */
const MAX_HEIGHT = 250;

/**
 * A flag to indicate that event handlers are caught in the capture phase.
 */
const USE_CAPTURE = true;

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
    this.anchor = options.anchor;
    this.model = options.model;
    this.model.contentChanged.connect(this._onContentChanged, this);
    this.addClass(TOOLTIP_CLASS);
    this.anchor.addClass(ANCHOR_CLASS);
  }

  /**
   * The anchor widget that the tooltip widget tracks.
   */
  readonly anchor: Widget;

  /**
   * The tooltip widget's data model.
   */
  readonly model: TooltipModel;

  /**
   * Dispose of the resources held by the widget.
   */
  dispose(): void {
    this.anchor.removeClass(ANCHOR_CLASS);
    if (this._content) {
      this._content.dispose();
      this._content = null;
    }
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
    if (this.isHidden || this.isDisposed) {
      return;
    }
    switch (event.type) {
    case 'keydown':
    case 'mousedown':
      this._dismiss(event);
      break;
    case 'scroll':
      this._evtScroll(event as MouseEvent);
      break;
    default:
      break;
    }
  }

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
    document.addEventListener('keydown', this, USE_CAPTURE);
    document.addEventListener('mousedown', this, USE_CAPTURE);
    this.anchor.node.addEventListener('scroll', this, USE_CAPTURE);
    this.model.fetch();
  }

  /**
   * Handle `before_detach` messages for the widget.
   */
  protected onBeforeDetach(msg: Message): void {
    document.removeEventListener('keydown', this, USE_CAPTURE);
    document.removeEventListener('mousedown', this, USE_CAPTURE);
    this.anchor.node.removeEventListener('scroll', this, USE_CAPTURE);
  }

  /**
   * Handle `'update-request'` messages.
   */
  protected onUpdateRequest(msg: Message): void {
    this._setGeometry();
    super.onUpdateRequest(msg);
  }

  /**
   * Dismiss the tooltip if necessary.
   */
  private _dismiss(event: Event): void {
    if (this.node.contains(event.target as HTMLElement)) {
      return;
    }
    this.dispose();
  }

  /**
   * Handle scroll events for the widget
   */
  private _evtScroll(event: MouseEvent) {
    this.update();
  }

  /**
   * Handle model content changes.
   */
  private _onContentChanged(): void {
    if (this._content) {
      this._content.dispose();
    }
    this._content = this.model.content;
    if (this._content) {
      (this.layout as PanelLayout).addWidget(this._content);
    }
    this.update();
  }

  /**
   * Set the geometry of the tooltip widget.
   */
  private _setGeometry():  void {
    let node = this.node;
    let editor = this.model.editor;
    let { charWidth, lineHeight } = editor;
    let coords = editor.getCoordinate(editor.getCursorPosition());

    // Calculate the geometry of the completer.
    HoverBox.setGeometry({
      charWidth, coords, lineHeight, node,
      anchor: this.anchor.node,
      anchorPoint: this.anchor.node.scrollTop,
      cursor: { start: 0, end: 0 },
      maxHeight: MAX_HEIGHT,
      minHeight: MIN_HEIGHT
    });
  }

  private _content: Widget | null = null;
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
     * The anchor widget that the tooltip widget tracks.
     */
    anchor: Widget;

    /**
     * The data model for the tooltip widget.
     */
    model: TooltipModel;
  }
}
