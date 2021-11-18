/*
 * This code is inspired by
 * - react-window https://github.com/bvaughn/react-window
 * That library is licensed under MIT License (MIT) Copyright (c) 2018 Brian Vaughn
 * - https://github.com/WICG/virtual-scroller/
 * Licensed by Contributors under the [W3C Software and Document License](http://www.w3.org/Consortium/Legal/2015/copyright-software-and-document)
 */
import { IChangedArgs } from '@jupyterlab/coreutils';
import { IDisposable } from '@lumino/disposable';
import { Message, MessageLoop } from '@lumino/messaging';
import { ISignal, Signal } from '@lumino/signaling';
import { PanelLayout, Widget } from '@lumino/widgets';

/*
 * Feature detection
 *
 * Ref: https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#improving_scrolling_performance_with_passive_listeners
 */
let passiveIfSupported: boolean | { passive: boolean } = false;

try {
  // @ts-ignore
  window.addEventListener(
    'test',
    null,
    Object.defineProperty({}, 'passive', {
      get: function () {
        passiveIfSupported = { passive: true };
      }
    })
  );
} catch (err) {
  // pass no-op
}

/* TODOs
  x Append all rendered widget in one command to not reflow the window uselessly
    Valuable at init and scroll to events (scroll to will be triggered by search)
    => Overoptimization probably
  - Deal with focus lost 
    - when for example tab trigger a scroll event to an hidden widget
    - when using Home or End
    Apparently it depends if the focus is on the container or on an item that may disappear when scrolling with keyboard...
  x Probably loosing selection too - so needs to deal with that... 
    https://stackoverflow.com/questions/7987172/can-i-move-a-domelement-while-preserving-focus/7987309
    => Assume it is ok to loose the selection of hidden items
  v Support Dynamic Sizing - Resize Observer? or do we use a window container that does not enforce positioning
    https://developer.mozilla.org/en-US/docs/Web/API/Resize_Observer_API
  - What if items have margin... resizeobserver is not bringing that in
  - What about Safari and ResizeObserverEntry.borderBoxSize
  v Support treeview --> item in the range can be hidden; don't insert them and cache the fact that they are hidden
    Probably want to deal with that in the model providing the data - keeping this as simple as possible
    => Finally cached size is based on node html pointer to keep it simple and to handle move node and 
  - On idle cycle call estimated size on not rendered element?
  - Check what happens if the inner container is bigger than the list requires
  - End not bringing to the bottom of the list due to height estimation.
  v one loop too much onUpdate -> resize -> onUpate -> resize 
    x use mutation observer to populate resize observer => bad idea because the layout detach/attach the node when moving it
    v resizer: don't unobserve all widgets before adding them all - just change status for changed widget
  v Jitter trouble: :s
      Updating range 157,163,158,162 -> 158,166,159,165...
      Calling _onWidgetResize...
      Updating range 158,166,159,165 -> 157,163,158,162...
      Calling _onWidgetResize...
      Updating range 157,163,158,162 -> 158,166,159,165...
      Calling _onWidgetResize...
      Updating range 158,166,159,165 -> 157,164,158,163...
      Calling _onWidgetResize...
      Updating range 157,164,158,163 -> 158,166,159,165...
      Calling _onWidgetResize...
  v Computing the visible widget range is wrong (may be linked with previous error seen)
    Correction to reuse as much as possible measured size
  v Navigation with tab between element works
  v Deal with dynamic list
  - If active element is child that is removed, scrolling with keyboard breaks when that node is detached
  v Turn off windowing
  - Scroll after end
  - onScroll vs intersection observer
  - Check is size cache based on mapping per node HTML a good idea? May cost too much to retrieve the size?
 */

export interface IWindowedListModel extends IDisposable {
  /**
   * Number of widgets to render in addition to those
   * visible in the viewport.
   */
  overscanCount?: number;

  /**
   * Total number of widgets in the list
   */
  widgetCount: number;

  /**
   * Whether windowing is active or not.
   *
   * This is true by default.
   */
  windowingActive?: boolean;

  /**
   * Widget factory for the list items.
   *
   * Caching the resulting widgets should be done by the callee.
   *
   * @param index List index
   * @returns The widget at the given position
   */
  widgetRenderer: (index: number) => Widget;

  /**
   * Provide a best guess for the widget height at position index
   *
   * If the index is null, returned the estimated default height.
   *
   * #### Notes
   *
   * This function should be very light to compute especially when
   * returning the default height.
   * The default value should be constant (i.e. two calls with `null` should
   * return the same value). But it can change for a given `index`.
   *
   * @param index Widget position or null
   * @returns Estimated widget height
   *
   * TODO? make optional to switch between windowing and not windowing.
   */
  estimateWidgetHeight: (index: number | null) => number;

  /**
   * A signal emitted when any model state changes.
   *
   * TODO do we need to provide a change arg (probably to deal with invalidate cache)
   */
  readonly stateChanged: ISignal<
    IWindowedListModel,
    IChangedArgs<
      number | boolean,
      number | boolean,
      'count' | 'overscanCount' | 'windowingActive'
    >
  >;
}

export abstract class WindowedListModel implements IWindowedListModel {
  constructor(options: IWindowedListModel.IOptions = {}) {
    this._widgetCount = options.count ?? 0;
    this._overscanCount = options.overscanCount ?? 1;
    this._windowingActive = options.windowingActive ?? true;
  }
  /**
   * Number of widgets to render in addition to those
   * visible in the viewport.
   */
  get overscanCount(): number {
    return this._overscanCount;
  }
  set overscanCount(newValue: number) {
    // TODO support overscan > count
    if (newValue >= 1 && this._overscanCount !== newValue) {
      const oldValue = this._overscanCount;
      this._overscanCount = newValue;
      this.stateChanged.emit({ name: 'overscanCount', newValue, oldValue });
    }
  }

  /**
   * Total number of widgets in the list
   */
  get widgetCount(): number {
    return this._widgetCount;
  }
  set widgetCount(newValue: number) {
    // TODO protect against < 0 value
    if (newValue >= 0 && this._widgetCount !== newValue) {
      const oldValue = this._widgetCount;
      this._widgetCount = newValue;
      this.stateChanged.emit({ name: 'count', newValue, oldValue });
    }
  }

  /**
   * Whether windowing is active or not.
   *
   * This is true by default.
   */
  get windowingActive(): boolean {
    return this._windowingActive;
  }
  set windowingActive(newValue: boolean) {
    if (newValue !== this._windowingActive) {
      const oldValue = this._windowingActive;
      this._windowingActive = newValue;
      this.stateChanged.emit({ name: 'windowingActive', newValue, oldValue });
    }
  }

  /**
   * Test whether the model is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Dispose the model.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;
    Signal.clearData(this);
  }

  /**
   * Widget factory for the list items.
   *
   * Caching the resulting widgets should be done by the callee.
   *
   * @param index List index
   * @returns The widget at the given position
   */
  abstract widgetRenderer: (index: number) => Widget;

  /**
   * Provide a best guess for the widget height at position index
   *
   * If the index is null, returned the estimated default height.
   *
   * #### Notes
   *
   * This function should be very light to compute especially when
   * returning the default height.
   * The default value should be constant (i.e. two calls with `null` should
   * return the same value). But it can change for a given `index`.
   *
   * @param index Widget position or null
   * @returns Estimated widget height
   *
   * TODO? make optional to switch between windowing and not windowing
   */
  abstract estimateWidgetHeight: (index: number | null) => number;

  /**
   * A signal emitted when any model state changes.
   */
  readonly stateChanged = new Signal<
    WindowedListModel,
    IChangedArgs<
      number | boolean,
      number | boolean,
      'count' | 'overscanCount' | 'windowingActive'
    >
  >(this);

  private _isDisposed = false;
  private _overscanCount = 1;
  private _widgetCount = 0;
  private _windowingActive = true;
}

export namespace IWindowedListModel {
  export interface IOptions {
    count?: number;
    overscanCount?: number;

    /**
     * Whether windowing is active or not.
     *
     * This is true by default.
     */
    windowingActive?: boolean;
  }
}

export class WindowedList extends Widget {
  static readonly DEFAULT_WIDGET_SIZE = 50;

  constructor(options: WindowedList.IOptions) {
    // TODO probably needs to be able to customize outer HTML tag (could be ul / ol / table, ...)
    const node = document.createElement('div');
    node.className = 'jp-WindowedPanel-outer';
    const innerElement = node.appendChild(document.createElement('div'));
    innerElement.className = 'jp-WindowedPanel-inner';
    const windowContainer = innerElement.appendChild(
      document.createElement('div')
    );
    windowContainer.className = 'jp-WindowedPanel-window';
    super({ node });
    this._model = options.model;
    this._height = 0;
    this._innerElement = innerElement;
    this._windowElement = windowContainer;
    this._lastMeasuredIndex = -1;
    this._scrollOffset = 0;
    this._scrollRepaint = null;
    this._scrollUpdateWasRequested = false;
    this._currentWindow = [-1, -1, -1, -1];
    this._resizeObserver = null;
    this._estimatedWidgetSize =
      this.widgetSize(null) ?? WindowedList.DEFAULT_WIDGET_SIZE;
    this._sizeCache = new WeakMap<HTMLElement, number>();
    this._widgetOffsets = {};
    this.layout = options.layout ?? new WindowedLayout();

    this._model.stateChanged.connect(this.onStateChanged, this);
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

  protected get overscanCount(): number {
    return this._model.overscanCount ?? 1;
  }

  protected get widgetRenderer(): (index: number) => Widget {
    return this._model.widgetRenderer;
  }

  protected get widgetSize(): (index: number | null) => number {
    return this._model.estimateWidgetHeight;
  }

  protected get widgetCount(): number {
    return this._model.widgetCount;
  }

  protected get windowingActive(): boolean {
    return this._model.windowingActive ?? true;
  }

  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    if (this.windowingActive) {
      this.addListeners();
    }
    this._height = this.node.getBoundingClientRect().height;
  }

  private addListeners() {
    if (!this._resizeObserver) {
      this._resizeObserver = new ResizeObserver(
        this._onWidgetResize.bind(this)
      );
    }
    for (const widget of this.layout.widgets) {
      this._resizeObserver.observe(widget.node);
    }
    this.node.addEventListener('scroll', this, passiveIfSupported);
    this._windowElement.style.position = 'absolute';
  }

  protected onBeforeDetach(msg: Message): void {
    if (this.windowingActive) {
      this.removeListeners();
    }
  }

  private removeListeners() {
    this.node.removeEventListener('scroll', this);
    this._resizeObserver?.disconnect();
    this._resizeObserver = null;
    this._innerElement.style.height = '100%';
    this._windowElement.style.position = 'relative';
    this._windowElement.style.top = '0px';
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
    this._scrollOffset = scrollOffset;
    this._scrollUpdateWasRequested = false;

    this.update();
  }

  protected onStateChanged(
    model: IWindowedListModel,
    changes: IChangedArgs<
      number | boolean,
      number | boolean,
      'count' | 'overscanCount' | 'windowingActive'
    >
  ): void {
    switch (changes.name) {
      case 'windowingActive':
        if (this.windowingActive) {
          this.addListeners();
        } else {
          this.removeListeners();
        }
    }
    this.update();
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
    // Throttle update request
    if (this._scrollRepaint === null) {
      this._scrollRepaint = window.requestAnimationFrame(() => {
        this._scrollRepaint = null;
        this._update();
      });
    }
  }

  private _update(): void {
    let newWindowIndex: [number, number, number, number] = [
      0,
      Math.max(this.widgetCount - 1, 0),
      0,
      Math.max(this.widgetCount - 1, 0)
    ];
    if (this.windowingActive) {
      newWindowIndex = this._getRangeToRender();
    }
    const [startIndex, stopIndex] = newWindowIndex;
    console.log(
      `Updating range ${this._currentWindow} -> ${newWindowIndex}...`
    );

    if (
      this._currentWindow[0] !== startIndex ||
      this._currentWindow[1] !== stopIndex
    ) {
      const toAdd: Widget[] = [];
      for (let index = startIndex; index <= stopIndex; index++) {
        toAdd.push(this.widgetRenderer(index));
      }
      const nWidgets = this.layout.widgets.length;
      // Remove not needed widgets
      for (let itemIdx = nWidgets - 1; itemIdx >= 0; itemIdx--) {
        if (!toAdd.includes(this.layout.widgets[itemIdx])) {
          this._resizeObserver?.unobserve(this.layout.widgets[itemIdx].node);
          this.layout.removeWidget(this.layout.widgets[itemIdx]);
        }
      }

      for (let index = 0; index < toAdd.length; index++) {
        const item = toAdd[index];
        if (!this.layout.widgets.includes(item)) {
          this._resizeObserver?.observe(item.node);
          this.layout.insertWidget(index, item);
        } else {
          const position = this.layout.widgets.findIndex(w => w === item);
          if (position !== index) {
            console.error(`Check widget at ${position} should be at ${index}`);
          }
        }
      }

      this._currentWindow = newWindowIndex;
    }

    if (this.windowingActive) {
      // Read this value after creating the cells.
      // So their actual sizes are taken into account
      const estimatedTotalHeight = this._getEstimatedTotalSize();

      // Update inner container height
      this._innerElement.style.height = `${estimatedTotalHeight}px`;

      // Update position of window container
      const startOffset =
        startIndex > 0 ? this._getItemMetadata(startIndex - 1).offset : 0;
      this._windowElement.style.top = `${startOffset}px`;
      const stopOffsize = this._getItemMetadata(stopIndex).offset;
      this._windowElement.style.minHeight = `${stopOffsize - startOffset}px`;

      // Update scroll
      if (this._scrollUpdateWasRequested) {
        this.node.scrollTop = this._scrollOffset;
      }
    }
  }

  private _getRangeToRender(): WindowedList.WindowIndex {
    const widgetCount = this.widgetCount;

    if (widgetCount === 0) {
      return [0, 0, 0, 0];
    }

    const startIndex = this._getStartIndexForOffset(this._scrollOffset);
    const stopIndex = this._getStopIndexForStartIndex(
      startIndex,
      this._scrollOffset
    );

    const overscanBackward = Math.max(1, this.overscanCount);
    const overscanForward = Math.max(1, this.overscanCount);

    return [
      Math.max(0, startIndex - overscanBackward),
      Math.max(0, Math.min(widgetCount - 1, stopIndex + overscanForward)),
      startIndex,
      stopIndex
    ];
  }

  private _getItemMetadata(index: number): WindowedList.ItemMetadata {
    if (index > this._lastMeasuredIndex) {
      let offset = 0;
      if (this._lastMeasuredIndex >= 0) {
        const itemMetadata = this._widgetOffsets[this._lastMeasuredIndex];
        offset = itemMetadata.offset;
      }

      for (let i = this._lastMeasuredIndex + 1; i <= index; i++) {
        const node = this._widgetOffsets[i]?.node;
        // Preferred measured cached size to size estimator
        let size = (node && this._sizeCache.get(node)) ?? this.widgetSize(i);

        offset += size;

        this._widgetOffsets[i] = {
          offset,
          node
        };
      }

      this._lastMeasuredIndex = index;
    }

    return this._widgetOffsets[index];
  }

  private _findNearestItem(offset: number): number {
    const lastMeasuredItemOffset =
      this._lastMeasuredIndex > 0
        ? this._widgetOffsets[this._lastMeasuredIndex].offset
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
      const previousOffset =
        middle > 0 ? this._getItemMetadata(middle - 1).offset : 0;
      const currentOffset = this._getItemMetadata(middle).offset;

      if (previousOffset <= offset && offset < currentOffset) {
        return middle;
      } else if (currentOffset < offset) {
        low = middle + 1;
      } else if (previousOffset > offset) {
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
      index < this.widgetCount &&
      this._getItemMetadata(index).offset < offset
    ) {
      index += interval;
      interval *= 2;
    }

    return this._findNearestItemBinarySearch(
      Math.min(index, this.widgetCount - 1),
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

    let offset = itemMetadata.offset;
    let stopIndex = startIndex;

    while (stopIndex < this.widgetCount - 1 && offset < maxOffset) {
      stopIndex++;
      offset = this._getItemMetadata(stopIndex).offset;
    }

    return stopIndex;
  }

  private _getEstimatedTotalSize(): number {
    let totalSizeOfMeasuredItems = 0;

    if (this._lastMeasuredIndex >= this.widgetCount) {
      this._lastMeasuredIndex = this.widgetCount - 1;
    }

    // Update lastMeasuredIndex if following items have been measured (offset is wrong)
    for (
      let index = this._lastMeasuredIndex + 1;
      index < this.widgetCount;
      index++
    ) {
      const node = this._widgetOffsets[index]?.node;
      const cachedSize = node ? this._sizeCache.get(node) : null;
      if (typeof cachedSize === 'number') {
        this._widgetOffsets[index].offset =
          this._widgetOffsets[this._lastMeasuredIndex].offset + cachedSize;
        this._lastMeasuredIndex++;
      } else {
        break;
      }
    }

    if (this._lastMeasuredIndex >= 0) {
      const itemMetadata = this._widgetOffsets[this._lastMeasuredIndex];
      totalSizeOfMeasuredItems = itemMetadata.offset;
    }

    // We can do better than this
    const numUnmeasuredItems = this.widgetCount - this._lastMeasuredIndex - 1;
    const totalSizeOfUnmeasuredItems =
      numUnmeasuredItems * this._estimatedWidgetSize;

    return totalSizeOfMeasuredItems + totalSizeOfUnmeasuredItems;
  }

  private _onWidgetResize(entries: ResizeObserverEntry[]): void {
    // console.log('Calling _onWidgetResize...');
    let maxIndex = -1;
    for (let entry of entries) {
      const index =
        this._currentWindow[0] +
        Array.prototype.indexOf.call(
          this._windowElement.children,
          entry.target
        );

      const node = entry.target as HTMLElement;
      this._widgetOffsets[index].node = node;
      const measuredSize = entry.borderBoxSize[0].blockSize;
      if (this._sizeCache.get(node) != measuredSize) {
        this._sizeCache.set(node, measuredSize);
        // Update offset
        const previousOffset =
          index > 0 ? this._widgetOffsets[index - 1].offset : 0;
        this._widgetOffsets[index].offset = previousOffset + measuredSize;
        maxIndex = Math.max(maxIndex, index);
      }
    }

    // Invalid follow-up index
    if (maxIndex >= 0) {
      this._lastMeasuredIndex = Math.min(this._lastMeasuredIndex, maxIndex);
    }

    // Update the list
    this.update();
  }

  protected _model: IWindowedListModel;
  private _height: number;
  private _innerElement: HTMLDivElement;
  private _windowElement: HTMLDivElement;
  private _lastMeasuredIndex: number;
  private _widgetOffsets: { [index: number]: WindowedList.ItemMetadata };
  private _sizeCache: WeakMap<HTMLElement, number>;
  private _estimatedWidgetSize: number;
  private _scrollOffset: number;
  private _scrollRepaint: number | null;
  private _scrollUpdateWasRequested: boolean;
  private _currentWindow: WindowedList.WindowIndex;
  private _resizeObserver: ResizeObserver | null;
}

export class WindowedLayout extends PanelLayout {
  constructor() {
    super({ fitPolicy: 'set-no-constraint' });
  }
  /**
   * Specialized parent type definition
   */
  parent: WindowedList | null;

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
    // Optimize move without de-/attaching as motion appends with parent attached

    // Case fromIndex === toIndex, already checked in PanelLayout.insertWidget

    // Look up the next sibling reference node.
    let ref = this.parent!.innerNode.children[toIndex];
    if (fromIndex < toIndex) {
      ref.insertAdjacentElement('afterend', widget.node);
    } else {
      ref.insertAdjacentElement('beforebegin', widget.node);
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

export namespace WindowedList {
  export interface IOptions {
    model: IWindowedListModel;
    layout?: WindowedLayout;
  }

  export type ItemMetadata = {
    /**
     * Offset at which the following item must be positioned
     */
    offset: number;
    /**
     * Widget node
     */
    node?: HTMLElement;
  };

  export type WindowIndex = [number, number, number, number];
}
