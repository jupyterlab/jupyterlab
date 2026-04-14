// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

/**
 * Layout subclasses that use `widget.attachmentNode` (when available)
 * instead of `widget.node` for DOM insertion and removal. This is
 * needed to support `ShadowDOMWidget`, where the widget's node lives
 * inside a shadow root wrapper (`attachmentNode`).
 *
 * These layouts mirror the original Lumino layout implementations but
 * delegate to `getAttachmentNode()` for the DOM node to attach/detach.
 */

import type { ShadowDOMWidget } from '@jupyterlab/apputils';
import { DockPanelSvg } from '@jupyterlab/ui-components';
import { MessageLoop } from '@lumino/messaging';
import type {
  DockPanel,
  SplitLayout as SplitLayoutType
} from '@lumino/widgets';
import {
  BoxLayout,
  BoxSizer,
  DockLayout,
  LayoutItem,
  SplitLayout,
  StackedLayout,
  Widget
} from '@lumino/widgets';
import { ArrayExt } from '@lumino/algorithm';

/**
 * Return the node that should be inserted into the parent's DOM.
 *
 * For `ShadowDOMWidget` instances this is the `attachmentNode` (a wrapper
 * element whose shadow root contains the real widget node). For plain
 * `Widget` instances it falls back to `widget.node`.
 */
function getAttachmentNode(widget: Widget): HTMLElement {
  return (widget as unknown as ShadowDOMWidget).attachmentNode ?? widget.node;
}

/**
 * A `BoxLayout` that attaches/detaches widgets via `attachmentNode`.
 */
export class ShadowBoxLayout extends BoxLayout {
  protected attachWidget(index: number, widget: Widget): void {
    // Create and add a new layout item for the widget.
    ArrayExt.insert(
      (this as any)._items as LayoutItem[],
      index,
      new LayoutItem(widget)
    );

    // Create and add a new sizer for the widget.
    ArrayExt.insert((this as any)._sizers as BoxSizer[], index, new BoxSizer());

    // Send a `'before-attach'` message if the parent is attached.
    if (this.parent!.isAttached) {
      MessageLoop.sendMessage(widget, Widget.Msg.BeforeAttach);
    }

    // Add the widget's attachment node to the parent.
    this.parent!.node.appendChild(getAttachmentNode(widget));

    // Send an `'after-attach'` message if the parent is attached.
    if (this.parent!.isAttached) {
      MessageLoop.sendMessage(widget, Widget.Msg.AfterAttach);
    }

    // Post a fit request for the parent widget.
    this.parent!.fit();
  }

  protected detachWidget(index: number, widget: Widget): void {
    // Remove the layout item for the widget.
    const item = ArrayExt.removeAt((this as any)._items as LayoutItem[], index);

    // Remove the sizer for the widget.
    ArrayExt.removeAt((this as any)._sizers as BoxSizer[], index);

    // Send a `'before-detach'` message if the parent is attached.
    if (this.parent!.isAttached) {
      MessageLoop.sendMessage(widget, Widget.Msg.BeforeDetach);
    }

    // Remove the widget's attachment node from the parent.
    this.parent!.node.removeChild(getAttachmentNode(widget));

    // Send an `'after-detach'` message if the parent is attached.
    if (this.parent!.isAttached) {
      MessageLoop.sendMessage(widget, Widget.Msg.AfterDetach);
    }

    // Dispose of the layout item.
    item!.dispose();

    // Post a fit request for the parent widget.
    this.parent!.fit();
  }
}

/**
 * A `SplitLayout` that attaches/detaches widgets via `attachmentNode`.
 */
export class ShadowSplitLayout extends SplitLayout {
  protected attachWidget(index: number, widget: Widget): void {
    // Create the item, handle, and sizer for the new widget.
    const item = new LayoutItem(widget);
    const handle = Private.createHandle(this.renderer);
    const average = Private.averageSizerSize(
      (this as any)._sizers as BoxSizer[]
    );
    const sizer = Private.createSizer(average);

    // Insert the item, handle, and sizer into the internal arrays.
    ArrayExt.insert((this as any)._items as LayoutItem[], index, item);
    ArrayExt.insert((this as any)._sizers as BoxSizer[], index, sizer);
    ArrayExt.insert((this as any)._handles as HTMLDivElement[], index, handle);

    // Send a `'before-attach'` message if the parent is attached.
    if (this.parent!.isAttached) {
      MessageLoop.sendMessage(widget, Widget.Msg.BeforeAttach);
    }

    // Add the widget's attachment node and handle to the parent.
    this.parent!.node.appendChild(getAttachmentNode(widget));
    this.parent!.node.appendChild(handle);

    // Send an `'after-attach'` message if the parent is attached.
    if (this.parent!.isAttached) {
      MessageLoop.sendMessage(widget, Widget.Msg.AfterAttach);
    }

    // Post a fit request for the parent widget.
    this.parent!.fit();
  }

  protected detachWidget(index: number, widget: Widget): void {
    // Remove the item, handle, and sizer for the widget.
    const item = ArrayExt.removeAt((this as any)._items as LayoutItem[], index);
    const handle = ArrayExt.removeAt(
      (this as any)._handles as HTMLDivElement[],
      index
    );
    ArrayExt.removeAt((this as any)._sizers as BoxSizer[], index);

    // Send a `'before-detach'` message if the parent is attached.
    if (this.parent!.isAttached) {
      MessageLoop.sendMessage(widget, Widget.Msg.BeforeDetach);
    }

    // Remove the widget's attachment node and handle from the parent.
    this.parent!.node.removeChild(getAttachmentNode(widget));
    this.parent!.node.removeChild(handle!);

    // Send an `'after-detach'` message if the parent is attached.
    if (this.parent!.isAttached) {
      MessageLoop.sendMessage(widget, Widget.Msg.AfterDetach);
    }

    // Dispose of the layout item.
    item!.dispose();

    // Post a fit request for the parent widget.
    this.parent!.fit();
  }
}

/**
 * A `StackedLayout` that attaches/detaches widgets via `attachmentNode`.
 */
export class ShadowStackedLayout extends StackedLayout {
  protected attachWidget(index: number, widget: Widget): void {
    // Using transform create an additional layer in the pixel pipeline
    // to limit the number of layers, it is set only if there is more
    // than one widget.
    const items = (this as any)._items as LayoutItem[];
    if (this.hiddenMode === Widget.HiddenMode.Scale && items.length > 0) {
      if (items.length === 1) {
        this.widgets[0].hiddenMode = Widget.HiddenMode.Scale;
      }
      widget.hiddenMode = Widget.HiddenMode.Scale;
    } else {
      widget.hiddenMode = Widget.HiddenMode.Display;
    }

    // Create and add a new layout item for the widget.
    ArrayExt.insert(items, index, new LayoutItem(widget));

    // Send a `'before-attach'` message if the parent is attached.
    if (this.parent!.isAttached) {
      MessageLoop.sendMessage(widget, Widget.Msg.BeforeAttach);
    }

    // Add the widget's attachment node to the parent.
    this.parent!.node.appendChild(getAttachmentNode(widget));

    // Send an `'after-attach'` message if the parent is attached.
    if (this.parent!.isAttached) {
      MessageLoop.sendMessage(widget, Widget.Msg.AfterAttach);
    }

    // Post a fit request for the parent widget.
    this.parent!.fit();
  }

  protected detachWidget(index: number, widget: Widget): void {
    const items = (this as any)._items as LayoutItem[];

    // Remove the layout item for the widget.
    const item = ArrayExt.removeAt(items, index);

    // Send a `'before-detach'` message if the parent is attached.
    if (this.parent!.isAttached) {
      MessageLoop.sendMessage(widget, Widget.Msg.BeforeDetach);
    }

    // Remove the widget's attachment node from the parent.
    this.parent!.node.removeChild(getAttachmentNode(widget));

    // Send an `'after-detach'` message if the parent is attached.
    if (this.parent!.isAttached) {
      MessageLoop.sendMessage(widget, Widget.Msg.AfterDetach);
    }

    // Reset the z-index for the widget.
    item!.widget.node.style.zIndex = '';

    // Reset the hidden mode for the widget.
    if (this.hiddenMode === Widget.HiddenMode.Scale) {
      widget.hiddenMode = Widget.HiddenMode.Display;

      // Reset the hidden mode for the first widget if necessary.
      if (items.length === 1) {
        items[0].widget.hiddenMode = Widget.HiddenMode.Display;
      }
    }

    // Dispose of the layout item.
    item!.dispose();

    // Post a fit request for the parent widget.
    this.parent!.fit();
  }
}

/**
 * A `DockLayout` that attaches/detaches widgets via `attachmentNode`.
 */
export class ShadowDockLayout extends DockLayout {
  protected attachWidget(widget: Widget): void {
    const node = getAttachmentNode(widget);

    // Do nothing if the widget is already attached.
    if (this.parent!.node === node.parentNode) {
      return;
    }

    // Create the layout item for the widget.
    (this as any)._items.set(widget, new LayoutItem(widget));

    // Send a `'before-attach'` message if the parent is attached.
    if (this.parent!.isAttached) {
      MessageLoop.sendMessage(widget, Widget.Msg.BeforeAttach);
    }

    // Add the widget's attachment node to the parent.
    this.parent!.node.appendChild(node);

    // Send an `'after-attach'` message if the parent is attached.
    if (this.parent!.isAttached) {
      MessageLoop.sendMessage(widget, Widget.Msg.AfterAttach);
    }
  }

  protected detachWidget(widget: Widget): void {
    const node = getAttachmentNode(widget);

    // Do nothing if the widget is not attached.
    if (this.parent!.node !== node.parentNode) {
      return;
    }

    // Send a `'before-detach'` message if the parent is attached.
    if (this.parent!.isAttached) {
      MessageLoop.sendMessage(widget, Widget.Msg.BeforeDetach);
    }

    // Remove the widget's attachment node from the parent.
    this.parent!.node.removeChild(node);

    // Send an `'after-detach'` message if the parent is attached.
    if (this.parent!.isAttached) {
      MessageLoop.sendMessage(widget, Widget.Msg.AfterDetach);
    }

    // Delete the layout item for the widget.
    const item = (this as any)._items.get(widget);
    if (item) {
      (this as any)._items.delete(widget);
      item.dispose();
    }
  }
}

/**
 * A `DockPanelSvg` whose internal `DockLayout` is patched to use
 * `attachmentNode` for DOM operations.
 */
export class ShadowDockPanelSvg extends DockPanelSvg {
  constructor(options: DockPanel.IOptions = {}) {
    super(options);
    // The base constructor creates a plain `DockLayout`. Swap its prototype
    // so the overridden attach/detach methods from `ShadowDockLayout` are
    // picked up. This is safe because `ShadowDockLayout` adds no extra
    // constructor state — it only overrides two protected methods.
    Object.setPrototypeOf(this.layout!, ShadowDockLayout.prototype);
  }
}

/**
 * Private helpers for the shadow layout implementations.
 */
namespace Private {
  /**
   * Compute the average size of an array of box sizers.
   */
  export function averageSizerSize(sizers: BoxSizer[]): number {
    return sizers.reduce((v, s) => v + s.size, 0) / sizers.length || 0;
  }

  /**
   * Create a new box sizer with the given default size.
   */
  export function createSizer(size: number): BoxSizer {
    const sizer = new BoxSizer();
    sizer.sizeHint = Math.floor(size);
    return sizer;
  }

  /**
   * Create a new split handle using the given renderer.
   */
  export function createHandle(
    renderer: SplitLayoutType.IRenderer
  ): HTMLDivElement {
    const handle = renderer.createHandle();
    handle.style.position = 'absolute';
    handle.style.contain = 'style';
    return handle;
  }
}
