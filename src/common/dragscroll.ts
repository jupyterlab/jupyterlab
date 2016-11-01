// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IDragEvent
} from 'phosphor/lib/dom/dragdrop';


/**
 * A class that allows scrolling within a drag node.
 */
export
class DragScrollHandler {
  /**
   * Construct a new scroll handler.
   */
  constructor(options: DragScrollHandler.IOptions) {
    this._node = options.node;
    this._edgeDistance = options.edgeDistance || 30;
    this._maxSpeed = options.maxSpeed || 20;
  }

  /**
   * Clear the scroll handler.
   */
  clear(): void {
    clearInterval(this._scrollInterval);
    this._isScrolling = false;
  }

  /**
   * Handle scrolling for drag events.
   */
  handleDragEvent(event: IDragEvent) {
    let yPos = event.clientY;
    let node = this._node;
    let rect = node.getBoundingClientRect();
    let maxSpeed = this._maxSpeed;
    let edgeDistance = this._edgeDistance;
    let distanceFromTop = yPos - rect.top;
    let distanceFromBottom = rect.top + rect.height - yPos;

    // Step 1: Enable/disable scrolling.
    if ((distanceFromTop <= edgeDistance ||
         distanceFromBottom <= edgeDistance) &&
        !this._isScrolling) {
       // Activate scrolling.
       this._isScrolling = true;
       this._scrollAmount = 0;
       // Update at 60fps.
       this._scrollInterval = setInterval(() => {
          if (this._scrollAmount === 0) {
            return;
          }
          let prev = node.scrollTop;
          node.scrollTop += this._scrollAmount;
          if (node.scrollTop === prev) {
            this.clear();
          }
       }, 16);
    } else if (distanceFromTop > edgeDistance &&
               distanceFromBottom > edgeDistance &&
               this._isScrolling) {
      // Deactivate scrolling.
      this.clear();
    }

    // Step 2: Set scrolling speed.
    if (this._isScrolling) {
      // Scrolling is happening so compute the scroll speed.
      let direction = 1;  // Default to scroll down.
      let distance = distanceFromBottom;
      if (distanceFromTop <= edgeDistance) {
        direction = -1;  // Scroll up.
        distance = distanceFromTop;
      }
      let ratio = distance / edgeDistance;
      this._scrollAmount = direction * Math.min(1, 1 - ratio) * maxSpeed;
    }
  }

  private _scrollInterval = -1;
  private _isScrolling = false;
  private _scrollAmount = 0;
  private _node: HTMLElement;
  private _edgeDistance = -1;
  private _maxSpeed = -1;
}


/**
 * The namespace for `DragScrollHandler` statics.
 */
export
namespace DragScrollHandler {
  /**
   * The options used to initialize a drag scroll handler.
   */
  export
  interface IOptions {
    /**
     * The scrollable node.
     */
    node: HTMLElement;

    /**
     * The distance from the edit in pixels for drag scroll initiation.
     * The default is 30.
     */
    edgeDistance?: number;

    /**
     * The max scroll speed in pixels per frame.  The default is 20.
     */
    maxSpeed?: number;
  }
}
