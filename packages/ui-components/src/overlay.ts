/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * A namespace for functions and types related to creating overlays.
 */
export namespace Overlay {
  /**
   * Options for creating an overlay.
   */
  export interface IOptions {
    /**
     * The element that will host the overlay.
     */
    hostElement: Element;
  }

  /**
   * Creates an overlay element and appends it to the specified host element.
   *
   * @param options - The options for creating the overlay.
   */
  export function createOverlay(options: IOptions): void {
    const { hostElement } = options;

    // Create the overlay element.
    const overlayElement = document.createElement('div');
    overlayElement.setAttribute('title', 'jp-Overlay-Tooltip');
    overlayElement.setAttribute('class', 'jp-Overlay');

    // Append the overlay element to the host element.
    hostElement.appendChild(overlayElement);
  }
}
