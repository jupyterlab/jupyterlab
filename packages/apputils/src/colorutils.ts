// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

/**
 * The namespace for color utilities.
 */
export namespace ColorUtils {
  /**
   * A color as red, green, blue and alpha channels.
   */
  export interface IRGBA {
    /**
     * The red channel, from 0 to 255.
     */
    red: number;

    /**
     * The green channel, from 0 to 255.
     */
    green: number;

    /**
     * The blue channel, from 0 to 255.
     */
    blue: number;

    /**
     * The alpha channel, from 0 (transparent) to 1 (opaque).
     */
    alpha: number;
  }

  /**
   * Parse a CSS color with the browser.
   *
   * @param color - The CSS color, such as the value of a theme variable.
   * @returns The color, or `null` when the browser does not accept it or
   * reads it back in a syntax other than `#rrggbb` and `rgba()`, as Chromium
   * does for `oklch()` and `color-mix()`.
   */
  export function parse(color: string): IRGBA | null {
    const context = document.createElement('canvas').getContext('2d');
    if (!context) {
      return null;
    }
    // A canvas keeps its previous fill style when given an invalid color.
    context.fillStyle = '#000000';
    context.fillStyle = color;
    const parsed = context.fillStyle;
    context.fillStyle = '#ffffff';
    context.fillStyle = color;
    if (typeof parsed !== 'string' || context.fillStyle !== parsed) {
      return null;
    }
    // Opaque colors read back as `#rrggbb`, others as `rgba(r, g, b, a)`.
    if (parsed.startsWith('#')) {
      const value = parseInt(parsed.slice(1), 16);
      return {
        red: (value >> 16) & 255,
        green: (value >> 8) & 255,
        blue: value & 255,
        alpha: 1
      };
    }
    // Chromium reads back colors such as `oklch()` in their own syntax.
    if (!parsed.startsWith('rgba(')) {
      return null;
    }
    const channels = parsed.slice('rgba('.length, -1).split(',');
    const [red, green, blue, alpha] = channels.map(Number);
    return { red, green, blue, alpha };
  }
}
