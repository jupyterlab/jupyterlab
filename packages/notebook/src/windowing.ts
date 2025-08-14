/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { Cell, CodeCell, CodeCellModel } from '@jupyterlab/cells';
import {
  WindowedLayout,
  WindowedList,
  WindowedListModel
} from '@jupyterlab/ui-components';
import { Message, MessageLoop } from '@lumino/messaging';
import { Debouncer, Throttler } from '@lumino/polling';
import { Widget } from '@lumino/widgets';
import { DROP_SOURCE_CLASS, DROP_TARGET_CLASS } from './constants';

/**
 * Check whether the element is in a scrolling notebook.
 * Traverses open shadow DOM roots if needed.
 */
function isInScrollingNotebook(element: Element | null): boolean {
  if (!element) {
    return false;
  }
  const notebook = element.closest('.jp-WindowedPanel-viewport') as
    | HTMLElement
    | undefined;
  if (notebook && notebook.dataset.isScrolling == 'true') {
    return true;
  }
  const root = element.getRootNode();
  return !!(
    root &&
    root instanceof ShadowRoot &&
    isInScrollingNotebook(root.host)
  );
}

/**
 * Check whether the element is part of a CodeMirror editor.
 */
function isCodeMirrorElement(element: Element | null): boolean {
  if (!element) {
    return false;
  }
  return !!element.closest('.cm-editor');
}

/**
 * Subclass IntersectionObserver to allow suspending callbacks when notebook is scrolling.
 */
window.IntersectionObserver = class extends window.IntersectionObserver {
  constructor(
    protected callback: IntersectionObserverCallback,
    options: IntersectionObserverInit
  ) {
    super(entries => {
      this._delayCallbackInScrollingNotebook(entries);
    }, options);
    this._throttler = new Throttler(
      entries => {
        // keep delaying until no longer in scrolling notebook
        this._delayCallbackInScrollingNotebook(entries);
      },
      { limit: 1000, edge: 'trailing' }
    );
  }

  private _delayCallbackInScrollingNotebook = (
    entries: IntersectionObserverEntry[]
  ) => {
    const entriesInScrollingNotebook = [];
    const nonOutputEntries = [];
    for (const entry of entries) {
      // Do not delay callbacks to CodeMirror editor logic
      if (
        isInScrollingNotebook(entry.target) &&
        !isCodeMirrorElement(entry.target)
      ) {
        entriesInScrollingNotebook.push(entry);
      } else {
        nonOutputEntries.push(entry);
      }
    }
    if (nonOutputEntries.length) {
      this.callback(nonOutputEntries, this);
    }
    if (entriesInScrollingNotebook.length) {
      void this._throttler.invoke(entriesInScrollingNotebook);
    }
  };
  private _throttler: Throttler;
};

/**
 * Subclass ResizeObserver to allow suspending callbacks when notebook is scrolling.
 */
window.ResizeObserver = class extends window.ResizeObserver {
  constructor(protected callback: ResizeObserverCallback) {
    super(entries => {
      this._delayCallbackInScrollingNotebook(entries);
    });
    this._throttler = new Throttler(
      entries => {
        // keep delaying until no longer in scrolling notebook
        this._delayCallbackInScrollingNotebook(entries);
      },
      { limit: 1000, edge: 'trailing' }
    );
  }

  private _delayCallbackInScrollingNotebook = (
    entries: ResizeObserverEntry[]
  ) => {
    const entriesInScrollingNotebook = [];
    const nonOutputEntries = [];
    for (const entry of entries) {
      if (isInScrollingNotebook(entry.target)) {
        entriesInScrollingNotebook.push(entry);
      } else {
        nonOutputEntries.push(entry);
      }
    }
    if (nonOutputEntries.length) {
      this.callback(nonOutputEntries, this);
    }
    if (entriesInScrollingNotebook.length) {
      void this._throttler.invoke(entriesInScrollingNotebook);
    }
  };
  private _throttler: Throttler;
};

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
  constructor(
    protected cells: Cell[],
    options?: WindowedList.IModelOptions
  ) {
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
    const cell = this.cells[index];
    if (!cell) {
      // This should not happen, but if it does,
      // do not throw if cell was deleted in the meantime
      console.warn(
        `estimateWidgetSize requested for cell ${index} in notebook with only ${this.cells.length} cells`
      );
      return 0;
    }
    const model = cell.model;
    const height = this.cellsEstimatedHeight.get(model.id);
    if (typeof height === 'number') {
      return height;
    }

    const nLines = model.sharedModel.getSource().split('\n').length;
    let outputsLines = 0;
    if (model instanceof CodeCellModel && !model.isDisposed) {
      for (let outputIdx = 0; outputIdx < model.outputs.length; outputIdx++) {
        const output = model.outputs.get(outputIdx);
        const data = output.data['text/plain'];
        if (typeof data === 'string') {
          outputsLines += data.split('\n').length;
        } else if (Array.isArray(data)) {
          outputsLines += data.join('').split('\n').length;
        }
      }
    }
    return (
      NotebookViewModel.DEFAULT_EDITOR_LINE_HEIGHT * (nLines + outputsLines) +
      NotebookViewModel.DEFAULT_CELL_MARGIN
    );
  };

  /**
   * Set an estimated height for a cell
   *
   * @param cellId Cell ID
   * @param size Cell height
   */
  setEstimatedWidgetSize(cellId: string, size: number | null): void {
    if (size === null) {
      if (this.cellsEstimatedHeight.has(cellId)) {
        this.cellsEstimatedHeight.delete(cellId);
      }
    } else {
      this.cellsEstimatedHeight.set(cellId, size);
      this._emitEstimatedHeightChanged.invoke().catch(error => {
        console.error(
          'Fail to trigger an update following a estimated height update.',
          error
        );
      });
    }
  }

  /**
   * Render the cell at index.
   *
   * @param index Cell index
   * @returns Cell widget
   */
  widgetRenderer = (index: number): Widget => {
    return this.cells[index];
  };

  /**
   * Threshold used to decide if the cell should be scrolled to in the `smart` mode.
   * Defaults to scrolling when less than a full line of the cell is visible.
   */
  readonly scrollDownThreshold =
    NotebookViewModel.DEFAULT_CELL_MARGIN / 2 +
    NotebookViewModel.DEFAULT_EDITOR_LINE_HEIGHT;

  /**
   * Threshold used to decide if the cell should be scrolled to in the `smart` mode.
   * Defaults to scrolling when the cell margin or more is invisible.
   */
  readonly scrollUpThreshold = NotebookViewModel.DEFAULT_CELL_MARGIN / 2;

  /**
   * Mapping between the cell ids and the cell estimated heights
   *
   * This height is not refreshed with the changes to the document.
   * It is only used to measure cells outside the viewport on CPU
   * idle cycle to improve UX scrolling.
   */
  protected cellsEstimatedHeight = new Map<string, number>();

  private _emitEstimatedHeightChanged = new Debouncer(() => {
    this._stateChanged.emit({
      name: 'estimatedWidgetSize',
      newValue: null,
      oldValue: null
    });
  });
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
      Widget.attach(this._footer, this.parent!.outerNode);
    }
  }

  /**
   * Notebook's active cell
   */
  get activeCell(): Widget | null {
    return this._activeCell;
  }
  set activeCell(widget: Widget | null) {
    this._activeCell = widget;
  }
  private _activeCell: Widget | null;

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
    // Because this reattaches all sub-widget to the DOM which leads
    // to a loss of focus, we do not call it for soft-hidden cells.
    const isSoftHidden = this._isSoftHidden(widget);
    if (this.parent!.isAttached && !isSoftHidden) {
      MessageLoop.sendMessage(widget, Widget.Msg.BeforeAttach);
    }
    if (isSoftHidden) {
      // Restore visibility for active, or previously active cell
      this._toggleSoftVisibility(widget, true);
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

      if (this.parent!.isAttached && !widget.isAttached) {
        widget.setFlag(Widget.Flag.IsAttached);
      }
    } else if (!isSoftHidden) {
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

    // Note: `index` is relative to the displayed cells, not all cells,
    // hence we compare with the widget itself.
    if (widget === this.activeCell && widget !== this._willBeRemoved) {
      // Do not change display of the active cell to allow user to continue providing input
      // into the code mirror editor when out of view. We still hide the cell so to prevent
      // minor visual glitches when scrolling.
      this._toggleSoftVisibility(widget, false);
      // Return before sending "AfterDetach" message to CodeCell
      // to prevent removing contents of the active cell.
      return;
    }

    // Do not apply `display: none` on cells which contain:
    // - `<defs>` as multiple browsers (Chrome and Firefox)
    //   are bugged and do not respect the spec here, see
    //   https://github.com/jupyterlab/jupyterlab/issues/16952
    //   https://issues.chromium.org/issues/40324398
    //   https://bugzilla.mozilla.org/show_bug.cgi?id=376027
    // - elements containing `.myst` class as jupyterlab-myst
    //   re-renders cause height jitter and scrolling issues;
    //   in future this could be addressed by the proposal
    //   to allow renderers to specify hiding mode, see
    //   https://github.com/jupyterlab/jupyterlab/issues/17331
    const requiresSoftHiding = widget.node.querySelector('defs,.myst');

    if (requiresSoftHiding) {
      this._toggleSoftVisibility(widget, false);
      return;
    }
    // TODO we could improve this further by discarding also the code cell without outputs
    if (
      // We detach the code cell currently dragged otherwise it won't be attached at the correct position
      widget instanceof CodeCell &&
      !widget.node.classList.contains(DROP_SOURCE_CLASS) &&
      widget !== this._willBeRemoved
    ) {
      // We don't remove code cells to preserve outputs internal state
      // Transform does not work because the widget height is kept (at least in FF)
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
      Widget.attach(this._footer, this.parent!.outerNode);
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

  /**
   * Toggle "soft" visibility of the widget.
   *
   * #### Notes
   * To ensure that user events reach the CodeMirror editor, this method
   * does not toggle `display` nor `visibility` which have side effects,
   * but instead hides it in the compositor and ensures that the bounding
   * box is has an area equal to zero.
   * To ensure we do not trigger style recalculation, we set the styles
   * directly on the node instead of using a class.
   */
  private _toggleSoftVisibility(widget: Widget, show: boolean): void {
    if (show) {
      widget.node.style.opacity = '';
      widget.node.style.height = '';
      widget.node.style.padding = '';
    } else {
      widget.node.style.opacity = '0';
      // Both padding and height need to be set to zero
      // to ensure bounding box collapses to invisible.
      widget.node.style.height = '0';
      widget.node.style.padding = '0';
    }
  }

  private _isSoftHidden(widget: Widget): boolean {
    return widget.node.style.opacity === '0';
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
