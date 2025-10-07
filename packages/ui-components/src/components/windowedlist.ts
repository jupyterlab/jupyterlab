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
import { Throttler } from '@lumino/polling';
import { ISignal, Signal } from '@lumino/signaling';
import { PanelLayout, Widget } from '@lumino/widgets';

/**
 * For how long after the scroll request should the target position
 * be corrected to account for resize of other widgets?
 *
 * The time is given in milliseconds.
 */
const MAXIMUM_TIME_REMAINING = 100;

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
   * The overlap threshold used to decide whether to scroll down to an item
   * below the viewport (smart mode). If the item overlap with the viewport
   * is greater or equal this threshold the item is considered sufficiently
   * visible and will not be scrolled to. The value is the number of pixels
   * in overlap if greater than one, or otherwise a fraction of item height.
   * By default the item is scrolled to if not full visible in the viewport.
   */
  readonly scrollDownThreshold: number = 1;

  /**
   * The underlap threshold used to decide whether to scroll up to an item
   * above the viewport (smart mode). If the item part outside the viewport
   * (underlap) is greater than this threshold then the item is considered
   * not sufficiently visible and will be scrolled to.
   * The value is the number of pixels in underlap if greater than one, or
   * otherwise a fraction of the item height.
   * By default the item is scrolled to if not full visible in the viewport.
   */
  readonly scrollUpThreshold: number = 0;

  /**
   * Top padding of the the outer window node.
   */
  paddingTop: number = 0;

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
  get itemsList(): ISimpleObservableList | null {
    return this._itemsList;
  }
  set itemsList(v: ISimpleObservableList | null) {
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
      this._measuredAllUntilIndex = -1;
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
      | 'count'
      | 'estimatedWidgetSize'
      | 'index'
      | 'list'
      | 'overscanCount'
      | 'windowingActive'
      | string
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
    let totalSizeOfInitialItems = 0;

    if (this._measuredAllUntilIndex >= this.widgetCount) {
      this._measuredAllUntilIndex = this.widgetCount - 1;
    }

    // These items are all measured already
    if (this._measuredAllUntilIndex >= 0) {
      const itemMetadata = this._widgetSizers[this._measuredAllUntilIndex];
      totalSizeOfInitialItems = itemMetadata.offset + itemMetadata.size;
    }

    // These items might have measurements, but some will be missing
    let totalSizeOfRemainingItems = 0;
    for (let i = this._measuredAllUntilIndex + 1; i < this.widgetCount; i++) {
      const sizer = this._widgetSizers[i];
      totalSizeOfRemainingItems += sizer?.measured
        ? sizer.size
        : this.estimateWidgetSize(i);
    }

    return totalSizeOfInitialItems + totalSizeOfRemainingItems;
  }

  /**
   * Get the scroll offset to display an item in the viewport.
   *
   * By default, the list will scroll as little as possible to ensure the item is fully visible (`auto`).
   * You can control the alignment of the item though by specifying a second alignment parameter.
   * Acceptable values are:
   *
   *   auto - Automatically align with the top or bottom minimising the amount scrolled,
   *          If `alignPreference` is given, follow such preferred alignment.
   *          If item is smaller than the viewport and fully visible, do not scroll at all.
   *   smart - If the item is significantly visible, don't scroll at all (regardless of whether it fits in the viewport).
   *           If the item is less than one viewport away, scroll so that it becomes fully visible (following the `auto` heuristics).
   *           If the item is more than one viewport away, scroll so that it is centered within the viewport (`center` if smaller than viewport, `top-center` otherwise).
   *   center - Align the middle of the item with the middle of the viewport (it only works well for items smaller than the viewport).
   *   top-center - Align the top of the item with the middle of the viewport (works well for items larger than the viewport).
   *   end - Align the bottom of the item to the bottom of the list.
   *   start - Align the top of item to the top of the list.
   *
   * An item is considered significantly visible if:
   *  - it overlaps with the viewport by the amount specified by `scrollDownThreshold` when below the viewport
   *  - it exceeds the viewport by the amount less than specified by `scrollUpThreshold` when above the viewport.
   *
   * @param index Item index
   * @param align Where to align the item in the viewport
   * @param margin The proportion of viewport to add when aligning with the top/bottom of the list.
   * @param precomputed Precomputed values to use when windowing is disabled.
   * @param alignPreference Allows to override the alignment of item when the `auto` heuristic decides that the item needs to be scrolled into view.
   * @returns The needed scroll offset
   */
  getOffsetForIndexAndAlignment(
    index: number,
    align: WindowedList.ScrollToAlign = 'auto',
    margin: number = 0,
    precomputed?: {
      totalSize: number;
      itemMetadata: WindowedList.ItemMetadata;
      currentOffset: number;
    },
    alignPreference?: WindowedList.BaseScrollToAlignment
  ): number {
    const boundedMargin = Math.min(Math.max(0.0, margin), 1.0);
    const size = this._height;
    const itemMetadata = precomputed
      ? precomputed.itemMetadata
      : this._getItemMetadata(index);

    const scrollDownThreshold =
      this.scrollDownThreshold <= 1
        ? itemMetadata.size * this.scrollDownThreshold
        : this.scrollDownThreshold;
    const scrollUpThreshold =
      this.scrollUpThreshold <= 1
        ? itemMetadata.size * this.scrollUpThreshold
        : this.scrollUpThreshold;

    // When pre-computed values are not available (we are in windowing mode),
    // `getEstimatedTotalSize` is called after ItemMetadata is computed
    // to ensure it reflects actual measurements instead of just estimates.
    const estimatedTotalSize = precomputed
      ? precomputed.totalSize
      : this.getEstimatedTotalSize();

    const topOffset = Math.max(
      0,
      Math.min(estimatedTotalSize - size, itemMetadata.offset)
    );
    const bottomOffset = Math.max(
      0,
      itemMetadata.offset - size + itemMetadata.size
    );
    // Current offset (+/- padding) is the top edge of the viewport.
    const currentOffset = precomputed
      ? precomputed.currentOffset
      : this._scrollOffset;

    const viewportPadding = this._windowingActive ? this.paddingTop : 0;
    const itemTop = itemMetadata.offset;
    const itemBottom = itemMetadata.offset + itemMetadata.size;
    const bottomEdge = currentOffset - viewportPadding + size;
    const topEdge = currentOffset - viewportPadding;
    const crossingBottomEdge = bottomEdge > itemTop && bottomEdge < itemBottom;
    const crossingTopEdge = topEdge > itemTop && topEdge < itemBottom;

    const isFullyWithinViewport = bottomEdge > itemBottom && topEdge < itemTop;

    if (align === 'smart') {
      const edgeLessThanOneViewportAway =
        currentOffset >= bottomOffset - size &&
        currentOffset <= topOffset + size;

      const visiblePartBottom = bottomEdge - itemTop;
      const hiddenPartTop = topEdge - itemTop;

      if (
        isFullyWithinViewport ||
        (crossingBottomEdge && visiblePartBottom >= scrollDownThreshold) ||
        (crossingTopEdge && hiddenPartTop < scrollUpThreshold)
      ) {
        return currentOffset;
      } else if (edgeLessThanOneViewportAway) {
        // Possibly less than one viewport away, scroll so that it becomes visible (including the margin)
        align = 'auto';
      } else {
        // More than one viewport away, scroll so that it is centered within the list:
        // - if the item is smaller than viewport align the middle of the item with the middle of the viewport
        // - if the item is larger than viewport align the top of the item with the middle of the viewport
        if (itemMetadata.size > size) {
          align = 'top-center';
        } else {
          align = 'center';
        }
      }
    }

    if (align === 'auto') {
      if (isFullyWithinViewport) {
        // No need to change the position, return the current offset.
        return currentOffset;
      } else if (alignPreference !== undefined) {
        align = alignPreference;
      } else if (crossingBottomEdge || bottomEdge <= itemBottom) {
        align = 'end';
      } else {
        align = 'start';
      }
    }

    switch (align) {
      case 'start':
        // Align item top to the top edge.
        return Math.max(0, topOffset - boundedMargin * size) + viewportPadding;
      case 'end':
        // Align item bottom to the bottom edge.
        return bottomOffset + boundedMargin * size + viewportPadding;
      case 'center':
        // Align item centre to the middle of the viewport
        return bottomOffset + (topOffset - bottomOffset) / 2;
      case 'top-center':
        // Align item top to the middle of the viewport
        return topOffset - size / 2;
    }
  }

  /**
   * Compute the items range to display.
   *
   * It returns ``null`` if the range does not need to be updated.
   *
   * @param options - Control how the range is computed.
   *   - `virtual`: If `true`, return a virtual range without updating
   *     the current window.
   *     If `false` or omitted, update and return the actual window range.
   * @returns The current items range to display
   */
  getRangeToRender(options?: {
    virtual?: boolean;
  }): WindowedList.WindowIndex | null {
    if (options?.virtual) {
      return this._computeVirtualRange();
    }
    let newWindowIndex: [number, number, number, number] = [
      0,
      Math.max(this.widgetCount - 1, -1),
      0,
      Math.max(this.widgetCount - 1, -1)
    ];

    const previousLastMeasuredIndex = this._measuredAllUntilIndex;
    if (this.windowingActive) {
      newWindowIndex = this._computeVirtualRange();
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

    return newWindowIndex ?? null;
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
    const startSizer = this._getItemMetadata(startIndex);
    const top = startSizer.offset;
    const stopSizer = this._getItemMetadata(stopIndex);
    const height = stopSizer.offset - startSizer.offset + stopSizer.size;
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
    const oldValue = this._measuredAllUntilIndex;
    this._measuredAllUntilIndex = Math.min(index, this._measuredAllUntilIndex);
    // Because `resetAfterIndex` is always called after an operation modifying
    // the list of widget sizers, we need to ensure that offsets are correct;
    // e.g. removing a cell would make the offsets of all following cells too high.
    // The simplest way to "heal" the offsets is to recompute them all.
    for (const [i, sizer] of this._widgetSizers.entries()) {
      if (i === 0) {
        continue;
      }
      const previous = this._widgetSizers[i - 1];
      sizer.offset = previous.offset + previous.size;
    }
    if (this._measuredAllUntilIndex !== oldValue) {
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
    if (this._windowingActive || this._currentWindow[0] >= 0) {
      let minIndex = Infinity;
      let measuredAllItemsUntil = -1;
      let offsetDelta = 0;
      let allPreviousMeasured = true;
      const sizesMap = new Map(sizes.map(i => [i.index, i.size]));

      const highestIndex = Math.max(...sizesMap.keys());

      // add sizers at the end if needed
      const entries: [number, WindowedList.ItemMetadata | null][] = [
        ...this._widgetSizers.entries()
      ];
      for (let i = this._widgetSizers.length; i <= highestIndex; i++) {
        entries.push([i, null]);
      }

      for (let [index, sizer] of entries) {
        const measuredSize = sizesMap.get(index);
        let itemDelta = 0;
        const hadSizer = !!sizer;

        if (!sizer) {
          const previous: WindowedList.ItemMetadata | undefined =
            this._widgetSizers[index - 1];
          const newSizer = {
            offset: previous ? previous.offset + previous.size : 0,
            size:
              measuredSize !== undefined
                ? measuredSize
                : this.estimateWidgetSize(index),
            measured: measuredSize !== undefined
          };
          this._widgetSizers[index] = newSizer;
          sizer = newSizer;
        }
        if (measuredSize !== undefined) {
          // If the we learned about the size, update it and compute atomic offset for following item (`itemDelta`)
          if (sizer.size != measuredSize) {
            itemDelta = measuredSize - sizer.size;
            sizer.size = measuredSize;
            minIndex = Math.min(minIndex, index);
          }
          // Always set the flag in case the size estimator provides perfect result
          sizer.measured = true;
        }
        // If all items so far have actual size measurements...
        if (allPreviousMeasured) {
          if (sizer.measured) {
            // and this item has a size measurement, we can say that
            // all items until now have measurements:
            measuredAllItemsUntil = index;
          } else {
            allPreviousMeasured = false;
          }
        }
        if (hadSizer && offsetDelta !== 0) {
          // Adjust offsets for all items where it is needed
          sizer.offset += offsetDelta;
        }
        // Keep track of the overall change in offset that will need to be applied to following items
        offsetDelta += itemDelta;
      }

      if (measuredAllItemsUntil !== -1) {
        this._measuredAllUntilIndex = measuredAllItemsUntil;
      }

      // If some sizes changed
      if (minIndex !== Infinity) {
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
          ...new Array(changes.newValues.length).fill(undefined).map((_, i) => {
            return { offset: 0, size: this.estimateWidgetSize(i) };
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
      case 'clear':
        this._widgetSizers.length = 0;
        this.resetAfterIndex(-1);
        break;
    }
  }

  private _getItemMetadata(index: number): WindowedList.ItemMetadata {
    if (index > this._measuredAllUntilIndex) {
      let offset = 0;
      if (this._measuredAllUntilIndex >= 0) {
        const itemMetadata = this._widgetSizers[this._measuredAllUntilIndex];
        offset = itemMetadata.offset + itemMetadata.size;
      }

      for (let i = this._measuredAllUntilIndex + 1; i <= index; i++) {
        let size: number;
        let measured = false;

        if (this._widgetSizers[i]?.measured) {
          size = this._widgetSizers[i].size;
          measured = true;
        } else {
          const widget = this.widgetRenderer(i);
          if (widget?.node && widget.node.isConnected) {
            size = widget.node.getBoundingClientRect().height;
            measured = true;
          } else {
            size = this.estimateWidgetSize(i);
            measured = false;
          }
        }

        this._widgetSizers[i] = { offset, size, measured };
        offset += size;
      }
      // Because the loop above updates estimated sizes,
      // we need to fix (heal) offsets of the remaining items.
      for (let i = index + 1; i < this._widgetSizers.length; i++) {
        const sizer = this._widgetSizers[i];
        const previous = this._widgetSizers[i - 1];
        sizer.offset = previous.offset + previous.size;
      }
    }

    for (let i = 0; i <= this._measuredAllUntilIndex; i++) {
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
    const lastContinouslyMeasuredItemOffset =
      this._measuredAllUntilIndex > 0
        ? this._widgetSizers[this._measuredAllUntilIndex].offset
        : 0;

    if (lastContinouslyMeasuredItemOffset >= offset) {
      // If we've already measured items within this range just use a binary search as it's faster.
      return this._findNearestItemBinarySearch(
        this._measuredAllUntilIndex,
        0,
        offset
      );
    } else {
      // If we haven't yet measured this high, fallback to an exponential search with an inner binary search.
      // The exponential search avoids pre-computing sizes for the full set of items as a binary search would.
      // The overall complexity for this approach is O(log n).
      return this._findNearestItemExponentialSearch(
        Math.max(0, this._measuredAllUntilIndex),
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

  /**
   * Compute the virtual range of items to render.
   */
  private _computeVirtualRange(): WindowedList.WindowIndex {
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
   *
   * @deprecated we always use {@link estimateWidgetSize}
   */
  protected _estimatedWidgetSize: number = WindowedList.DEFAULT_WIDGET_SIZE;
  protected _stateChanged = new Signal<
    WindowedListModel,
    IChangedArgs<
      any,
      any,
      | 'count'
      | 'estimatedWidgetSize'
      | 'index'
      | 'list'
      | 'overscanCount'
      | 'windowingActive'
      | string
    >
  >(this);

  private _currentWindow: WindowedList.WindowIndex = [-1, -1, -1, -1];
  private _height: number = 0;
  private _isDisposed = false;
  private _itemsList: ISimpleObservableList | null = null;
  private _measuredAllUntilIndex: number = -1;
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
  T extends WindowedList.IModel = WindowedList.IModel,
  U = any
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
  constructor(options: WindowedList.IOptions<T, U>) {
    const renderer = options.renderer ?? WindowedList.defaultRenderer;

    const node = document.createElement('div');
    node.className = 'jp-WindowedPanel';

    const scrollbarElement = node.appendChild(document.createElement('div'));
    scrollbarElement.classList.add('jp-WindowedPanel-scrollbar');

    const indicator = scrollbarElement.appendChild(
      renderer.createScrollbarViewportIndicator
        ? renderer.createScrollbarViewportIndicator()
        : WindowedList.defaultRenderer.createScrollbarViewportIndicator()
    );
    indicator.classList.add('jp-WindowedPanel-scrollbar-viewportIndicator');

    const list = scrollbarElement.appendChild(renderer.createScrollbar());
    list.classList.add('jp-WindowedPanel-scrollbar-content');

    const outerElement = node.appendChild(renderer.createOuter());
    outerElement.classList.add('jp-WindowedPanel-outer');

    const innerElement = outerElement.appendChild(
      document.createElement('div')
    );
    innerElement.className = 'jp-WindowedPanel-inner';

    const viewport = innerElement.appendChild(renderer.createViewport());
    viewport.classList.add('jp-WindowedPanel-viewport');

    super({ node });
    super.layout = options.layout ?? new WindowedLayout();
    this.renderer = renderer;

    this._viewportIndicator = indicator;
    this._innerElement = innerElement;
    this._isScrolling = null;
    this._outerElement = outerElement;
    this._itemsResizeObserver = null;
    this._scrollbarElement = scrollbarElement;
    this._scrollToItem = null;
    this._scrollRepaint = null;
    this._scrollUpdateWasRequested = false;
    this._updater = new Throttler(() => this.update(), 50);
    this._viewModel = options.model;
    this._viewport = viewport;

    if (options.scrollbar) {
      node.classList.add('jp-mod-virtual-scrollbar');
    }

    this.viewModel.stateChanged.connect(this.onStateChanged, this);
  }
  private _viewportIndicator: HTMLElement;

  /**
   * Whether the parent is hidden or not.
   *
   * This should be set externally if a container is hidden to
   * stop updating the widget size when hidden.
   */
  get isParentHidden(): boolean {
    return this._isParentHidden;
  }
  set isParentHidden(v: boolean) {
    this._isParentHidden = v;
  }

  /**
   * Widget layout
   */
  get layout(): WindowedLayout {
    return super.layout as WindowedLayout;
  }

  /**
   * The outer container of the windowed list.
   */
  get outerNode(): HTMLElement {
    return this._outerElement;
  }

  /**
   * Viewport
   */
  get viewportNode(): HTMLElement {
    return this._viewport;
  }

  /**
   * Flag to enable virtual scrollbar.
   */
  get scrollbar(): boolean {
    return this.node.classList.contains('jp-mod-virtual-scrollbar');
  }
  set scrollbar(enabled: boolean) {
    if (enabled) {
      this.node.classList.add('jp-mod-virtual-scrollbar');
    } else {
      this.node.classList.remove('jp-mod-virtual-scrollbar');
    }
    this._adjustDimensionsForScrollbar();
    this.update();
  }

  /**
   * The renderer for this windowed list. Set at instantiation.
   */
  protected renderer: WindowedList.IRenderer<U>;

  /**
   * Windowed list view model
   */
  protected get viewModel(): T {
    return this._viewModel;
  }

  /**
   * Dispose the windowed list.
   */
  dispose(): void {
    this._updater.dispose();
    super.dispose();
  }

  /**
   * Callback on event.
   *
   * @param event Event
   */
  handleEvent(event: Event): void {
    switch (event.type) {
      case 'pointerdown':
        this._evtPointerDown(event as PointerEvent);
        // Stop propagation of this event; a `mousedown` event will still
        // be automatically dispatched and handled by the parent notebook
        // (which will close any open context menu, etc.)
        event.stopPropagation();
        break;
      case 'scrollend':
        this._onScrollEnd();
        break;
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
    this._renderScrollbar();

    if (!this.viewModel.windowingActive) {
      this._outerElement.scrollTo({ top: scrollOffset });
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
   * By default, the list will scroll as little as possible to ensure the item is fully visible (`auto`).
   * You can control the alignment of the item though by specifying a second alignment parameter.
   * Acceptable values are:
   *
   *   auto - Automatically align with the top or bottom minimising the amount scrolled,
   *          If `alignPreference` is given, follow such preferred alignment.
   *          If item is smaller than the viewport and fully visible, do not scroll at all.
   *   smart - If the item is significantly visible, don't scroll at all (regardless of whether it fits in the viewport).
   *           If the item is less than one viewport away, scroll so that it becomes fully visible (following the `auto` heuristics).
   *           If the item is more than one viewport away, scroll so that it is centered within the viewport (`center` if smaller than viewport, `top-center` otherwise).
   *   center - Align the middle of the item with the middle of the viewport (it only works well for items smaller than the viewport).
   *   top-center - Align the top of the item with the middle of the viewport (works well for items larger than the viewport).
   *   end - Align the bottom of the item to the bottom of the list.
   *   start - Align the top of item to the top of the list.
   *
   * @param index Item index to scroll to
   * @param align Type of alignment
   * @param margin In 'smart' mode the viewport proportion to add
   * @param alignPreference Allows to override the alignment of item when the `auto` heuristic decides that the item needs to be scrolled into view.
   */
  scrollToItem(
    index: number,
    align: WindowedList.ScrollToAlign = 'auto',
    margin: number = 0.25,
    alignPreference?: WindowedList.BaseScrollToAlignment
  ): Promise<void> {
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
      // Catch the internal reject, as otherwise this will
      // result in an unhandled promise rejection in test.
      this._isScrolling.promise.catch(console.debug);
    }

    this._scrollToItem = [index, align, margin, alignPreference];

    this._resetScrollToItem();

    let precomputed = undefined;
    if (!this.viewModel.windowingActive) {
      const item = this._innerElement.querySelector(
        `[data-windowed-list-index="${index}"]`
      );
      if (!item || !(item instanceof HTMLElement)) {
        // Note: this can happen when scroll is requested when a cell is getting added
        console.debug(`Element with index ${index} not found`);
        return Promise.resolve();
      }
      precomputed = {
        totalSize: this._outerElement.scrollHeight,
        itemMetadata: {
          offset: item.offsetTop,
          size: item.clientHeight
        },
        currentOffset: this._outerElement.scrollTop
      };
    }
    this.scrollTo(
      this.viewModel.getOffsetForIndexAndAlignment(
        Math.max(0, Math.min(index, this.viewModel.widgetCount - 1)),
        align,
        margin,
        precomputed,
        alignPreference
      )
    );

    return this._isScrolling.promise;
  }

  /**
   * A message handler invoked on an `'after-attach'` message.
   */
  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    if (this.viewModel.windowingActive) {
      this._applyWindowingStyles();
    } else {
      this._applyNoWindowingStyles();
    }
    this._addListeners();
    this.viewModel.height = this.node.getBoundingClientRect().height;
    const viewportStyle = window.getComputedStyle(this._viewport);
    this.viewModel.paddingTop = parseFloat(viewportStyle.paddingTop);
    this._viewportPaddingTop = this.viewModel.paddingTop;
    this._viewportPaddingBottom = parseFloat(viewportStyle.paddingBottom);
    this._scrollbarElement.addEventListener('pointerdown', this);
    this._outerElement.addEventListener('scrollend', this);
  }

  /**
   * A message handler invoked on an `'before-detach'` message.
   */
  protected onBeforeDetach(msg: Message): void {
    this._removeListeners();
    this._scrollbarElement.removeEventListener('pointerdown', this);
    this._outerElement.removeEventListener('scrollend', this);
    super.onBeforeDetach(msg);
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
      this._renderScrollbar();

      if (this.viewModel.windowingActive) {
        this._scrollUpdateWasRequested = false;

        if (this._viewport.dataset.isScrolling != 'true') {
          this._viewport.dataset.isScrolling = 'true';
        }

        if (this._timerToClearScrollStatus) {
          window.clearTimeout(this._timerToClearScrollStatus);
        }
        // TODO: remove once `scrollend` event is supported by Safari
        this._timerToClearScrollStatus = window.setTimeout(() => {
          this._onScrollEnd();
        }, 750);
        this.update();
        // }
      }

      // }
    }
  }

  /**
   * A message handler invoked on an `'resize-request'` message.
   */
  protected onResize(msg: Widget.ResizeMessage): void {
    const previousHeight = this.viewModel.height;
    this.viewModel.height =
      msg.height >= 0 ? msg.height : this.node.getBoundingClientRect().height;
    if (this.viewModel.height !== previousHeight) {
      void this._updater.invoke();
    }
    super.onResize(msg);
    void this._updater.invoke();
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
        this._removeListeners();
        if (this.viewModel.windowingActive) {
          this._applyWindowingStyles();
          this.onScroll({ currentTarget: this.node } as any);
          this._addListeners();
          // Bail as onScroll will trigger update
          return;
        } else {
          this._applyNoWindowingStyles();
          this._addListeners();
        }
        break;
      case 'estimatedWidgetSize':
        // This only impact the container height and should not
        // impact the elements in the viewport.
        this._updateTotalSize();
        return;
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
        this._needsUpdate = false;
        this._scrollRepaint = window.requestAnimationFrame(() => {
          this._scrollRepaint = null;
          this._update();
          if (this._needsUpdate) {
            this.update();
          }
        });
      } else {
        // Force re rendering if some changes happen during rendering.
        this._needsUpdate = true;
      }
    } else {
      this._update();
    }
  }

  /**
   * A signal that emits the index when the virtual scrollbar jumps to an item.
   */
  protected jumped = new Signal<this, number>(this);

  /*
   * Hide the native scrollbar if necessary and update dimensions
   */
  private _adjustDimensionsForScrollbar() {
    const outer = this._outerElement;
    const scrollbar = this._scrollbarElement;
    if (this.scrollbar) {
      // Query DOM
      let outerScrollbarWidth = outer.offsetWidth - outer.clientWidth;
      // Update DOM

      // 1) The native scrollbar is hidden by shifting it out of view.
      if (outerScrollbarWidth == 0) {
        // If the scrollbar width is zero, one of the following is true:
        // - (a) the content is not overflowing
        // - (b) the browser uses overlay scrollbars
        // In (b) the overlay scrollbars could show up even even if
        // occluded by a child element; to prevent this resulting in
        // double scrollbar we shift the content by an arbitrary offset.
        outerScrollbarWidth = 1000;
        outer.style.paddingRight = `${outerScrollbarWidth}px`;
        outer.style.boxSizing = 'border-box';
      } else {
        outer.style.paddingRight = '0';
      }
      outer.style.width = `calc(100% + ${outerScrollbarWidth}px)`;

      // 2) The inner window is shrank to accommodate the virtual scrollbar
      this._innerElement.style.marginRight = `${scrollbar.offsetWidth}px`;
    } else {
      // Reset all styles that may have been touched.
      outer.style.width = '100%';
      this._innerElement.style.marginRight = '';
      outer.style.paddingRight = '0';
      outer.style.boxSizing = '';
    }
  }

  /**
   * Add listeners for viewport, contents and the virtual scrollbar.
   */
  private _addListeners() {
    // Scrollbar resize
    if (!this._scrollbarResizeObserver) {
      this._scrollbarResizeObserver = new ResizeObserver(
        this._adjustDimensionsForScrollbar.bind(this)
      );
      this._scrollbarResizeObserver.observe(this._outerElement);
      this._scrollbarResizeObserver.observe(this._scrollbarElement);
    }

    // Observe all items for size changes, regardless of windowing mode
    if (!this._itemsResizeObserver) {
      this._itemsResizeObserver = new ResizeObserver(
        this._onItemResize.bind(this)
      );
    }
    for (const widget of this.layout.widgets) {
      this._itemsResizeObserver.observe(widget.node);
      widget.disposed.connect(
        () => this._itemsResizeObserver?.unobserve(widget.node)
      );
    }
    if (!this._areaResizeObserver) {
      this._areaResizeObserver = new ResizeObserver(
        this._onAreaResize.bind(this)
      );
      this._areaResizeObserver.observe(this._innerElement);
    }
    this._outerElement.addEventListener('scroll', this, passiveIfSupported);
  }

  /**
   * Turn off windowing related styles in the viewport.
   */
  private _applyNoWindowingStyles() {
    this._viewport.style.position = 'relative';
    this._viewport.style.contain = '';
    this._viewport.style.top = '0px';
    this._viewport.style.minHeight = '';
    this._innerElement.style.height = '';
  }
  /**
   * Turn on windowing related styles in the viewport.
   */
  private _applyWindowingStyles() {
    this._viewport.style.position = 'absolute';
    this._viewport.style.contain = 'layout';
  }

  /**
   * Remove listeners for viewport and contents (but not the virtual scrollbar).
   */
  private _removeListeners() {
    this._outerElement.removeEventListener('scroll', this);
    this._areaResizeObserver?.disconnect();
    this._areaResizeObserver = null;
    this._itemsResizeObserver?.disconnect();
    this._itemsResizeObserver = null;
    this._scrollbarResizeObserver?.disconnect();
    this._scrollbarResizeObserver = null;
  }

  /**
   * Update viewport and DOM state.
   */
  private _update(): void {
    if (this.isDisposed || !this.layout) {
      return;
    }

    const newWindowIndex = this.viewModel.getRangeToRender();

    if (newWindowIndex !== null) {
      const [startIndex, stopIndex] = newWindowIndex;

      this._renderScrollbar();

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
          this._itemsResizeObserver?.unobserve(
            this.layout.widgets[itemIdx].node
          );
          this.layout.removeWidget(this.layout.widgets[itemIdx]);
        }
      }

      for (let index = 0; index < toAdd.length; index++) {
        const item = toAdd[index];
        if (this._itemsResizeObserver && !this.layout.widgets.includes(item)) {
          this._itemsResizeObserver.observe(item.node);
          item.disposed.connect(
            () => this._itemsResizeObserver?.unobserve(item.node)
          );
        }

        // The widget may have moved due to drag-and-drop
        this.layout.insertWidget(index, item);
      }

      if (this.viewModel.windowingActive) {
        if (stopIndex >= 0) {
          // Read this value after creating the cells.
          // So their actual sizes are taken into account
          this._updateTotalSize();

          // Update position of window container
          let [top, _minHeight] = this.viewModel.getSpan(startIndex, stopIndex);

          this._viewport.style.transform = `translateY(${top}px)`;
        } else {
          // Update inner container height
          this._innerElement.style.height = `0px`;

          // Update position of viewport node
          this._viewport.style.top = `0px`;
          this._viewport.style.minHeight = `0px`;
        }

        // Update scroll
        if (this._scrollUpdateWasRequested) {
          this._outerElement.scrollTop = this.viewModel.scrollOffset;
          this._scrollUpdateWasRequested = false;
        }
      }
    }

    let index2 = -1;
    for (const w of this._viewport.children) {
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

  /**
   * Handle viewport area resize.
   */
  private _onAreaResize(_entries: ResizeObserverEntry[]): void {
    this._scrollBackToItemOnResize();
  }

  /**
   * Handle viewport content (i.e. items) resize.
   */
  private _onItemResize(entries: ResizeObserverEntry[]): void {
    this._resetScrollToItem();

    if (this.isHidden || this.isParentHidden) {
      return;
    }

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
      this._scrollBackToItemOnResize();
      // Update the list
      this.update();
    }
  }

  /**
   * Scroll to the item which was most recently requested.
   *
   * This method ensures that the app scrolls to the item even if a resize event
   * occurs shortly after the scroll. Consider the following sequence of events:
   *
   * 1. User is at the nth cell, presses Shift+Enter (run current cell and
   *    advance to next)
   * 2. App scrolls to the next (n+1) cell
   * 3. The nth cell finishes running and renders the output, pushing the
   *    (n+1) cell down out of view
   * 4. This triggers the resize observer, which calls this method and scrolls
   *    the (n+1) cell back into view
   *
   * On implementation level, this is ensured by scrolling to `this._scrollToItem`
   * which is cleared after a short timeout once the scrolling settles
   * (see `this._resetScrollToItem()`).
   */
  private _scrollBackToItemOnResize() {
    if (!this._scrollToItem) {
      return;
    }
    this.scrollToItem(...this._scrollToItem).catch(reason => {
      console.log(reason);
    });
  }

  /**
   * Clear any outstanding timeout and enqueue scrolling to a new item.
   */
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

  /**
   * Render virtual scrollbar.
   */
  private _renderScrollbar(): HTMLElement[] {
    if (!this.scrollbar) {
      return [];
    }

    const { node, renderer, viewModel } = this;
    const content = node.querySelector('.jp-WindowedPanel-scrollbar-content')!;

    const elements: HTMLElement[] = [];
    const visitedKeys = new Set<string>();

    const getElement = (
      item: ReturnType<WindowedList.IRenderer['createScrollbarItem']>,
      index: number
    ) => {
      if (item instanceof HTMLElement) {
        return item;
      }
      visitedKeys.add(item.key);
      const props = { index };
      const cachedItem = this._scrollbarItems[item.key];

      if (cachedItem && !cachedItem.isDisposed) {
        try {
          return cachedItem.render(props);
        } catch {
          return document.createElement('div'); // fallback for tests
        }
      } else {
        this._scrollbarItems[item.key] = item;
        try {
          return item.render(props);
        } catch {
          return document.createElement('div'); // fallback for tests
        }
      }
    };

    const list = viewModel.itemsList;
    const count = list?.length ?? viewModel.widgetCount;

    for (let index = 0; index < count; index++) {
      const model = list?.get?.(index);
      const item = renderer.createScrollbarItem(this, index, model);
      const element: HTMLElement = getElement(item, index);
      element.classList.add('jp-WindowedPanel-scrollbar-item');
      element.dataset.index = `${index}`;
      elements.push(element);
    }

    // dispose of any elements which are no longer in the scrollbar
    const keysNotSeen = Object.keys(this._scrollbarItems).filter(
      key => !visitedKeys.has(key)
    );
    for (const key of keysNotSeen) {
      this._scrollbarItems[key].dispose();
      delete this._scrollbarItems[key];
    }

    const oldNodes = [...content.childNodes];
    if (
      oldNodes.length !== elements.length ||
      !oldNodes.every((node, index) => elements[index] === node)
    ) {
      content.replaceChildren(...elements);
    }

    if (this.scrollbar) {
      const newWindowIndex = this.viewModel.getRangeToRender({ virtual: true });
      if (newWindowIndex !== null) {
        const [firstVisibleIndex, lastVisibleIndex] = newWindowIndex;

        const first = elements[firstVisibleIndex];
        const last = elements[lastVisibleIndex];
        this._viewportIndicator.style.top = first.offsetTop - 1 + 'px';
        this._viewportIndicator.style.height =
          last.offsetTop - first.offsetTop + last.offsetHeight + 'px';
      }
    }
    return elements;
  }
  private _scrollbarItems: Record<
    string,
    WindowedList.IRenderer.IScrollbarItem
  > = {};

  /**
   * Handle `pointerdown` events on the virtual scrollbar.
   */
  private _evtPointerDown(event: PointerEvent): void {
    let target = event.target as HTMLElement;
    while (target && target.parentElement) {
      if (target.hasAttribute('data-index')) {
        const index = parseInt(target.getAttribute('data-index')!, 10);
        return void (async () => {
          await this.scrollToItem(index);
          this.jumped.emit(index);
        })();
      }
      target = target.parentElement;
    }
  }

  /**
   * Handle `scrollend` events on the scroller.
   */
  private _onScrollEnd() {
    if (this._timerToClearScrollStatus) {
      window.clearTimeout(this._timerToClearScrollStatus);
    }
    this._viewport.dataset.isScrolling = 'false';
    if (this._requiresTotalSizeUpdate) {
      this._updateTotalSize();
    }
    this._requiresTotalSizeUpdate = false;
  }

  /**
   * Update the total size
   */
  private _updateTotalSize(): void {
    if (this.viewModel.windowingActive) {
      if (this._viewport.dataset.isScrolling == 'true') {
        // Do not update while scrolling, delay until later
        this._requiresTotalSizeUpdate = true;
        return;
      }
      const estimatedTotalHeight = this.viewModel.getEstimatedTotalSize();
      const heightWithPadding =
        estimatedTotalHeight +
        this._viewportPaddingTop +
        this._viewportPaddingBottom;
      // Update inner container height
      this._innerElement.style.height = `${heightWithPadding}px`;
    }
  }

  protected _viewModel: T;
  private _viewportPaddingTop: number = 0;
  private _viewportPaddingBottom: number = 0;
  private _innerElement: HTMLElement;
  private _isParentHidden: boolean;
  private _isScrolling: PromiseDelegate<void> | null;
  private _needsUpdate = false;
  private _outerElement: HTMLElement;
  private _resetScrollToItemTimeout: number | null;
  private _requiresTotalSizeUpdate: boolean = false;
  private _areaResizeObserver: ResizeObserver | null;
  private _itemsResizeObserver: ResizeObserver | null;
  private _timerToClearScrollStatus: number | null = null;
  private _scrollbarElement: HTMLElement;
  private _scrollbarResizeObserver: ResizeObserver | null;
  private _scrollRepaint: number | null;
  private _scrollToItem:
    | [
        number,
        WindowedList.ScrollToAlign,
        number,
        WindowedList.BaseScrollToAlignment | undefined
      ]
    | null;
  private _scrollUpdateWasRequested: boolean;
  private _updater: Throttler;
  private _viewport: HTMLElement;
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
 * Windowed list model interface
 */
export interface ISimpleObservableList<T = any> {
  get?: (index: number) => T;
  length: number;
  changed: ISignal<any, IObservableList.IChangedArgs<any>>;
}

/**
 * A namespace for windowed list
 */
export namespace WindowedList {
  /**
   * The default renderer class for windowed lists.
   */
  export class Renderer<T = any> implements IRenderer<T> {
    /**
     * Create the outer, root element of the windowed list.
     */
    createOuter(): HTMLElement {
      return document.createElement('div');
    }

    /**
     * Create the virtual scrollbar element.
     */
    createScrollbar(): HTMLOListElement {
      return document.createElement('ol');
    }

    /**
     * Create the virtual scrollbar viewport indicator.
     */
    createScrollbarViewportIndicator(): HTMLElement {
      return document.createElement('div');
    }

    /**
     * Create an individual item rendered in the scrollbar.
     */
    createScrollbarItem(_: WindowedList, index: number): HTMLLIElement {
      const li = document.createElement('li');
      li.appendChild(document.createTextNode(`${index}`));
      return li;
    }

    /**
     * Create the viewport element into which virtualized children are added.
     */
    createViewport(): HTMLElement {
      return document.createElement('div');
    }
  }

  /**
   * The default renderer for windowed lists.
   */
  export const defaultRenderer = new Renderer();

  /**
   * Windowed list model interface
   */
  export interface IModel<T = any> extends IDisposable {
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
     * By default, the list will scroll as little as possible to ensure the item is fully visible (`auto`).
     * You can control the alignment of the item though by specifying a second alignment parameter.
     * Acceptable values are:
     *
     *   auto - Automatically align with the top or bottom minimising the amount scrolled,
     *          If `alignPreference` is given, follow such preferred alignment.
     *          If item is smaller than the viewport and fully visible, do not scroll at all.
     *   smart - If the item is significantly visible, don't scroll at all (regardless of whether it fits in the viewport).
     *           If the item is less than one viewport away, scroll so that it becomes fully visible (following the `auto` heuristics).
     *           If the item is more than one viewport away, scroll so that it is centered within the viewport (`center` if smaller than viewport, `top-center` otherwise).
     *   center - Align the middle of the item with the middle of the viewport (it only works well for items smaller than the viewport).
     *   top-center - Align the top of the item with the middle of the viewport (works well for items larger than the viewport).
     *   end - Align the bottom of the item to the bottom of the list.
     *   start - Align the top of item to the top of the list.
     *
     * @param index Item index
     * @param align Where to align the item in the viewport
     * @param margin In 'smart' mode the viewport proportion to add
     * @param precomputed Precomputed values to use when windowing is disabled.
     * @param alignPreference Allows to override the alignment of item when the `auto` heuristic decides that the item needs to be scrolled into view.
     * @returns The needed scroll offset
     */
    getOffsetForIndexAndAlignment(
      index: number,
      align?: ScrollToAlign,
      margin?: number,
      precomputed?: {
        totalSize: number;
        itemMetadata: WindowedList.ItemMetadata;
        currentOffset: number;
      },
      alignPreference?: WindowedList.BaseScrollToAlignment
    ): number;

    /**
     * Compute the items range to display.
     *
     * It returns ``null`` if the range does not need to be updated.
     *
     * @param options - Control how the range is computed.
     *   - `virtual`: If `true`, return a virtual range without updating
     *     the current window.
     *     If `false` or omitted, update and return the actual window range.
     * @returns The current items range to display
     */
    getRangeToRender(options?: {
      virtual?: boolean;
    }): WindowedList.WindowIndex | null;

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
     * Top padding of the the outer window node.
     */
    paddingTop?: number;

    /**
     * Items list to be rendered
     */
    itemsList: ISimpleObservableList<T> | null;

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
        | 'count'
        | 'index'
        | 'list'
        | 'overscanCount'
        | 'windowingActive'
        | string
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
    T extends WindowedList.IModel = WindowedList.IModel,
    U = any
  > {
    /**
     * Windowed list model to display
     */
    model: T;
    /**
     * Windowed list layout
     */
    layout?: WindowedLayout;

    /**
     * A renderer for the elements of the windowed list.
     */
    renderer?: IRenderer<U>;

    /**
     * Whether the windowed list should display a scrollbar UI.
     */
    scrollbar?: boolean;
  }

  /**
   * A windowed list element renderer.
   */
  export interface IRenderer<T = any> {
    /**
     * Create the outer, root element of the windowed list.
     */
    createOuter(): HTMLElement;

    /**
     * Create the virtual scrollbar element.
     */
    createScrollbar(): HTMLElement;

    /**
     * Create the virtual scrollbar viewport indicator.
     */
    createScrollbarViewportIndicator?(): HTMLElement;

    /**
     * Create an individual item rendered in the scrollbar.
     */
    createScrollbarItem(
      list: WindowedList,
      index: number,
      item: T | undefined
    ): HTMLElement | IRenderer.IScrollbarItem;

    /**
     * Create the viewport element into which virtualized children are added.
     */
    createViewport(): HTMLElement;
  }

  /**
   * Renderer statics.
   */
  export namespace IRenderer {
    /**
     * Scrollbar item.
     */
    export interface IScrollbarItem extends IDisposable {
      /**
       * Render the scrollbar item as an HTML element.
       */
      render: (props: { index: number }) => HTMLElement;

      /**
       * Unique item key used for caching.
       */
      key: string;
    }
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
   * Basic type of scroll alignment
   */
  export type BaseScrollToAlignment = 'center' | 'top-center' | 'start' | 'end';

  /**
   * Type of scroll alignment including `auto` and `smart`
   */
  export type ScrollToAlign = 'auto' | 'smart' | BaseScrollToAlignment;

  /**
   * Widget range in view port
   */
  export type WindowIndex = [number, number, number, number];
}
