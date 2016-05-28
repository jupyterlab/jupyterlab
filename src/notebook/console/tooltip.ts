// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  IKernel
} from 'jupyter-js-services';

import {
  RenderMime
} from 'jupyter-js-ui/lib/rendermime';

import {
  Message
} from 'phosphor-messaging';

import {
  PanelLayout
} from 'phosphor-panel';

import {
  Widget
} from 'phosphor-widget';

import {
  CellEditorWidget, ITextChange
} from '../cells/editor';

import {
  nbformat
} from '../notebook';


/**
 * The class name added to tooltip widgets.
 */
const TOOLTIP_CLASS = 'jp-ConsoleTooltip';


/**
 * A tooltip widget for a console.
 */
export
class ConsoleTooltip extends Widget {
  /**
   * Construct a console tooltip widget.
   */
  constructor(rendermime: RenderMime<Widget>) {
    super();
    this.addClass(TOOLTIP_CLASS);
    this._rendermime = rendermime;
    this.hide();
    this.layout = new PanelLayout();
  }

  /**
   * The kernel used for handling completions.
   */
  get kernel(): IKernel {
    return this._kernel;
  }
  set kernel(value: IKernel) {
    this._kernel = value;
  }

  /**
   * The current code cell editor.
   */
  get editor(): CellEditorWidget {
    return this._editor;
  }
  set editor(value: CellEditorWidget) {
    // Remove existing signals.
    if (this._editor) {
      this._editor.textChanged.disconnect(this.onTextChange, this);
    }
    this._editor = value;
    value.textChanged.connect(this.onTextChange, this);
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
    case 'keydown':
      this._evtKeydown(event as KeyboardEvent);
      break;
    case 'mousedown':
      this._evtMousedown(event as MouseEvent);
      break;
    default:
      return;
    }
  }

  /**
   * Handle `after_attach` messages for the widget.
   *
   * #### Notes
   * Captures document events in the capture phase to dismiss the tooltip.
   */
  protected onAfterAttach(msg: Message): void {
    document.addEventListener('keydown', this, true);
    document.addEventListener('mousedown', this, true);
  }

  /**
   * Handle `before_detach` messages for the widget.
   */
  protected onBeforeDetach(msg: Message): void {
    document.removeEventListener('keydown', this);
    document.removeEventListener('mousedown', this);
  }

  /**
   * Handle `update_request` messages.
   */
  protected onUpdateRequest(msg: Message): void {
    this.show();
    // Set the dimensions of the tooltip widget.
    Private.setBoundingClientRect(this.node, this._rect);
  }

  /**
   * Handle a text change on the editor widget..
   */
  protected onTextChange(widget: CellEditorWidget, args: ITextChange): void {
    if (!args.newValue || !this._kernel) {
      this.hide();
      return;
    }
    let currentLine = args.newValue.split('\n')[args.line];
    // If final character is whitespace, hide the tooltip.
    if (!currentLine[args.ch - 1] || !currentLine[args.ch - 1].match(/\S/)) {
      this.hide();
      return;
    }
    let contents = { code: currentLine, cursor_pos: args.ch, detail_level: 0 };
    let pendingInspect = ++this._pendingInspect;
    this._kernel.inspect(contents).then(value => {
      // If widget has been disposed, bail.
      if (this.isDisposed) {
        return;
      }
      // If a newer text change has created a pending request, bail.
      if (pendingInspect !== this._pendingInspect) {
        return;
      }
      // Tooltip request failures or negative results fail silently.
      if (value.status !== 'ok' || !value.found) {
        return;
      }
      let bundle = Private.processInspectReply(value.data);
      let content = this._rendermime.render(bundle);
      this.showTooltip(args, content);
    });
  }

  /**
   * Show the tooltip.
   */
  protected showTooltip(change: ITextChange, content: Widget): void {
    let layout = this.layout as PanelLayout;
    let prev = layout.childAt(0);
    if (prev) {
      prev.dispose();
    }
    layout.addChild(content);

    let {top, left} = change.coords;
    // Offset the height of the tooltip by the height of cursor characters.
    top += change.chHeight;
    // Account for 1px border width.
    left += 1;

    // Account for 1px border on top and bottom.
    let maxHeight = window.innerHeight - top - 2;
    // Account for 1px border on both sides.
    let maxWidth = window.innerWidth - left - 2;

    this.setRect({top, left} as ClientRect);
    this.node.style.maxHeight = `${maxHeight}px`;
    this.node.style.maxWidth = `${maxWidth}px`;
    if (this.isHidden) {
      this.show();
    }
  }

  /**
   * Set the client rect of the tooltip.
   */
  protected setRect(rect: ClientRect): void {
    if (Private.matchClientRects(this._rect, rect)) {
      return;
    }
    this._rect = rect;
    if (this.isVisible) {
      this.update();
    }
  }

  /**
   * Handle keydown events for the widget.
   *
   * #### Notes
   * Hides the tooltip if a keydown happens anywhere on the document outside
   * of either the tooltip or its parent.
   */
  private _evtKeydown(event: KeyboardEvent) {
    let target = event.target as HTMLElement;

    if (!this._editor) {
      this.hide();
      return;
    }

    if (this.isHidden) {
      return;
    }

    while (target !== document.documentElement) {
      if (target === this._editor.node) {
        if (event.keyCode === 27) { // Escape key
          this.hide();
        }
        return;
      }
      target = target.parentElement;
    }
    this.hide();
  }

  /**
   * Handle mousedown events for the widget.
   *
   * #### Notes
   * Hides the tooltip if a mousedown happens anywhere outside the tooltip.
   */
  private _evtMousedown(event: MouseEvent) {
    let target = event.target as HTMLElement;
    while (target !== document.documentElement) {
      if (target === this.node) {
        return;
      }
      target = target.parentElement;
    }
    this.hide();
  }

  private _rect: ClientRect = null;
  private _kernel: IKernel = null;
  private _editor: CellEditorWidget = null;
  private _pendingInspect = 0;
  private _rendermime: RenderMime<Widget> = null;
}


/**
 * A namespace for ConsoleTooltip widget private data.
 */
namespace Private {
  /**
   * Process the IInspectReply plain text data.
   *
   * @param bundle - The MIME bundle of an API inspect reply.
   *
   * #### Notes
   * The `text/plain` value sent by the API in inspect replies contains ANSI
   * terminal escape sequences. In order for these sequences to be parsed into
   * usable data in the client, they must have the MIME type that the console
   * text renderer expects: `application/vnd.jupyter.console-text`.
   */
  export
  function processInspectReply(bundle: nbformat.MimeBundle): nbformat.MimeBundle {
    let textMime = 'text/plain';
    let consoleMime = 'application/vnd.jupyter.console-text';
    bundle[consoleMime] = bundle[consoleMime] || bundle[textMime];
    return bundle;
  }

  /**
   * Compare two client rectangles.
   *
   * @param r1 - The first client rectangle.
   *
   * @param r2 - The second client rectangle.
   *
   * @returns `true` if the two rectangles have the same dimensions.
   *
   * #### Notes
   * `bottom` and `right` values are ignored as it is sufficient to provide
   * `top`, `left`, `width`, and `height` values.
   * This function is *not* for general-purpose use; it is specific to tooltip
   * widget because it ignores `bottom` and `right`.
   */
  export
  function matchClientRects(r1: ClientRect, r2: ClientRect): boolean {
    // Check identity in case both items are null or undefined.
    if (r1 === r2 || !r1 && !r2) {
      return true;
    }
    // If one item is null or undefined, items don't match.
    if (!r1 || !r2) {
      return false;
    }
    return (r1.top === r2.top &&
            r1.left === r2.left &&
            r1.right === r2.right &&
            r1.width === r2.width &&
            r1.height === r2.height);
  }

  /**
   * Set the dimensions of an element.
   *
   * @param elem - The element of interest.
   *
   * @param rect - The dimensions of the element.
   *
   * #### Notes
   * Any `rect` members whose values are not numbers (i.e., `undefined` or
   * `null`) will be set to `'auto'`.
   */
  export
  function setBoundingClientRect(elem: HTMLElement, rect: ClientRect): void {
    let { top, left, bottom, right, width, height } = rect;
    elem.style.top = typeof top !== 'number' ? 'auto' : `${top}px`;
    elem.style.left = typeof left !== 'number' ? 'auto' : `${left}px`;
    elem.style.bottom = typeof bottom !== 'number' ? 'auto' : `${bottom}px`;
    elem.style.right = typeof right !== 'number' ? 'auto' : `${right}px`;
    elem.style.width = typeof width !== 'number' ? 'auto' : `${width}px`;
    elem.style.height = typeof height !== 'number' ? 'auto' : `${height}px`;
  }
}
