/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * This code is inspired by
 * - react-window https://github.com/bvaughn/react-window
 * That library is licensed under MIT License (MIT) Copyright (c) 2018 Brian Vaughn
 * - https://github.com/WICG/virtual-scroller/
 * Licensed by Contributors under the [W3C Software and Document License](http://www.w3.org/Consortium/Legal/2015/copyright-software-and-document)
 */
import { IChangedArgs } from '@jupyterlab/coreutils';
import { IObservableList } from '@jupyterlab/observables';
import { ArrayExt } from '@lumino/algorithm';
import { PromiseDelegate } from '@lumino/coreutils';
import { IDisposable } from '@lumino/disposable';
import { Message, MessageLoop } from '@lumino/messaging';
import { ISignal, Signal } from '@lumino/signaling';
import { PanelLayout, Widget } from '@lumino/widgets';

/**
 * Maximal remaining time for idle callback
 *
 * Ref: https://developer.mozilla.org/en-US/docs/Web/API/Background_Tasks_API#getting_the_most_out_of_idle_callbacks
 */
const MAXIMUM_TIME_REMAINING = 50;

/*
 * Feature detection
 *
 * Ref: https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#improving_scrolling_performance_with_passive_listeners
 */
let passiveIfSupported: boolean | { passive: boolean } = false;

try {
  // @ts-expect-error unknown signature
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

/**
 * Windowed list abstract model.
 */
export abstract class WindowedListModel implements WindowedList.IModel {
  /**
   * Constructor
   *
   * @param options Constructor options
   */
  constructor(options: WindowedList.IModelOptions = {}) {
    this._widgetCount = options.itemsList?.length ?? options.count ?? 0;
    this._overscanCount = options.overscanCount ?? 1;
    this._windowingActive = options.windowingActive ?? true;
    this.itemsList = options.itemsList ?? null;
  }

  /**
   * Provide a best guess for the widget size at position index
   *
   * #### Notes
   *
   * This function should be very light to compute especially when
   * returning the default size.
   * The default value should be constant (i.e. two calls with `null` should
   * return the same value). But it can change for a given `index`.
   *
   * @param index Widget position
   * @returns Estimated widget size
   */
  abstract estimateWidgetSize: (index: number) => number;

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
   * List widget height
   */
  get height(): number {
    return this._height;
  }
  set height(h: number) {
    this._height = h;
  }

  /**
   * Test whether the model is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Items list to be rendered
   */
  get itemsList(): IObservableList<any> | null {
    return this._itemsList;
  }
  set itemsList(v: IObservableList<any> | null) {
    if (this._itemsList !== v) {
      if (this._itemsList) {
        this._itemsList.changed.disconnect(this.onListChanged, this);
      }
      const oldValue = this._itemsList;
      this._itemsList = v;
      if (this._itemsList) {
        this._itemsList.changed.connect(this.onListChanged, this);
      } else {
        this._widgetCount = 0;
      }
      this._stateChanged.emit({
        name: 'list',
        newValue: this._itemsList,
        oldValue
      });
      this._stateChanged.emit({
        name: 'count',
        newValue: this._itemsList?.length ?? 0,
        oldValue: oldValue?.length ?? 0
      });
    }
  }

  /**
   * Number of widgets to render in addition to those
   * visible in the viewport.
   */
  get overscanCount(): number {
    return this._overscanCount;
  }
  set overscanCount(newValue: number) {
    if (newValue >= 1) {
      if (this._overscanCount !== newValue) {
        const oldValue = this._overscanCount;
        this._overscanCount = newValue;
        this._stateChanged.emit({ name: 'overscanCount', newValue, oldValue });
      }
    } else {
      console.error(`Forbidden non-positive overscan count: got ${newValue}`);
    }
  }

  /**
   * Viewport scroll offset.
   */
  get scrollOffset(): number {
    return this._scrollOffset;
  }
  set scrollOffset(offset: number) {
    this._scrollOffset = offset;
  }

  /**
   * Total number of widgets in the list
   */
  get widgetCount(): number {
    return this._itemsList ? this._itemsList.length : this._widgetCount;
  }
  set widgetCount(newValue: number) {
    if (this.itemsList) {
      console.error(
        'It is not allow to change the widgets count of a windowed list if a items list is used.'
      );
      return;
    }

    if (newValue >= 0) {
      if (this._widgetCount !== newValue) {
        const oldValue = this._widgetCount;
        this._widgetCount = newValue;
        this._stateChanged.emit({ name: 'count', newValue, oldValue });
      }
    } else {
      console.error(`Forbidden negative widget count: got ${newValue}`);
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

      this._currentWindow = [-1, -1, -1, -1];
      this._lastMeasuredIndex = -1;
      this._widgetSizers = [];

      this._stateChanged.emit({ name: 'windowingActive', newValue, oldValue });
    }
  }

  /**
   * A signal emitted when any model state changes.
   */
  get stateChanged(): ISignal<
    WindowedListModel,
    IChangedArgs<
      any,
      any,
      'count' | 'index' | 'list' | 'overscanCount' | 'windowingActive'
    >
  > {
    return this._stateChanged;
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
   * Get the total list size.
   *
   * @returns Total estimated size
   */
  getEstimatedTotalSize(): number {
    let totalSizeOfMeasuredItems = 0;

    if (this._lastMeasuredIndex >= this.widgetCount) {
      this._lastMeasuredIndex = this.widgetCount - 1;
    }

    if (this._lastMeasuredIndex >= 0) {
      const itemMetadata = this._widgetSizers[this._lastMeasuredIndex];
      totalSizeOfMeasuredItems = itemMetadata.offset + itemMetadata.size;
    }

    // We can do better than this
    const numUnmeasuredItems = this.widgetCount - this._lastMeasuredIndex - 1;
    const totalSizeOfUnmeasuredItems =
      numUnmeasuredItems * this._estimatedWidgetSize;

    return totalSizeOfMeasuredItems + totalSizeOfUnmeasuredItems;
  }

  /**
   * Get the scroll offset to display an item in the viewport.
   *
   * @param index Item index
   * @param align Where to align the item in the viewport
   * @returns The needed scroll offset
   */
  getOffsetForIndexAndAlignment(
    index: number,
    align: WindowedList.ScrollToAlign = 'auto'
  ): number {
    const size = this._height;
    const itemMetadata = this._getItemMetadata(index);

    // Get estimated total size after ItemMetadata is computed,
    // To ensure it reflects actual measurements instead of just estimates.
    const estimatedTotalSize = this.getEstimatedTotalSize();

    const maxOffset = Math.max(
      0,
      Math.min(estimatedTotalSize - size, itemMetadata.offset)
    );
    const minOffset = Math.max(
      0,
      itemMetadata.offset - size + itemMetadata.size
    );

    if (align === 'smart') {
      if (
        this._scrollOffset >= minOffset - size &&
        this._scrollOffset <= maxOffset + size
      ) {
        align = 'auto';
      } else {
        align = 'center';
      }
    }

    switch (align) {
      case 'start':
        return maxOffset;
      case 'end':
        return minOffset;
      case 'center':
        return Math.round(minOffset + (maxOffset - minOffset) / 2);
      case 'auto':
      default:
        if (
          this._scrollOffset >= minOffset &&
          this._scrollOffset <= maxOffset
        ) {
          return this._scrollOffset;
        } else if (this._scrollOffset < minOffset) {
          return minOffset;
        } else {
          return maxOffset;
        }
    }
  }

  /**
   * Compute the items range to display.
   *
   * It returns ``null`` if the range does not need to be updated.
   *
   * @returns The current items range to display
   */
  getRangeToRender(): WindowedList.WindowIndex | null {
    let newWindowIndex: [number, number, number, number] = [
      0,
      Math.max(this.widgetCount - 1, -1),
      0,
      Math.max(this.widgetCount - 1, -1)
    ];

    const previousLastMeasuredIndex = this._lastMeasuredIndex;
    if (this.windowingActive) {
      newWindowIndex = this._getRangeToRender();
    }
    const [startIndex, stopIndex] = newWindowIndex;

    if (
      previousLastMeasuredIndex <= stopIndex ||
      this._currentWindow[0] !== startIndex ||
      this._currentWindow[1] !== stopIndex
    ) {
      this._currentWindow = newWindowIndex;
      return newWindowIndex;
    }

    return null;
  }

  /**
   * Return the viewport top position and height for range spanning from
   * ``startIndex`` to ``stopIndex``.
   *
   * @param startIndex First item in viewport index
   * @param stopIndex Last item in viewport index
   * @returns The viewport top position and its height
   */
  getSpan(startIndex: number, stopIndex: number): [number, number] {
    const startSize = this._getItemMetadata(startIndex);
    const top = startSize.offset;
    const stopSize = this._getItemMetadata(stopIndex);
    const height = stopSize.offset - startSize.offset + stopSize.size;
    return [top, height];
  }

  /**
   * WindowedListModel caches offsets and measurements for each index for performance purposes.
   * This method clears that cached data for all items after (and including) the specified index.
   *
   * The list will automatically re-render after the index is reset.
   *
   * @param index
   */
  resetAfterIndex(index: number): void {
    const oldValue = this._lastMeasuredIndex;
    this._lastMeasuredIndex = Math.min(index, this._lastMeasuredIndex);
    if (this._lastMeasuredIndex !== oldValue) {
      this._stateChanged.emit({ name: 'index', newValue: index, oldValue });
    }
  }

  /**
   * Update item sizes.
   *
   * This should be called when the real item sizes has been
   * measured.
   *
   * @param sizes New sizes per item index
   * @returns Whether some sizes changed or not
   */
  setWidgetSize(sizes: { index: number; size: number }[]): boolean {
    if (this._currentWindow[0] >= 0) {
      let minIndex = Infinity;
      for (const item of sizes) {
        const key = item.index;
        const size = item.size;

        if (this._widgetSizers[key].size != size) {
          this._widgetSizers[key].size = size;
          minIndex = Math.min(minIndex, key);
        }
        // Always set the flag in case the size estimator provides perfect result
        this._widgetSizers[key].measured = true;
      }

      // If some sizes changed
      if (minIndex != Infinity) {
        // Invalid follow-up index
        this._lastMeasuredIndex = Math.min(this._lastMeasuredIndex, minIndex);
        return true;
      }
    }

    return false;
  }

  /**
   * Callback on list changes
   *
   * @param list List items
   * @param changes List change
   */
  protected onListChanged(
    list: IObservableList<Widget>,
    changes: IObservableList.IChangedArgs<Widget>
  ): void {
    switch (changes.type) {
      case 'add':
        this._widgetSizers.splice(
          changes.newIndex,
          0,
          ...new Array(changes.newValues.length).map(() => {
            return { offset: 0, size: this._estimatedWidgetSize };
          })
        );
        this.resetAfterIndex(changes.newIndex - 1);
        break;
      case 'move':
        ArrayExt.move(this._widgetSizers, changes.oldIndex, changes.newIndex);
        this.resetAfterIndex(Math.min(changes.newIndex, changes.oldIndex) - 1);
        break;
      case 'remove':
        this._widgetSizers.splice(changes.oldIndex, changes.oldValues.length);
        this.resetAfterIndex(changes.oldIndex - 1);
        break;
      case 'set':
        this.resetAfterIndex(changes.newIndex - 1);
        break;
    }
  }

  private _getItemMetadata(index: number): WindowedList.ItemMetadata {
    if (index > this._lastMeasuredIndex) {
      let offset = 0;
      if (this._lastMeasuredIndex >= 0) {
        const itemMetadata = this._widgetSizers[this._lastMeasuredIndex];
        offset = itemMetadata.offset + itemMetadata.size;
      }

      for (let i = this._lastMeasuredIndex + 1; i <= index; i++) {
        let size = this._widgetSizers[i]?.measured
          ? this._widgetSizers[i].size
          : this.estimateWidgetSize(i);

        this._widgetSizers[i] = {
          offset,
          size,
          measured: this._widgetSizers[i]?.measured
        };

        offset += size;
      }

      this._lastMeasuredIndex = index;
    }

    for (let i = 0; i <= this._lastMeasuredIndex; i++) {
      const sizer = this._widgetSizers[i];
      if (i === 0) {
        if (sizer.offset !== 0) {
          throw new Error('First offset is not null');
        }
      } else {
        const previous = this._widgetSizers[i - 1];
        if (sizer.offset !== previous.offset + previous.size) {
          throw new Error(`Sizer ${i} has incorrect offset.`);
        }
      }
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

  private _getRangeToRender(): WindowedList.WindowIndex {
    const widgetCount = this.widgetCount;

    if (widgetCount === 0) {
      return [-1, -1, -1, -1];
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

    while (stopIndex < this.widgetCount - 1 && offset < maxOffset) {
      stopIndex++;
      offset += this._getItemMetadata(stopIndex).size;
    }

    return stopIndex;
  }

  /**
   * Default widget size estimation
   */
  protected _estimatedWidgetSize: number = WindowedList.DEFAULT_WIDGET_SIZE;
  protected _stateChanged = new Signal<
    WindowedListModel,
    IChangedArgs<
      any,
      any,
      'count' | 'index' | 'list' | 'overscanCount' | 'windowingActive'
    >
  >(this);

  private _currentWindow: WindowedList.WindowIndex = [-1, -1, -1, -1];
  private _height: number = 0;
  private _isDisposed = false;
  private _itemsList: IObservableList<any> | null = null;
  private _lastMeasuredIndex: number = -1;
  private _overscanCount = 1;
  private _scrollOffset: number = 0;
  private _widgetCount = 0;
  private _widgetSizers: WindowedList.ItemMetadata[] = [];
  private _windowingActive = true;
}

/**
 * Windowed list widget
 */
export class WindowedList<
  T extends WindowedList.IModel = WindowedList.IModel
> extends Widget {
  /**
   * Default widget size
   */
  static readonly DEFAULT_WIDGET_SIZE = 50;

  /**
   * Constructor
   *
   * @param options Constructor options
   */
  constructor(options: WindowedList.IOptions<T>) {
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
    super.layout = options.layout ?? new WindowedLayout();
    this._viewModel = options.model;
    this._innerElement = innerElement;
    this._isScrolling = null;
    this._windowElement = windowContainer;
    this._scrollToItem = null;
    this._scrollRepaint = null;
    this._scrollUpdateWasRequested = false;
    this._resizeObserver = null;

    this._viewModel.stateChanged.connect(this.onStateChanged, this);
  }

  /**
   * Widget layout
   */
  get layout(): WindowedLayout {
    return super.layout as WindowedLayout;
  }

  /**
   * Viewport
   */
  get viewportNode(): HTMLDivElement {
    return this._windowElement;
  }

  /**
   * Windowed list view model
   */
  protected get viewModel(): T {
    return this._viewModel;
  }

  /**
   * Callback on event.
   *
   * @param event Event
   */
  handleEvent(event: Event): void {
    switch (event.type) {
      case 'scroll':
        this.onScroll(event);
        break;
    }
  }

  /**
   * Scroll to the specified offset `scrollTop`.
   *
   * @param scrollOffset Offset to scroll
   *
   * @deprecated since v4 This is an internal helper. Prefer calling `scrollToItem`.
   */
  scrollTo(scrollOffset: number): void {
    if (!this.viewModel.windowingActive) {
      this.node.scrollTo({ top: scrollOffset });
      return;
    }

    scrollOffset = Math.max(0, scrollOffset);

    if (scrollOffset !== this.viewModel.scrollOffset) {
      this.viewModel.scrollOffset = scrollOffset;
      this._scrollUpdateWasRequested = true;

      this.update();
    }
  }

  /**
   * Scroll to the specified item.
   *
   * By default, the List will scroll as little as possible to ensure the item is visible. You can control the alignment of the item though by specifying a second alignment parameter. Acceptable values are:
   *
   *   auto (default) - Scroll as little as possible to ensure the item is visible. (If the item is already visible, it won't scroll at all.)
   *   smart - If the item is already visible, don't scroll at all. If it is less than one viewport away, scroll as little as possible so that it becomes visible. If it is more than one viewport away, scroll so that it is centered within the list.
   *   center - Center align the item within the list.
   *   end - Align the item to the end of the list
   *   start - Align the item to the beginning of the list
   *
   * @param index Item index to scroll to
   * @param align Type of alignment
   */
  scrollToItem(
    index: number,
    align: WindowedList.ScrollToAlign = 'auto'
  ): Promise<void> {
    if (!this.viewModel.windowingActive) {
      const widget = this.layout.widgets[index];
      if (widget?.node.scrollIntoView) {
        widget.node.scrollIntoView({
          block: ['auto', 'smart'].includes(align)
            ? 'nearest'
            : (align as ScrollLogicalPosition)
        });
      }
      return Promise.resolve();
    }

    if (
      !this._isScrolling ||
      this._scrollToItem === null ||
      this._scrollToItem[0] !== index ||
      this._scrollToItem[1] !== align
    ) {
      if (this._isScrolling) {
        this._isScrolling.reject('Scrolling to a new item is requested.');
      }

      this._isScrolling = new PromiseDelegate<void>();
    }

    this._scrollToItem = [index, align];
    this._resetScrollToItem();
    this.scrollTo(
      this.viewModel.getOffsetForIndexAndAlignment(
        Math.max(0, Math.min(index, this._viewModel.widgetCount - 1)),
        align
      )
    );

    return this._isScrolling.promise;
  }

  /**
   * A message handler invoked on an `'after-attach'` message.
   */
  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    if (this._viewModel.windowingActive) {
      this._addListeners();
    }
    this.viewModel.height = this.node.getBoundingClientRect().height;
  }

  /**
   * A message handler invoked on an `'before-detach'` message.
   */
  protected onBeforeDetach(msg: Message): void {
    if (this._viewModel.windowingActive) {
      this._removeListeners();
    }
  }

  /**
   * Callback on scroll event
   *
   * @param event Scroll event
   */
  protected onScroll(event: Event): void {
    const { clientHeight, scrollHeight, scrollTop } =
      event.currentTarget as HTMLDivElement;

    // TBC Firefox is emitting two events one with 1px diff then the _real_ scroll
    if (
      !this._scrollUpdateWasRequested &&
      Math.abs(this.viewModel.scrollOffset - scrollTop) > 1
    ) {
      // Test if the scroll event is jumping to the list bottom
      // if (Math.abs(scrollHeight - clientHeight - scrollTop) < 1) {
      //   // FIXME Does not work because it happens in multiple segments in between which the sizing is changing
      //   // due to widget resizing. A possible fix would be to keep track of the "old" scrollHeight - clientHeight
      //   // up to some quiet activity.
      //   this.scrollToItem(this.widgetCount, 'end');
      // } else {
      const scrollOffset = Math.max(
        0,
        Math.min(scrollTop, scrollHeight - clientHeight)
      );
      this.viewModel.scrollOffset = scrollOffset;
      this._scrollUpdateWasRequested = false;

      this.update();
      // }
    }
  }

  /**
   * A message handler invoked on an `'resize-request'` message.
   */
  protected onResize(msg: Widget.ResizeMessage): void {
    this.viewModel.height =
      msg.height >= 0 ? msg.height : this.node.getBoundingClientRect().height;
    super.onResize(msg);
  }

  /**
   * Callback on view model change
   *
   * @param model Windowed list model
   * @param changes Change
   */
  protected onStateChanged(
    model: WindowedList.IModel,
    changes: IChangedArgs<number | boolean, number | boolean, string>
  ): void {
    switch (changes.name) {
      case 'windowingActive':
        if (this.viewModel.windowingActive) {
          this._addListeners();
          this.onScroll({ currentTarget: this.node } as any);
          // Bail as onScroll will trigger update
          return;
        } else {
          this._removeListeners();
        }
        break;
    }
    this.update();
  }

  /**
   * A message handler invoked on an `'update-request'` message.
   *
   * #### Notes
   * The default implementation of this handler is a no-op.
   */
  protected onUpdateRequest(msg: Message): void {
    if (this.viewModel.windowingActive) {
      // Throttle update request
      if (this._scrollRepaint === null) {
        this._scrollRepaint = window.requestAnimationFrame(() => {
          this._scrollRepaint = null;
          this._update();
        });
      }
    } else {
      this._update();
    }
  }

  private _addListeners() {
    if (!this._resizeObserver) {
      this._resizeObserver = new ResizeObserver(
        this._onWidgetResize.bind(this)
      );
    }
    for (const widget of this.layout.widgets) {
      this._resizeObserver.observe(widget.node);
      widget.disposed.connect(() =>
        this._resizeObserver?.unobserve(widget.node)
      );
    }
    this.node.addEventListener('scroll', this, passiveIfSupported);
    this._windowElement.style.position = 'absolute';
  }

  private _removeListeners() {
    this.node.removeEventListener('scroll', this);
    this._resizeObserver?.disconnect();
    this._resizeObserver = null;
    this._innerElement.style.height = '100%';
    this._windowElement.style.position = 'relative';
    this._windowElement.style.top = '0px';
  }

  private _update(): void {
    if (this.isDisposed || !this.layout) {
      return;
    }

    const newWindowIndex = this.viewModel.getRangeToRender();

    if (newWindowIndex !== null) {
      const [startIndex, stopIndex] = newWindowIndex;
      const toAdd: Widget[] = [];
      if (stopIndex >= 0) {
        for (let index = startIndex; index <= stopIndex; index++) {
          const widget = this.viewModel.widgetRenderer(index);
          widget.dataset.windowedListIndex = `${index}`;
          toAdd.push(widget);
        }
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
        if (this._resizeObserver && !this.layout.widgets.includes(item)) {
          this._resizeObserver.observe(item.node);
          item.disposed.connect(() =>
            this._resizeObserver?.unobserve(item.node)
          );
        }

        // The widget may have moved due to drag-and-drop
        this.layout.insertWidget(index, item);
      }

      if (this.viewModel.windowingActive) {
        if (stopIndex >= 0) {
          // Read this value after creating the cells.
          // So their actual sizes are taken into account
          const estimatedTotalHeight = this.viewModel.getEstimatedTotalSize();

          // Update inner container height
          this._innerElement.style.height = `${estimatedTotalHeight}px`;

          // Update position of window container
          const [top, minHeight] = this.viewModel.getSpan(
            startIndex,
            stopIndex
          );
          this._windowElement.style.top = `${top}px`;
          this._windowElement.style.minHeight = `${minHeight}px`;
        } else {
          // Update inner container height
          this._innerElement.style.height = `0px`;

          // Update position of window container
          this._windowElement.style.top = `0px`;
          this._windowElement.style.minHeight = `0px`;
        }

        // Update scroll
        if (this._scrollUpdateWasRequested) {
          this.node.scrollTop = this.viewModel.scrollOffset;
          this._scrollUpdateWasRequested = false;
        }
      }
    }

    let index2 = -1;
    for (const w of this.viewportNode.children) {
      const currentIdx = parseInt(
        (w as HTMLElement).dataset.windowedListIndex!,
        10
      );
      if (currentIdx < index2) {
        throw new Error('Inconsistent dataset index');
      } else {
        index2 = currentIdx;
      }
    }
  }

  private _onWidgetResize(entries: ResizeObserverEntry[]): void {
    this._resetScrollToItem();

    const newSizes: { index: number; size: number }[] = [];
    for (let entry of entries) {
      // Update size only if item is attached to the DOM
      if (entry.target.isConnected) {
        // Rely on the data attribute as some nodes may be hidden instead of detach
        // to preserve state.
        newSizes.push({
          index: parseInt(
            (entry.target as HTMLElement).dataset.windowedListIndex!,
            10
          ),
          size: entry.borderBoxSize[0].blockSize
        });
      }
    }

    // If some sizes changed
    if (this.viewModel.setWidgetSize(newSizes)) {
      // Update the list
      if (this._scrollToItem) {
        this.scrollToItem(...this._scrollToItem).catch(reason => {
          console.log(reason);
        });
      } else {
        this.update();
      }
    }
  }

  private _resetScrollToItem(): void {
    if (this._resetScrollToItemTimeout) {
      clearTimeout(this._resetScrollToItemTimeout);
    }

    if (this._scrollToItem) {
      this._resetScrollToItemTimeout = window.setTimeout(() => {
        this._scrollToItem = null;
        if (this._isScrolling) {
          this._isScrolling.resolve();
          this._isScrolling = null;
        }
      }, MAXIMUM_TIME_REMAINING);
    }
  }

  protected _viewModel: T;
  private _innerElement: HTMLDivElement;
  private _isScrolling: PromiseDelegate<void> | null;
  private _windowElement: HTMLDivElement;
  private _resetScrollToItemTimeout: number | null;
  private _resizeObserver: ResizeObserver | null;
  private _scrollRepaint: number | null;
  private _scrollToItem: [number, WindowedList.ScrollToAlign] | null;
  private _scrollUpdateWasRequested: boolean;
}

/**
 * Customized layout for windowed list container.
 */
export class WindowedLayout extends PanelLayout {
  /**
   * Constructor
   */
  constructor() {
    super({ fitPolicy: 'set-no-constraint' });
  }

  /**
   * Specialized parent type definition
   */
  get parent(): WindowedList | null {
    return super.parent as WindowedList | null;
  }
  set parent(value: WindowedList | null) {
    super.parent = value;
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
    // Look up the next sibling reference node.
    let ref = this.parent!.viewportNode.children[index];

    // Send a `'before-attach'` message if the parent is attached.
    if (this.parent!.isAttached) {
      MessageLoop.sendMessage(widget, Widget.Msg.BeforeAttach);
    }

    // Insert the widget's node before the sibling.
    this.parent!.viewportNode.insertBefore(widget.node, ref);

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
    this.parent!.viewportNode.removeChild(widget.node);

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
    let ref = this.parent!.viewportNode.children[toIndex];
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

/**
 * A namespace for windowed list
 */
export namespace WindowedList {
  /**
   * Windowed list model interface
   */
  export interface IModel extends IDisposable {
    /**
     * Provide a best guess for the widget size at position index
     *
     * #### Notes
     *
     * This function should be very light to compute especially when
     * returning the default size.
     * The default value should be constant (i.e. two calls with `null` should
     * return the same value). But it can change for a given `index`.
     *
     * @param index Widget position
     * @returns Estimated widget size
     */
    estimateWidgetSize: (index: number) => number;

    /**
     * Get the total list size.
     *
     * @returns Total estimated size
     */
    getEstimatedTotalSize(): number;

    /**
     * Get the scroll offset to display an item in the viewport.
     *
     * @param index Item index
     * @param align Where to align the item in the viewport
     * @returns The needed scroll offset
     */
    getOffsetForIndexAndAlignment(index: number, align: ScrollToAlign): number;
    /**
     * Compute the items range to display.
     *
     * It returns ``null`` if the range does not need to be updated.
     *
     * @returns The current items range to display
     */
    getRangeToRender(): WindowIndex | null;

    /**
     * Return the viewport top position and height for range spanning from
     * ``startIndex`` to ``stopIndex``.
     *
     * @param start First item in viewport index
     * @param stop Last item in viewport index
     * @returns The viewport top position and its height
     */
    getSpan(start: number, stop: number): [number, number];

    /**
     * List widget height
     */
    height: number;

    /**
     * Items list to be rendered
     */
    itemsList: {
      length: number;
      changed: ISignal<any, IObservableList.IChangedArgs<any>>;
    } | null;

    /**
     * Number of widgets to render in addition to those
     * visible in the viewport.
     */
    overscanCount: number;

    /**
     * WindowedListModel caches offsets and measurements for each index for performance purposes.
     * This method clears that cached data for all items after (and including) the specified index.
     *
     * The list will automatically re-render after the index is reset.
     *
     * @param index
     */
    resetAfterIndex(index: number): void;

    /**
     * Viewport scroll offset.
     */
    scrollOffset: number;

    /**
     * Update item sizes.
     *
     * This should be called when the real item sizes has been
     * measured.
     *
     * @param sizes New sizes per item index
     * @returns Whether some sizes changed or not
     */
    setWidgetSize(sizes: { index: number; size: number }[]): boolean;

    /**
     * A signal emitted when any model state changes.
     */
    readonly stateChanged: ISignal<
      IModel,
      IChangedArgs<
        any,
        any,
        'count' | 'index' | 'list' | 'overscanCount' | 'windowingActive'
      >
    >;

    /**
     * Total number of widgets in the list
     */
    widgetCount: number;

    /**
     * Whether windowing is active or not.
     */
    windowingActive: boolean;

    /**
     * Widget factory for the list items.
     *
     * Caching the resulting widgets should be done by the callee.
     *
     * @param index List index
     * @returns The widget at the given position
     */
    widgetRenderer: (index: number) => Widget;
  }

  /**
   * Windowed list model constructor options
   */
  export interface IModelOptions {
    /**
     * Total number of widgets in the list.
     *
     * #### Notes
     * If an observable list is provided this will be ignored.
     */
    count?: number;

    /**
     * Dynamic list of items
     */
    itemsList?: IObservableList<any>;

    /**
     * Number of widgets to render in addition to those
     * visible in the viewport.
     */
    overscanCount?: number;

    /**
     * Whether windowing is active or not.
     *
     * This is true by default.
     */
    windowingActive?: boolean;
  }

  /**
   * Windowed list view constructor options
   */
  export interface IOptions<
    T extends WindowedList.IModel = WindowedList.IModel
  > {
    /**
     * Windowed list model to display
     */
    model: T;
    /**
     * Windowed list layout
     */
    layout?: WindowedLayout;
  }

  /**
   * Item list metadata
   */
  export type ItemMetadata = {
    /**
     * Item vertical offset in the container
     */
    offset: number;
    /**
     * Item height
     */
    size: number;
    /**
     * Whether the size is an estimation or a measurement.
     */
    measured?: boolean;
  };

  /**
   * Type of scroll
   */
  export type ScrollToAlign = 'auto' | 'smart' | 'center' | 'start' | 'end';

  /**
   * Widget range in view port
   */
  export type WindowIndex = [number, number, number, number];
}
