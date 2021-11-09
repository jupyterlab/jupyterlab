/*
 * This code is inspired by react-window https://github.com/bvaughn/react-window
 * That library is licensed under
 *
 * MIT License (MIT)
 *
 * Copyright (c) 2018 Brian Vaughn
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 */
import { Message, MessageLoop } from '@lumino/messaging';
import { PanelLayout, Widget } from '@lumino/widgets';

/* TODOs
  - Append all rendered widget in one command to not reflow the window uselessly
  - Deal with focus lost when for example tab trigger a scroll event to an hidden widget
  - Probably loosing selection too - so needs to deal with that... 
  https://stackoverflow.com/questions/7987172/can-i-move-a-domelement-while-preserving-focus/7987309
  - Support Dynamic Sizing - Resize Observer? or do we use a window container that does not enforce positioning
  https://developer.mozilla.org/en-US/docs/Web/API/Resize_Observer_API

 */

export class WindowedPanel extends Widget {
  static readonly DEFAULT_WIDGET_SIZE = 50;

  constructor(options: WindowedPanel.IOptions) {
    const node = document.createElement('div');
    node.className = 'jp-WindowedPanel-outer';
    const innerElement = node.appendChild(document.createElement('div'));
    innerElement.className = 'jp-WindowedPanel-inner';
    const windowContainer = innerElement.appendChild(
      document.createElement('div')
    );
    windowContainer.className = 'jp-WindowedPanel-window';
    super({ node });
    this._height = 0;
    this._innerElement = innerElement;
    this._windowElement = windowContainer;
    this._lastMeasuredIndex = -1;
    this._estimatedWidgetSize =
      options.estimatedWidgetSize ?? WindowedPanel.DEFAULT_WIDGET_SIZE;
    this._overscanCount = options.overscanCount ?? 1;
    this._scrollOffset = 0;
    this._scrollDirection = 'forward';
    this._scrollUpdateWasRequested = false;
    this._widgetRenderer = options.widgetRenderer;
    this._widgetSize = options.widgetSize;
    this._widgetSizers = [];
    this._widgetCount = options.widgetCount;
    this.layout = options.layout ?? new WindowedLayout();
  }

  readonly layout: WindowedLayout;

  get estimatedWidgetSize(): number {
    return this._estimatedWidgetSize;
  }

  get innerNode(): HTMLDivElement {
    return this._windowElement;
  }

  handleEvent(event: Event): void {
    switch (event.type) {
      case 'scroll':
        this.onScroll(event);
        break;
    }
  }

  /**
   * VariableSizeList caches offsets and measurements for each index for performance purposes. This method clears that cached data for all items after (and including) the specified index. It should be called whenever a item's size changes. (Note that this is not a typical occurrance.)
   *
   * By default the list will automatically re-render after the index is reset. If you would like to delay this re-render until e.g. a state update has completed in the parent component, specify a value of false for the second, optional parameter.
   *
   * @param index
   * @param shouldForceUpdate
   */
  resetAfterIndex(index: number, shouldForceUpdate: boolean = true): void {
    // TODO
  }

  /**
   * Scroll to the specified offset `scrollTop`.
   *
   * @param scrollOffset Offset to scroll
   */
  scrollTo(scrollOffset: number): void {
    // TODO
  }

  /**
   * Scroll to the specified item.
   *
   * By default, the List will scroll as little as possible to ensure the item is visible. You can control the alignment of the item though by specifying a second alignment parameter. Acceptable values are:
   *
   *   auto (default) - Scroll as little as possible to ensure the item is visible. (If the item is already visible, it won't scroll at all.)
   *   smart - If the item is already visible, don't scroll at all. If it is less than one viewport away, scroll as little as possible so that it becomes visible. If it is more than one viewport away, scroll so that it is centered within the list.
   *   center - Center align the item within the list.
   *   end - Align the item to the end of the list (the bottom for vertical lists or the right for horizontal lists).
   *   start - Align the item to the beginning of the list (the top for vertical lists or the left for horizontal lists).
   *
   * @param index
   * @param align
   */
  scrollToItem(index: number, align: string = 'auto'): void {
    // TODO
  }

  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    this.node.addEventListener('scroll', this);
    window.requestAnimationFrame(() => {
      this.onResize(Widget.ResizeMessage.UnknownSize);
      this.update();
    });
  }

  protected onBeforeDetach(msg: Message): void {
    this.node.removeEventListener('scroll', this);
  }

  protected onScroll(event: Event): void {
    const {
      clientHeight,
      scrollHeight,
      scrollTop
    } = event.currentTarget as HTMLDivElement;

    if (this._scrollOffset === scrollTop) {
      return; // Bail early
    }

    // TODO Max bound may block scroll past end in notebook
    const scrollOffset = Math.max(
      0,
      Math.min(scrollTop, scrollHeight - clientHeight)
    );

    this._scrollDirection =
      this._scrollOffset < scrollOffset ? 'forward' : 'backward';
    this._scrollOffset = scrollOffset;
    this._scrollUpdateWasRequested = false;

    window.requestAnimationFrame(() => {
      this.update();
    });
  }

  protected onResize(msg: Widget.ResizeMessage): void {
    this._height =
      msg.height >= 0 ? msg.height : this.node.getBoundingClientRect().height;
    super.onResize(msg);
  }

  /**
   * A message handler invoked on an `'update-request'` message.
   *
   * #### Notes
   * The default implementation of this handler is a no-op.
   */
  protected onUpdateRequest(msg: Message): void {
    const [startIndex, stopIndex] = this._getRangeToRender();

    for (let index = startIndex; index <= stopIndex; index++) {
      const item = this._widgetRenderer(index);
      this.layout.insertWidget(index - startIndex, item);
    }
    const nVisible = stopIndex - startIndex + 1;
    const nWidgets = this.layout.widgets.length;
    // Detach not needed widgets
    for (let itemIdx = nWidgets; itemIdx > nVisible; itemIdx--) {
      this.layout.removeWidgetAt(itemIdx - 1);
    }

    // Read this value after creating the cells.
    // So their actual sizes are taken into account
    const estimatedTotalHeight = this._getEstimatedTotalSize();

    // Update inner container height
    this._innerElement.style.height = `${estimatedTotalHeight}px`;

    // Update visible widget in layout
    const startSize = this._getItemMetadata(startIndex);
    this._windowElement.style.top = `${startSize.offset}px`;
    const stopSize = this._getItemMetadata(stopIndex);
    this._windowElement.style.minHeight = `${
      stopSize.offset - startSize.offset + stopSize.size
    }px`;
    // for (let index = startIndex; index <= stopIndex; index++) {
    //   const localIndex = index - startIndex;
    //   const widgetSize = this._getItemMetadata(index);
    //   this.layout.widgets[localIndex].node.style.top = `${widgetSize.offset}px`;
    //   this.layout.widgets[
    //     localIndex
    //   ].node.style.height = `${widgetSize.size}px`;
    // }

    // Update scroll
    if (this._scrollUpdateWasRequested) {
      this.node.scrollTop = this._scrollOffset;
    }
  }

  private _getRangeToRender(): [number, number, number, number] {
    const widgetCount = this._widgetCount;

    if (widgetCount === 0) {
      return [0, 0, 0, 0];
    }

    const startIndex = this._getStartIndexForOffset(this._scrollOffset);
    const stopIndex = this._getStopIndexForStartIndex(
      startIndex,
      this._scrollOffset
    );

    const overscanBackward =
      this._scrollDirection === 'backward'
        ? Math.max(1, this._overscanCount)
        : 1;
    const overscanForward =
      this._scrollDirection === 'forward'
        ? Math.max(1, this._overscanCount)
        : 1;

    return [
      Math.max(0, startIndex - overscanBackward),
      Math.max(0, Math.min(widgetCount - 1, stopIndex + overscanForward)),
      startIndex,
      stopIndex
    ];
  }

  private _getItemMetadata(index: number): WindowedPanel.ItemMetadata {
    if (index > this._lastMeasuredIndex) {
      let offset = 0;
      if (this._lastMeasuredIndex >= 0) {
        const itemMetadata = this._widgetSizers[this._lastMeasuredIndex];
        offset = itemMetadata.offset + itemMetadata.size;
      }

      for (let i = this._lastMeasuredIndex + 1; i <= index; i++) {
        let size = this._widgetSize(i);

        this._widgetSizers[i] = {
          offset,
          size
        };

        offset += size;
      }

      this._lastMeasuredIndex = index;
    }

    return this._widgetSizers[index];
  }

  private _findNearestItem(offset: number): number {
    const lastMeasuredItemOffset =
      this._lastMeasuredIndex > 0
        ? this._widgetSizers[this._lastMeasuredIndex].offset
        : 0;

    if (lastMeasuredItemOffset >= offset) {
      // If we've already measured items within this range just use a binary search as it's faster.
      return this._findNearestItemBinarySearch(
        this._lastMeasuredIndex,
        0,
        offset
      );
    } else {
      // If we haven't yet measured this high, fallback to an exponential search with an inner binary search.
      // The exponential search avoids pre-computing sizes for the full set of items as a binary search would.
      // The overall complexity for this approach is O(log n).
      return this._findNearestItemExponentialSearch(
        Math.max(0, this._lastMeasuredIndex),
        offset
      );
    }
  }

  private _findNearestItemBinarySearch(
    high: number,
    low: number,
    offset: number
  ): number {
    while (low <= high) {
      const middle = low + Math.floor((high - low) / 2);
      const currentOffset = this._getItemMetadata(middle).offset;

      if (currentOffset === offset) {
        return middle;
      } else if (currentOffset < offset) {
        low = middle + 1;
      } else if (currentOffset > offset) {
        high = middle - 1;
      }
    }

    if (low > 0) {
      return low - 1;
    } else {
      return 0;
    }
  }

  private _findNearestItemExponentialSearch(
    index: number,
    offset: number
  ): number {
    let interval = 1;

    while (
      index < this._widgetCount &&
      this._getItemMetadata(index).offset < offset
    ) {
      index += interval;
      interval *= 2;
    }

    return this._findNearestItemBinarySearch(
      Math.min(index, this._widgetCount - 1),
      Math.floor(index / 2),
      offset
    );
  }

  private _getStartIndexForOffset(offset: number): number {
    return this._findNearestItem(offset);
  }

  private _getStopIndexForStartIndex(
    startIndex: number,
    scrollOffset: number
  ): number {
    const size = this._height;
    const itemMetadata = this._getItemMetadata(startIndex);
    const maxOffset = scrollOffset + size;

    let offset = itemMetadata.offset + itemMetadata.size;
    let stopIndex = startIndex;

    while (stopIndex < this._widgetCount - 1 && offset < maxOffset) {
      stopIndex++;
      offset += this._getItemMetadata(stopIndex).size;
    }

    return stopIndex;
  }

  private _getEstimatedTotalSize(): number {
    let totalSizeOfMeasuredItems = 0;

    if (this._lastMeasuredIndex >= this._widgetCount) {
      this._lastMeasuredIndex = this._widgetCount - 1;
    }

    if (this._lastMeasuredIndex >= 0) {
      const itemMetadata = this._widgetSizers[this._lastMeasuredIndex];
      totalSizeOfMeasuredItems = itemMetadata.offset + itemMetadata.size;
    }

    const numUnmeasuredItems = this._widgetCount - this._lastMeasuredIndex - 1;
    const totalSizeOfUnmeasuredItems =
      numUnmeasuredItems * this._estimatedWidgetSize;

    return totalSizeOfMeasuredItems + totalSizeOfUnmeasuredItems;
  }

  private _height: number;
  private _innerElement: HTMLDivElement;
  private _windowElement: HTMLDivElement;
  private _lastMeasuredIndex: number;
  private _widgetRenderer: (index: number) => Widget;
  private _widgetCount: number;
  private _widgetSize: (index: number) => number;
  private _widgetSizers: WindowedPanel.ItemMetadata[];
  private _estimatedWidgetSize: number;
  private _overscanCount: number;
  private _scrollDirection: 'forward' | 'backward';
  private _scrollOffset: number;
  private _scrollUpdateWasRequested: boolean;
}

export class WindowedLayout extends PanelLayout {
  constructor() {
    super({ fitPolicy: 'set-no-constraint' });
  }
  /**
   * Specialized parent type definition
   */
  parent: WindowedPanel | null;

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
    // Look up the next sibling reference node.
    let ref = this.parent!.innerNode.children[index];

    // Send a `'before-attach'` message if the parent is attached.
    if (this.parent!.isAttached) {
      MessageLoop.sendMessage(widget, Widget.Msg.BeforeAttach);
    }

    // Insert the widget's node before the sibling.
    this.parent!.innerNode.insertBefore(widget.node, ref);

    // Send an `'after-attach'` message if the parent is attached.
    if (this.parent!.isAttached) {
      MessageLoop.sendMessage(widget, Widget.Msg.AfterAttach);
    }
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
    // Send a `'before-detach'` message if the parent is attached.
    if (this.parent!.isAttached) {
      MessageLoop.sendMessage(widget, Widget.Msg.BeforeDetach);
    }

    // Remove the widget's node from the parent.
    this.parent!.innerNode.removeChild(widget.node);

    // Send an `'after-detach'` message if the parent is attached.
    if (this.parent!.isAttached) {
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
    // Send a `'before-detach'` message if the parent is attached.
    if (this.parent!.isAttached) {
      MessageLoop.sendMessage(widget, Widget.Msg.BeforeDetach);
    }

    // Remove the widget's node from the parent.
    this.parent!.innerNode.removeChild(widget.node);

    // Send an `'after-detach'` and  message if the parent is attached.
    if (this.parent!.isAttached) {
      MessageLoop.sendMessage(widget, Widget.Msg.AfterDetach);
    }

    // Look up the next sibling reference node.
    let ref = this.parent!.innerNode.children[toIndex];

    // Send a `'before-attach'` message if the parent is attached.
    if (this.parent!.isAttached) {
      MessageLoop.sendMessage(widget, Widget.Msg.BeforeAttach);
    }

    // Insert the widget's node before the sibling.
    this.parent!.innerNode.insertBefore(widget.node, ref);

    // Send an `'after-attach'` message if the parent is attached.
    if (this.parent!.isAttached) {
      MessageLoop.sendMessage(widget, Widget.Msg.AfterAttach);
    }
  }

  /**
   * A message handler invoked on an `'update-request'` message.
   *
   * #### Notes
   * This is a reimplementation of the base class method,
   * and is a no-op.
   */
  protected onUpdateRequest(msg: Message): void {
    // This is a no-op.
  }
}

export namespace WindowedPanel {
  export interface IOptions {
    estimatedWidgetSize?: number;
    layout?: WindowedLayout;
    overscanCount?: number;
    widgetCount: number;
    widgetRenderer: (index: number) => Widget;
    widgetSize: (index: number) => number;
  }

  export type ItemMetadata = {
    offset: number;
    size: number;
  };
}
