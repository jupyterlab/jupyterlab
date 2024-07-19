// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { HoverBox } from '@jupyterlab/ui-components';
import { CodeEditor } from '@jupyterlab/codeeditor';
import {
  IRenderMime,
  IRenderMimeRegistry,
  MimeModel
} from '@jupyterlab/rendermime';
import { JSONObject } from '@lumino/coreutils';
import { Message } from '@lumino/messaging';
import { PanelLayout, Widget } from '@lumino/widgets';

/**
 * The class name added to each tooltip.
 */
const TOOLTIP_CLASS = 'jp-Tooltip';

/**
 * The class name added to the tooltip content.
 */
const CONTENT_CLASS = 'jp-Tooltip-content';

/**
 * The class added to the body when a tooltip exists on the page.
 */
const BODY_CLASS = 'jp-mod-tooltip';

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
export class Tooltip extends Widget {
  /**
   * Instantiate a tooltip.
   */
  constructor(options: Tooltip.IOptions) {
    super();

    this.addClass('jp-ThemedContainer');

    const layout = (this.layout = new PanelLayout());
    const model = new MimeModel({ data: options.bundle });

    this.anchor = options.anchor;
    this.addClass(TOOLTIP_CLASS);
    this.hide();
    this._editor = options.editor;
    this._position = options.position;
    this._rendermime = options.rendermime;

    const mimeType = this._rendermime.preferredMimeType(options.bundle, 'any');

    if (!mimeType) {
      return;
    }

    this._content = this._rendermime.createRenderer(mimeType);
    this._content
      .renderModel(model)
      .then(() => this._setGeometry())
      .catch(error => console.error('tooltip rendering failed', error));
    this._content.addClass(CONTENT_CLASS);
    layout.addWidget(this._content);
  }

  /**
   * The anchor widget that the tooltip widget tracks.
   */
  readonly anchor: Widget;

  /**
   * Dispose of the resources held by the widget.
   */
  dispose(): void {
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

    const { node } = this;
    const target = event.target as HTMLElement;

    switch (event.type) {
      case 'keydown':
        if (node.contains(target)) {
          return;
        }
        this.dispose();
        break;
      case 'mousedown':
        if (node.contains(target)) {
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
    this.node.tabIndex = 0;
    this.node.focus();
  }

  /**
   * Handle `'after-attach'` messages.
   */
  protected onAfterAttach(msg: Message): void {
    document.body.classList.add(BODY_CLASS);
    document.addEventListener('keydown', this, USE_CAPTURE);
    document.addEventListener('mousedown', this, USE_CAPTURE);
    this.anchor.node.addEventListener('scroll', this, USE_CAPTURE);
    this.update();
  }

  /**
   * Handle `before-detach` messages for the widget.
   */
  protected onBeforeDetach(msg: Message): void {
    document.body.classList.remove(BODY_CLASS);
    document.removeEventListener('keydown', this, USE_CAPTURE);
    document.removeEventListener('mousedown', this, USE_CAPTURE);
    this.anchor.node.removeEventListener('scroll', this, USE_CAPTURE);
  }

  /**
   * Handle `'update-request'` messages.
   */
  protected onUpdateRequest(msg: Message): void {
    if (this.isHidden) {
      this.show();
    }
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
   * Find the position of the first character of the current token.
   */
  private _getTokenPosition(): CodeEditor.IPosition | undefined {
    const editor = this._editor;
    const cursor = editor.getCursorPosition();
    const end = editor.getOffsetAt(cursor);
    const line = editor.getLine(cursor.line);

    if (!line) {
      return;
    }

    const tokens = line.substring(0, end).split(/\W+/);
    const last = tokens[tokens.length - 1];
    const start = last ? end - last.length : end;
    return editor.getPositionAt(start);
  }

  /**
   * Set the geometry of the tooltip widget.
   */
  private _setGeometry(): void {
    // determine position for hover box placement
    const position = this._position ? this._position : this._getTokenPosition();

    if (!position) {
      return;
    }

    const editor = this._editor;

    const anchor = editor.getCoordinateForPosition(position);

    if (!anchor) {
      return;
    }

    const style = window.getComputedStyle(this.node);
    const paddingLeft = parseInt(style.paddingLeft!, 10) || 0;

    const host =
      (editor.host.closest('.jp-MainAreaWidget > .lm-Widget') as HTMLElement) ||
      editor.host;

    // Calculate the geometry of the tooltip.
    HoverBox.setGeometry({
      anchor,
      host,
      maxHeight: MAX_HEIGHT,
      minHeight: MIN_HEIGHT,
      node: this.node,
      offset: { horizontal: -1 * paddingLeft },
      privilege: 'below',
      outOfViewDisplay: {
        top: 'stick-inside',
        bottom: 'stick-inside'
      },
      style: style
    });
  }

  private _content: IRenderMime.IRenderer | null = null;
  private _editor: CodeEditor.IEditor;
  private _position: CodeEditor.IPosition | undefined;
  private _rendermime: IRenderMimeRegistry;
}

/**
 * A namespace for tooltip widget statics.
 */
export namespace Tooltip {
  /**
   * Instantiation options for a tooltip widget.
   */
  export interface IOptions {
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
    rendermime: IRenderMimeRegistry;

    /**
     * Position at which the tooltip should be placed.
     *
     * If not given, the position of the first character
     * in the current token will be used.
     */
    position?: CodeEditor.IPosition;
  }
}
