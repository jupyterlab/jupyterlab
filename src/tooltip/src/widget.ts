// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JSONObject
} from '@phosphor/coreutils';

import {
  Message
} from '@phosphor/messaging';

import {
  PanelLayout
} from '@phosphor/widgets';

import {
  Widget
} from '@phosphor/widgets';

import {
  CodeEditor
} from '@jupyterlab/codeeditor';

import {
  HoverBox
} from '@jupyterlab/apputils';

import {
  IRenderMime, MimeModel
} from '@jupyterlab/rendermime';


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

    this.addClass(TOOLTIP_CLASS);
    this.anchor.addClass(ANCHOR_CLASS);

    this._editor = options.editor;
    this._rendermime = options.rendermime;
    let model = new MimeModel({
      data: options.bundle,
      trusted: true
    });
    this._content = this._rendermime.render(model);
    if (this._content) {
      (this.layout as PanelLayout).addWidget(this._content);
    }
  }

  /**
   * The anchor widget that the tooltip widget tracks.
   */
  readonly anchor: Widget;

  /**
   * Dispose of the resources held by the widget.
   */
  dispose(): void {
    if (this.anchor && !this.anchor.isDisposed) {
      this.anchor.removeClass(ANCHOR_CLASS);
    }
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
      if (this.node.contains(event.target as HTMLElement)) {
        if ((event as KeyboardEvent).keyCode === 27) { // Escape key
          this.dispose();
        }
        return;
      }
      this.dispose();
      break;
    case 'mousedown':
      if (this.node.contains(event.target as HTMLElement)) {
        this.activate();
        return;
      }
      this.dispose();
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
    this.update();
  }

  /**
   * Handle `before-detach` messages for the widget.
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
   * Handle scroll events for the widget
   */
  private _evtScroll(event: MouseEvent) {
    // All scrolls except scrolls in the actual hover box node may cause the
    // referent editor that anchors the node to move, so the only scroll events
    // that can safely be ignored are ones that happen inside the hovering node.
    if (this.node.contains(event.target as HTMLElement)) {
      return;
    }

    this.update();
  }

  /**
   * Set the geometry of the tooltip widget.
   */
  private _setGeometry():  void {
    // Find the start of the current token for hover box placement.
    const editor = this._editor;
    const cursor = editor.getCursorPosition();
    const end = editor.getOffsetAt(cursor);
    const line = editor.getLine(cursor.line);
    const tokens = line.substring(0, end).split(/\W+/);
    const last = tokens[tokens.length - 1];
    const start = last ? end - last.length : end;
    const position = editor.getPositionAt(start);
    const anchor = editor.getCoordinateForPosition(position) as ClientRect;
    const style = window.getComputedStyle(this.node);
    const paddingLeft = parseInt(style.paddingLeft, 10) || 0;

    // Calculate the geometry of the tooltip.
    HoverBox.setGeometry({
      anchor,
      host: editor.host,
      maxHeight: MAX_HEIGHT,
      minHeight: MIN_HEIGHT,
      node: this.node,
      offset: { horizontal: -1 * paddingLeft },
      privilege: 'below'
    });
  }

  private _content: Widget | null = null;
  private _editor: CodeEditor.IEditor;
  private _rendermime: IRenderMime;
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
     * The data that populates the tooltip widget.
     */
    bundle: JSONObject;

    /**
     * The editor referent of the tooltip model.
     */
    editor: CodeEditor.IEditor;

    /**
     * The rendermime instance used by the tooltip model.
     */
    rendermime: IRenderMime;
  }
}
