import { MessageLoop } from '@lumino/messaging';
import { PanelLayout, Widget } from '@lumino/widgets';

export class WindowedPanel extends Widget {
  constructor(options: Widget.IOptions) {
    const innerElement = document.createElement('div');
    super(options);
    this._innerElement = innerElement;
    this.layout = new WindowedLayout();

    this.innerNode.style.width = '100%';
    this.node.style.position = 'relative';
    this.node.style.overflowY = 'auto';
  }

  get innerNode(): HTMLDivElement {
    return this._innerElement;
  }

  private _innerElement: HTMLDivElement;
}

class WindowedLayout extends PanelLayout {
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
}


export namespace WindowedPanel {


  export type itemSizeGetter = (index: number) => number;

  export type ItemMetadata = {
    offset: number,
    size: number,
  };
  export type InstanceProps = {
    itemMetadataMap: { [index: number]: ItemMetadata },
    estimatedItemSize: number,
    lastMeasuredIndex: number,
  };
  
  function getItemMetadata(
    props: Props<any>,
    index: number,
    instanceProps: InstanceProps
  ): ItemMetadata {
    const { itemSize } = ((props: any): VariableSizeProps);
    const { itemMetadataMap, lastMeasuredIndex } = instanceProps;
  
    if (index > lastMeasuredIndex) {
      let offset = 0;
      if (lastMeasuredIndex >= 0) {
        const itemMetadata = itemMetadataMap[lastMeasuredIndex];
        offset = itemMetadata.offset + itemMetadata.size;
      }
  
      for (let i = lastMeasuredIndex + 1; i <= index; i++) {
        let size = ((itemSize: any): itemSizeGetter)(i);
  
        itemMetadataMap[i] = {
          offset,
          size,
        };
  
        offset += size;
      }
  
      instanceProps.lastMeasuredIndex = index;
    }
  
    return itemMetadataMap[index];
  };
  
  function findNearestItem(
    props: Props<any>,
    instanceProps: InstanceProps,
    offset: number
  ): number {
    const { itemMetadataMap, lastMeasuredIndex } = instanceProps;
  
    const lastMeasuredItemOffset =
      lastMeasuredIndex > 0 ? itemMetadataMap[lastMeasuredIndex].offset : 0;
  
    if (lastMeasuredItemOffset >= offset) {
      // If we've already measured items within this range just use a binary search as it's faster.
      return findNearestItemBinarySearch(
        props,
        instanceProps,
        lastMeasuredIndex,
        0,
        offset
      );
    } else {
      // If we haven't yet measured this high, fallback to an exponential search with an inner binary search.
      // The exponential search avoids pre-computing sizes for the full set of items as a binary search would.
      // The overall complexity for this approach is O(log n).
      return findNearestItemExponentialSearch(
        props,
        instanceProps,
        Math.max(0, lastMeasuredIndex),
        offset
      );
    }
  };
  
  function findNearestItemBinarySearch(
    props: Props<any>,
    instanceProps: InstanceProps,
    high: number,
    low: number,
    offset: number
  ): number {
    while (low <= high) {
      const middle = low + Math.floor((high - low) / 2);
      const currentOffset = getItemMetadata(props, middle, instanceProps).offset;
  
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
  };
  
  function findNearestItemExponentialSearch(
    props: Props<any>,
    instanceProps: InstanceProps,
    index: number,
    offset: number
  ): number {
    const { itemCount } = props;
    let interval = 1;
  
    while (
      index < itemCount &&
      getItemMetadata(props, index, instanceProps).offset < offset
    ) {
      index += interval;
      interval *= 2;
    }
  
    return findNearestItemBinarySearch(
      props,
      instanceProps,
      Math.min(index, itemCount - 1),
      Math.floor(index / 2),
      offset
    );
  };
  
  export function getEstimatedTotalSize(
    { itemCount }: Props<any>,
    { itemMetadataMap, estimatedItemSize, lastMeasuredIndex }: InstanceProps
  ): number{
    let totalSizeOfMeasuredItems = 0;
  
    // Edge case check for when the number of items decreases while a scroll is in progress.
    // https://github.com/bvaughn/react-window/pull/138
    if (lastMeasuredIndex >= itemCount) {
      lastMeasuredIndex = itemCount - 1;
    }
  
    if (lastMeasuredIndex >= 0) {
      const itemMetadata = itemMetadataMap[lastMeasuredIndex];
      totalSizeOfMeasuredItems = itemMetadata.offset + itemMetadata.size;
    }
  
    const numUnmeasuredItems = itemCount - lastMeasuredIndex - 1;
    const totalSizeOfUnmeasuredItems = numUnmeasuredItems * estimatedItemSize;
  
    return totalSizeOfMeasuredItems + totalSizeOfUnmeasuredItems;
  };
}
