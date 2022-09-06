// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

/**
 * The class name added to all hover boxes.
 */
const HOVERBOX_CLASS = 'jp-HoverBox';

/**
 * The class name added to a hovering node that is scrolled out of view.
 */
const OUTOFVIEW_CLASS = 'jp-mod-outofview';

type OutOfViewDisplay =
  | 'hidden-inside'
  | 'hidden-outside'
  | 'stick-inside'
  | 'stick-outside';

/**
 * A namespace for `HoverBox` members.
 */
export namespace HoverBox {
  /**
   * Options for setting the geometry of a hovering node and its anchor node.
   */
  export interface IOptions {
    /**
     * The referent anchor rectangle to which the hover box is bound.
     *
     * #### Notes
     * In an editor context, this value will typically be the cursor's
     * coordinate position, which can be retrieved via calling the
     * `getCoordinateForPosition` method.
     */
    anchor: DOMRect;

    /**
     * The node that hosts the anchor.
     *
     * #### Notes
     * The visibility of the elements under hover box edges within this host
     * node is the heuristic that determines whether the hover box ought to be
     * visible.
     */
    host: HTMLElement;

    /**
     * The maximum height of a hover box.
     *
     * #### Notes
     * This value is only used if a CSS max-height attribute is not set for the
     * hover box. It is a fallback value.
     */
    maxHeight: number;

    /**
     * The minimum height of a hover box.
     */
    minHeight: number;

    /**
     * The hover box node.
     */
    node: HTMLElement;

    /**
     * Optional pixel offset values added to where the hover box should render.
     *
     * #### Notes
     * This option is useful for passing in values that may pertain to CSS
     * borders or padding in cases where the text inside the hover box may need
     * to align with the text of the referent editor.
     *
     * Because the hover box calculation may render a box either above or below
     * the cursor, the `vertical` offset accepts `above` and `below` values for
     * the different render modes.
     */
    offset?: {
      horizontal?: number;
      vertical?: { above?: number; below?: number };
    };

    /**
     * If space is available both above and below the anchor, denote which
     * location is privileged. Use forceBelow and forceAbove to mandate where
     * hover box should render relative to anchor.
     *
     * #### Notes
     * The default value is `'below'`.
     */
    privilege?: 'above' | 'below' | 'forceAbove' | 'forceBelow';

    /**
     * If the style of the node has already been computed, it can be passed into
     * the hover box for geometry calculation.
     */
    style?: CSSStyleDeclaration;

    /**
     * How to position the hover box if its edges extend beyond the view of the
     * host element. Value 'sticky' positions the box at the (inner or outer)
     * edge of the host element.
     *
     * #### Notes
     * The default value for each edge is `'hidden-inside'` for left and top,
     * and `hidden-outside` for right and bottom edges.
     */
    outOfViewDisplay?: {
      top?: OutOfViewDisplay;
      bottom?: OutOfViewDisplay;
      left?: OutOfViewDisplay;
      right?: OutOfViewDisplay;
    };
  }

  /**
   * Set the visible dimensions of a hovering box anchored to an editor cursor.
   *
   * @param options - The hover box geometry calculation options.
   */
  export function setGeometry(options: IOptions): void {
    const { anchor, host, node, privilege, outOfViewDisplay } = options;

    // Add hover box class if it does not exist.
    node.classList.add(HOVERBOX_CLASS);

    // Make sure the node is visible so that its dimensions can be queried.
    node.classList.remove(OUTOFVIEW_CLASS);

    // Clear any previously set max-height.
    node.style.maxHeight = '';

    // Clear any programmatically set margin-top.
    node.style.marginTop = '';

    const style = options.style || window.getComputedStyle(node);
    const innerHeight = window.innerHeight;
    const spaceAbove = anchor.top;
    const spaceBelow = innerHeight - anchor.bottom;
    const marginTop = parseInt(style.marginTop!, 10) || 0;
    const marginLeft = parseInt(style.marginLeft!, 10) || 0;
    const minHeight = parseInt(style.minHeight!, 10) || options.minHeight;

    let maxHeight = parseInt(style.maxHeight!, 10) || options.maxHeight;

    // Determine whether to render above or below; check privilege.
    const renderBelow =
      privilege === 'forceAbove'
        ? false
        : privilege === 'forceBelow'
        ? true
        : privilege === 'above'
        ? spaceAbove < maxHeight && spaceAbove < spaceBelow
        : spaceBelow >= maxHeight || spaceBelow >= spaceAbove;

    if (renderBelow) {
      maxHeight = Math.min(spaceBelow - marginTop, maxHeight);
    } else {
      maxHeight = Math.min(spaceAbove, maxHeight);
      // If the box renders above the text, its top margin is irrelevant.
      node.style.marginTop = '0px';
    }
    node.style.maxHeight = `${maxHeight}px`;

    // Make sure the box ought to be visible.
    const withinBounds =
      maxHeight > minHeight &&
      (spaceBelow >= minHeight || spaceAbove >= minHeight);

    if (!withinBounds) {
      node.classList.add(OUTOFVIEW_CLASS);
      return;
    }

    // Position the box vertically.
    const offsetAbove =
      (options.offset &&
        options.offset.vertical &&
        options.offset.vertical.above) ||
      0;
    const offsetBelow =
      (options.offset &&
        options.offset.vertical &&
        options.offset.vertical.below) ||
      0;
    let top = renderBelow
      ? innerHeight - spaceBelow + offsetBelow
      : spaceAbove - node.getBoundingClientRect().height + offsetAbove;
    node.style.top = `${Math.floor(top)}px`;

    // Position the box horizontally.
    const offsetHorizontal = (options.offset && options.offset.horizontal) || 0;
    let left = anchor.left + offsetHorizontal;

    node.style.left = `${Math.ceil(left)}px`;
    node.style.width = 'auto';

    // Expand the menu width by the scrollbar size, if present.
    if (node.scrollHeight >= maxHeight) {
      node.style.width = `${2 * node.offsetWidth - node.clientWidth}`;
      node.scrollTop = 0;
    }

    // Move left to fit in the window.
    const rect = node.getBoundingClientRect();
    const hostRect = host.getBoundingClientRect(); // Query together to avoid extra layout recalculation
    const right = rect.right;
    if (right > window.innerWidth) {
      left -= right - window.innerWidth;
      node.style.left = `${Math.ceil(left)}px`;
    }

    // Move right to fit in the window
    if (left < offsetHorizontal - marginLeft) {
      left = offsetHorizontal - marginLeft;
      node.style.left = `${Math.ceil(left)}px`;
    }

    // Hide the hover box before querying the DOM for the anchor coordinates.
    node.classList.add(OUTOFVIEW_CLASS);

    const bottom = rect.bottom;

    const includesLeftTop = host.contains(document.elementFromPoint(left, top));
    const includesRightTop = host.contains(
      document.elementFromPoint(right, top)
    );
    const includesRightBottom = host.contains(
      document.elementFromPoint(right, bottom)
    );
    const includesLeftBottom = host.contains(
      document.elementFromPoint(left, bottom)
    );

    const topEdgeInside = includesLeftTop || includesRightTop;
    const bottomEdgeInside = includesLeftBottom || includesRightBottom;
    const leftEdgeInside = includesLeftTop || includesLeftBottom;
    const rightEdgeInside = includesRightBottom || includesRightTop;

    const height = bottom - top;
    const width = right - left;

    const overTheTop = top < hostRect.top;
    const belowTheBottom = bottom > hostRect.bottom;
    const beforeTheLeft = left + marginLeft < hostRect.left;
    const afterTheRight = right > hostRect.right;

    let hide = false;
    let leftChanged = false;
    let topChanged = false;

    if (overTheTop) {
      switch (outOfViewDisplay?.top || 'hidden-inside') {
        case 'hidden-inside':
          if (!topEdgeInside) {
            hide = true;
          }
          break;
        case 'hidden-outside':
          if (!bottomEdgeInside) {
            hide = true;
          }
          break;
        case 'stick-inside':
          if (hostRect.top > top) {
            top = hostRect.top;
            topChanged = true;
          }
          break;
        case 'stick-outside':
          if (hostRect.top > bottom) {
            top = hostRect.top - height;
            topChanged = true;
          }
          break;
      }
    }

    if (belowTheBottom) {
      switch (outOfViewDisplay?.bottom || 'hidden-outsdie') {
        case 'hidden-inside':
          if (!bottomEdgeInside) {
            hide = true;
          }
          break;
        case 'hidden-outside':
          if (!topEdgeInside) {
            hide = true;
          }
          break;
        case 'stick-inside':
          if (hostRect.bottom < bottom) {
            top = hostRect.bottom - height;
            topChanged = true;
          }
          break;
        case 'stick-outside':
          if (hostRect.bottom < top) {
            top = hostRect.bottom;
            topChanged = true;
          }
          break;
      }
    }

    if (beforeTheLeft) {
      switch (outOfViewDisplay?.left || 'hidden-inside') {
        case 'hidden-inside':
          if (!leftEdgeInside) {
            hide = true;
          }
          break;
        case 'hidden-outside':
          if (!rightEdgeInside) {
            hide = true;
          }
          break;
        case 'stick-inside':
          if (hostRect.left > left + marginLeft) {
            left = hostRect.left - marginLeft;
            leftChanged = true;
          }
          break;
        case 'stick-outside':
          if (hostRect.left > right) {
            left = hostRect.left - marginLeft - width;
            leftChanged = true;
          }
          break;
      }
    }

    if (afterTheRight) {
      switch (outOfViewDisplay?.right || 'hidden-outsdie') {
        case 'hidden-inside':
          if (!rightEdgeInside) {
            hide = true;
          }
          break;
        case 'hidden-outside':
          if (!leftEdgeInside) {
            hide = true;
          }
          break;
        case 'stick-inside':
          if (hostRect.right < right) {
            left = hostRect.right - width;
            leftChanged = true;
          }
          break;
        case 'stick-outside':
          if (hostRect.right < left) {
            left = hostRect.right;
            leftChanged = true;
          }
          break;
      }
    }

    if (!hide) {
      node.classList.remove(OUTOFVIEW_CLASS);
    }

    if (leftChanged) {
      node.style.left = `${Math.ceil(left)}px`;
    }
    if (topChanged) {
      node.style.top = `${Math.ceil(top)}px`;
    }
  }
}
