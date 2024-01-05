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

    /**
     * Configuration for the overlay's class names and optional title.
     */
    classConfig: {
      /**
       * The primary class name to be applied to the overlay.
       */
      class: string;

      /**
       * An optional title to be set on the overlay element.
       */
      title?: string;
    };

    /**
     * Configuration for the overlay's CSS styles.
     */
    cssConfig: {
      /**
       * The position of the overlay (e.g., "absolute", "relative", etc.).
       */
      position: string;

      /**
       * The top position of the overlay.
       */
      top: string;

      /**
       * The left position of the overlay.
       */
      left: string;

      /**
       * The width of the overlay.
       */
      width: string;

      /**
       * The height of the overlay.
       */
      height: string;

      /**
       * Optional border radius for the overlay.
       */
      'border-Radius'?: string;

      /**
       * Optional z-index for the overlay.
       */
      'z-index'?: string;

      /**
       * Optional text alignment for the overlay's content.
       */
      'text-align'?: string;

      /**
       * The text color of the overlay's content.
       */
      color: string;

      /**
       * Optional inner HTML content for the overlay.
       */
      innerHTML?: string;

      /**
       * The background color of the overlay.
       */
      background: string;

      /**
       * The visibility of the overlay (e.g., "visible", "hidden").
       */
      visibility: string;
    };
  }

  /**
   * Creates an overlay element and appends it to the specified host element.
   *
   * @param options - The options for creating the overlay.
   */
  export function createOverlay(options: IOptions): void {
    const { hostElement, classConfig, cssConfig } = options;

    // Check if the overlay already exists to avoid duplicates.
    if (!hostElement.querySelector(`[title="${classConfig.title}"]`)) {
      // Create the overlay element.
      const overlayElement = document.createElement('div');

      // Apply the class names and title from the config.
      for (const [key, value] of Object.entries(classConfig)) {
        overlayElement.setAttribute(key, value);
      }

      // Apply the CSS styles from the config.
      for (const [key, value] of Object.entries(cssConfig)) {
        overlayElement.style.setProperty(key, value);
      }

      // Append the overlay element to the host element.
      hostElement.appendChild(overlayElement);
    }
  }
}
