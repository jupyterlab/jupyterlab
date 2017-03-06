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


/**
 * A namespace for `HoverBox` members.
 */
export
namespace HoverBox {
  /**
   * Options for setting the geometry of a hovering node and its anchor node.
   */
  export
  interface IOptions {
    /**
     * The referent anchor rectangle to which the hover box is bound.
     *
     * #### Notes
     * In an editor context, this value will typically be the cursor's
     * coordinate position, which can be retrieved via calling the
     * `getCoordinateForPosition` method.
     */
    anchor: ClientRect;

    /**
     * The node that hosts the anchor.
     *
     * #### Notes
     * The visibility of the anchor rectangle within this host node is the
     * heuristic that determines whether the hover box ought to be visible.
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
      horizontal?: number,
      vertical?: { above?: number, below?: number }
    };

    /**
     * If space is available both above and below the anchor, denote which
     * location is privileged.
     *
     * #### Notes
     * The default value is `'below'`.
     */
    privilege?: 'above' | 'below';
  }


  /**
   * Set the visible dimensions of a hovering box anchored to an editor cursor.
   *
   * @param options - The hover box geometry calculation options.
   */
  export
  function setGeometry(options: IOptions): void {
    const { anchor, host, node } = options;

    // Add hover box class if it does not exist.
    node.classList.add(HOVERBOX_CLASS);

    // If the current coordinates are not visible, bail.
    if (!host.contains(document.elementFromPoint(anchor.left, anchor.top))) {
      node.classList.add(OUTOFVIEW_CLASS);
      return;
    }

    // Clear any previously set max-height.
    node.style.maxHeight = '';

    // Clear any programmatically set margin-top.
    node.style.marginTop = '';

    // Make sure the node is visible.
    node.classList.remove(OUTOFVIEW_CLASS);

    const style = window.getComputedStyle(node);
    const innerHeight = window.innerHeight;
    const spaceAbove = anchor.top;
    const spaceBelow = innerHeight - anchor.bottom;
    const marginTop = parseInt(style.marginTop, 10) || 0;
    const minHeight = parseInt(style.minHeight, 10) || options.minHeight;

    let maxHeight = parseInt(style.maxHeight, 10) || options.maxHeight;

    // Determine whether to render above or below; check privilege.
    const renderBelow = options.privilege === 'above' ?
      spaceAbove < maxHeight && spaceAbove < spaceBelow
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
    const withinBounds = maxHeight > minHeight &&
      (spaceBelow >= minHeight || spaceAbove >= minHeight);

    if (!withinBounds) {
      node.classList.add(OUTOFVIEW_CLASS);
      return;
    }

    // Position the box vertically.
    const offsetAbove = options.offset && options.offset.vertical &&
      options.offset.vertical.above || 0;
    const offsetBelow = options.offset && options.offset.vertical &&
      options.offset.vertical.below || 0;
    const top = renderBelow ? (innerHeight - spaceBelow) + offsetBelow
      : (spaceAbove - node.getBoundingClientRect().height) + offsetAbove;
    node.style.top = `${Math.floor(top)}px`;

    // Position the box horizontally.
    const offsetHorizontal = options.offset && options.offset.horizontal || 0;
    const left = anchor.left + offsetHorizontal;
    node.style.left = `${Math.ceil(left)}px`;
    node.style.width = 'auto';

    // Expand the menu width by the scrollbar size, if present.
    if (node.scrollHeight >= maxHeight) {
      node.style.width = `${2 * node.offsetWidth - node.clientWidth}`;
      node.scrollTop = 0;
    }
  }
}
