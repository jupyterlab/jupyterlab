/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { Cell, CodeCell } from '@jupyterlab/cells';
import {
  WindowedLayout,
  WindowedList,
  WindowedListModel
} from '@jupyterlab/ui-components';
import { Message, MessageLoop } from '@lumino/messaging';
import { Widget } from '@lumino/widgets';
import { DROP_SOURCE_CLASS, DROP_TARGET_CLASS } from './constants';

/**
 * Notebook view model for the windowed list.
 */
export class NotebookViewModel extends WindowedListModel {
  /**
   * Default cell height
   */
  static DEFAULT_CELL_SIZE = 39;
  /**
   * Default editor line height
   */
  static DEFAULT_EDITOR_LINE_HEIGHT = 17;
  /**
   * Default cell margin (top + bottom)
   */
  static DEFAULT_CELL_MARGIN = 22;

  /**
   * Construct a notebook windowed list model.
   */
  constructor(protected cells: Cell[], options?: WindowedList.IModelOptions) {
    super(options);
    // Set default cell size
    this._estimatedWidgetSize = NotebookViewModel.DEFAULT_CELL_SIZE;
  }

  /**
   * Cell size estimator
   *
   * @param index Cell index
   * @returns Cell height in pixels
   */
  estimateWidgetSize = (index: number): number => {
    // TODO could be improved, takes only into account the editor height
    const nLines = this.cells[index].model.sharedModel
      .getSource()
      .split('\n').length;
    return (
      NotebookViewModel.DEFAULT_EDITOR_LINE_HEIGHT * nLines +
      NotebookViewModel.DEFAULT_CELL_MARGIN
    );
  };

  /**
   * Render the cell at index.
   *
   * @param index Cell index
   * @returns Cell widget
   */
  widgetRenderer = (index: number): Widget => {
    return this.cells[index];
  };
}

/**
 * Windowed list layout for the notebook.
 */
export class NotebookWindowedLayout extends WindowedLayout {
  private _header: Widget | null = null;
  private _footer: Widget | null = null;

  /**
   * Notebook's header
   */
  get header(): Widget | null {
    return this._header;
  }
  set header(header: Widget | null) {
    if (this._header && this._header.isAttached) {
      Widget.detach(this._header);
    }
    this._header = header;
    if (this._header && this.parent?.isAttached) {
      Widget.attach(this._header, this.parent!.node);
    }
  }

  /**
   * Notebook widget's footer
   */
  get footer(): Widget | null {
    return this._footer;
  }
  set footer(footer: Widget | null) {
    if (this._footer && this._footer.isAttached) {
      Widget.detach(this._footer);
    }
    this._footer = footer;
    if (this._footer && this.parent?.isAttached) {
      Widget.attach(this._footer, this.parent!.node);
    }
  }

  /**
   * Dispose the layout
   * */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._header?.dispose();
    this._footer?.dispose();
    super.dispose();
  }

  /**
   * * A message handler invoked on a `'child-removed'` message.
   * *
   * @param widget - The widget to remove from the layout.
   *
   * #### Notes
   * A widget is automatically removed from the layout when its `parent`
   * is set to `null`. This method should only be invoked directly when
   * removing a widget from a layout which has yet to be installed on a
   * parent widget.
   *
   * This method does *not* modify the widget's `parent`.
   */
  removeWidget(widget: Widget): void {
    const index = this.widgets.indexOf(widget);
    // We need to deal with code cell widget not in viewport (aka not in this.widgets) but still
    // partly attached
    if (index >= 0) {
      this.removeWidgetAt(index);
    } // If the layout is parented, detach the widget from the DOM.
    else if (widget === this._willBeRemoved && this.parent) {
      this.detachWidget(index, widget);
    }
  }

  /**
   * Attach a widget to the parent's DOM node.
   *
   * @param index - The current index of the widget in the layout.
   *
   * @param widget - The widget to attach to the parent.
   *
   * #### Notes
   * This method is called automatically by the panel layout at the
   * appropriate time. It should not be called directly by user code.
   *
   * The default implementation adds the widgets's node to the parent's
   * node at the proper location, and sends the appropriate attach
   * messages to the widget if the parent is attached to the DOM.
   *
   * Subclasses may reimplement this method to control how the widget's
   * node is added to the parent's node.
   */
  protected attachWidget(index: number, widget: Widget): void {
    // Status may change in onBeforeAttach
    const wasPlaceholder = (widget as Cell).isPlaceholder();
    // Initialized sub-widgets or attached them for CodeCell
    if (this.parent!.isAttached) {
      MessageLoop.sendMessage(widget, Widget.Msg.BeforeAttach);
    }

    if (
      !wasPlaceholder &&
      widget instanceof CodeCell &&
      widget.node.parentElement
    ) {
      // We don't remove code cells to preserve outputs internal state
      widget.node.style.display = '';

      // Reset cache
      this._topHiddenCodeCells = -1;
    } else {
      // Look up the next sibling reference node.
      const siblingIndex = this._findNearestChildBinarySearch(
        this.parent!.viewportNode.childElementCount - 1,
        0,
        parseInt(widget.dataset.windowedListIndex!, 10) + 1
      );
      let ref = this.parent!.viewportNode.children[siblingIndex];

      // Insert the widget's node before the sibling.
      this.parent!.viewportNode.insertBefore(widget.node, ref);

      // Send an `'after-attach'` message if the parent is attached.
      // Event listeners will be added here
      // Some widgets are updating/resetting when attached, so
      // we should not recall this each time a cell move into the
      // viewport.
      if (this.parent!.isAttached) {
        MessageLoop.sendMessage(widget, Widget.Msg.AfterAttach);
      }
    }

    (widget as Cell).inViewport = true;
  }

  /**
   * Detach a widget from the parent's DOM node.
   *
   * @param index - The previous index of the widget in the layout.
   *
   * @param widget - The widget to detach from the parent.
   *
   * #### Notes
   * This method is called automatically by the panel layout at the
   * appropriate time. It should not be called directly by user code.
   *
   * The default implementation removes the widget's node from the
   * parent's node, and sends the appropriate detach messages to the
   * widget if the parent is attached to the DOM.
   *
   * Subclasses may reimplement this method to control how the widget's
   * node is removed from the parent's node.
   */
  protected detachWidget(index: number, widget: Widget): void {
    (widget as Cell).inViewport = false;

    // TODO we could improve this further by discarding also the code cell without outputs
    if (
      widget instanceof CodeCell &&
      // We detach the code cell currently dragged otherwise it won't be attached at the correct position
      !widget.node.classList.contains(DROP_SOURCE_CLASS) &&
      widget !== this._willBeRemoved
    ) {
      // We don't remove code cells to preserve outputs internal state
      // Transform does not work because the widget height is kept (at lease in FF)
      widget.node.style.display = 'none';

      // Reset cache
      this._topHiddenCodeCells = -1;
    } else {
      // Send a `'before-detach'` message if the parent is attached.
      // This should not be called every time a cell leaves the viewport
      // as it will remove listeners that won't be added back as afterAttach
      // is shunted to avoid unwanted update/reset.
      if (this.parent!.isAttached) {
        // Event listeners will be removed here
        MessageLoop.sendMessage(widget, Widget.Msg.BeforeDetach);
      }
      // Remove the widget's node from the parent.
      this.parent!.viewportNode.removeChild(widget.node);

      // Ensure to clean up drop target class if the widget move out of the viewport
      widget.node.classList.remove(DROP_TARGET_CLASS);
    }

    if (this.parent!.isAttached) {
      // Detach sub widget of CodeCell except the OutputAreaWrapper
      MessageLoop.sendMessage(widget, Widget.Msg.AfterDetach);
    }
  }

  /**
   * Move a widget in the parent's DOM node.
   *
   * @param fromIndex - The previous index of the widget in the layout.
   *
   * @param toIndex - The current index of the widget in the layout.
   *
   * @param widget - The widget to move in the parent.
   *
   * #### Notes
   * This method is called automatically by the panel layout at the
   * appropriate time. It should not be called directly by user code.
   *
   * The default implementation moves the widget's node to the proper
   * location in the parent's node and sends the appropriate attach and
   * detach messages to the widget if the parent is attached to the DOM.
   *
   * Subclasses may reimplement this method to control how the widget's
   * node is moved in the parent's node.
   */
  protected moveWidget(
    fromIndex: number,
    toIndex: number,
    widget: Widget
  ): void {
    // Optimize move without de-/attaching as motion appends with parent attached
    // Case fromIndex === toIndex, already checked in PanelLayout.insertWidget
    if (this._topHiddenCodeCells < 0) {
      this._topHiddenCodeCells = 0;
      for (
        let idx = 0;
        idx < this.parent!.viewportNode.children.length;
        idx++
      ) {
        const n = this.parent!.viewportNode.children[idx];
        if ((n as HTMLElement).style.display == 'none') {
          this._topHiddenCodeCells++;
        } else {
          break;
        }
      }
    }

    const ref =
      this.parent!.viewportNode.children[toIndex + this._topHiddenCodeCells];
    if (fromIndex < toIndex) {
      ref.insertAdjacentElement('afterend', widget.node);
    } else {
      ref.insertAdjacentElement('beforebegin', widget.node);
    }
  }

  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    if (this._header && !this._header.isAttached) {
      Widget.attach(
        this._header,
        this.parent!.node,
        this.parent!.node.firstElementChild as HTMLElement | null
      );
    }
    if (this._footer && !this._footer.isAttached) {
      Widget.attach(this._footer, this.parent!.node);
    }
  }

  protected onBeforeDetach(msg: Message): void {
    if (this._header?.isAttached) {
      Widget.detach(this._header);
    }
    if (this._footer?.isAttached) {
      Widget.detach(this._footer);
    }
    super.onBeforeDetach(msg);
  }

  /**
   * A message handler invoked on a `'child-removed'` message.
   *
   * @param msg Message
   */
  protected onChildRemoved(msg: Widget.ChildMessage): void {
    this._willBeRemoved = msg.child;
    super.onChildRemoved(msg);
    this._willBeRemoved = null;
  }

  private _findNearestChildBinarySearch(
    high: number,
    low: number,
    index: number
  ): number {
    while (low <= high) {
      const middle = low + Math.floor((high - low) / 2);
      const currentIndex = parseInt(
        (this.parent!.viewportNode.children[middle] as HTMLElement).dataset
          .windowedListIndex!,
        10
      );

      if (currentIndex === index) {
        return middle;
      } else if (currentIndex < index) {
        low = middle + 1;
      } else if (currentIndex > index) {
        high = middle - 1;
      }
    }

    if (low > 0) {
      return low;
    } else {
      return 0;
    }
  }

  private _willBeRemoved: Widget | null = null;
  private _topHiddenCodeCells: number = -1;
}
