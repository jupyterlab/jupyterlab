// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import sanitize from 'sanitize-html';

export interface ISanitizer {
  /**
   * Sanitize an HTML string.
   *
   * @param dirty - The dirty text.
   *
   * @param options - The optional sanitization options.
   *
   * @returns The sanitized string.
   */
  sanitize(dirty: string, options?: ISanitizer.IOptions): string;
}

/**
 * The namespace for `ISanitizer` related interfaces.
 */
export namespace ISanitizer {
  /**
   * The options used to sanitize.
   */
  export interface IOptions {
    /**
     * The allowed tags.
     */
    allowedTags?: string[];

    /**
     * The allowed attributes for a given tag.
     */
    allowedAttributes?: { [key: string]: string[] };

    /**
     * The allowed style values for a given tag.
     */
    allowedStyles?: { [key: string]: { [key: string]: RegExp[] } };
  }
}

/**
 * Wrapper class for various allowed CSS property values
 */
class CssPropertyRegex {
  // Legal css color values
  public static readonly COLOR_HEX = /^\#(0x)?[0-9a-f]+$/i;
  public static readonly COLOR_RGB = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i;
  public static readonly COLOR_NAME = /^(AliceBlue|AntiqueWhite|Aqua|Aquamarine|Azure|Beige|Bisque|Black|BlanchedAlmond|Blue|BlueViolet|Brown|BurlyWood|CadetBlue|Chartreuse|Chocolate|Coral|CornflowerBlue|Cornsilk|Crimson|Cyan|DarkBlue|DarkCyan|DarkGoldenRod|DarkGray|DarkGrey|DarkGreen|DarkKhaki|DarkMagenta|DarkOliveGreen|Darkorange|DarkOrchid|DarkRed|DarkSalmon|DarkSeaGreen|DarkSlateBlue|DarkSlateGray|DarkSlateGrey|DarkTurquoise|DarkViolet|DeepPink|DeepSkyBlue|DimGray|DimGrey|DodgerBlue|FireBrick|FloralWhite|ForestGreen|Fuchsia|Gainsboro|GhostWhite|Gold|GoldenRod|Gray|Grey|Green|GreenYellow|HoneyDew|HotPink|IndianRed|Indigo|Ivory|Khaki|Lavender|LavenderBlush|LawnGreen|LemonChiffon|LightBlue|LightCoral|LightCyan|LightGoldenRodYellow|LightGray|LightGrey|LightGreen|LightPink|LightSalmon|LightSeaGreen|LightSkyBlue|LightSlateGray|LightSlateGrey|LightSteelBlue|LightYellow|Lime|LimeGreen|Linen|Magenta|Maroon|MediumAquaMarine|MediumBlue|MediumOrchid|MediumPurple|MediumSeaGreen|MediumSlateBlue|MediumSpringGreen|MediumTurquoise|MediumVioletRed|MidnightBlue|MintCream|MistyRose|Moccasin|NavajoWhite|Navy|OldLace|Olive|OliveDrab|Orange|OrangeRed|Orchid|PaleGoldenRod|PaleGreen|PaleTurquoise|PaleVioletRed|PapayaWhip|PeachPuff|Peru|Pink|Plum|PowderBlue|Purple|Red|RosyBrown|RoyalBlue|SaddleBrown|Salmon|SandyBrown|SeaGreen|SeaShell|Sienna|Silver|SkyBlue|SlateBlue|SlateGray|SlateGrey|Snow|SpringGreen|SteelBlue|Tan|Teal|Thistle|Tomato|Turquoise|Violet|Wheat|White|WhiteSmoke|Yellow|YellowGreen)$/i;
  public static readonly COLOR = [
    CssPropertyRegex.COLOR_HEX,
    CssPropertyRegex.COLOR_RGB,
    CssPropertyRegex.COLOR_NAME
  ];

  public static readonly FLOAT = /^(left|right)$/;
  public static readonly CLEAR = /^(none|left|right|both|initial|inherit)$/;
  public static readonly DISPLAY = /^(inline|block|inline\-block)$/;

  public static readonly LENGTH = /^0$|^[+-]?([0-9]*[.])?[0-9]+(px|em|ex|%|in|cm|mm|pt|pc)$/;
  public static readonly FONT_SIZE = /^(medium|xx-small|x-small|small|large|x-large|xx-large|smaller|larger)$/;
  public static readonly FONT_WEIGHT = /^(normal|bold|bolder|lighter|100|200|300|400|500|600|700|800|900|initial|inherit)$/;
}

/**
 * A class to sanitize HTML strings.
 */
class Sanitizer implements ISanitizer {
  /**
   * Sanitize an HTML string.
   *
   * @param dirty - The dirty text.
   *
   * @param options - The optional sanitization options.
   *
   * @returns The sanitized string.
   */
  sanitize(dirty: string, options?: ISanitizer.IOptions): string {
    return sanitize(dirty, { ...this._options, ...(options || {}) });
  }

  private _options: sanitize.IOptions = {
    // HTML tags that are allowed to be used
    // (This array no longer relies on sanitizer-html's default value for 'allowedTags' because
    // they seem to change across versions)
    allowedTags: [
      'a',
      'audio',
      'b',
      'blockquote',
      'br',
      'caption',
      'code',
      'colspan',
      'del',
      'div',
      'em',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'hr',
      'i',
      'img',
      'input',
      'kbd',
      'li',
      'ol',
      'p',
      'pre',
      'rowspan',
      'span',
      'strike',
      'strong',
      'sub',
      'sup',
      'table',
      'tbody',
      'td',
      'th',
      'thead',
      'tr',
      'ul',
      'video'
    ],
    // Attributes that HTML tags are allowed to have
    allowedAttributes: {
      a: ['href', 'name', 'rel', 'style', 'target'],
      img: ['alt', 'height', 'src', 'style', 'width'],
      input: ['checked', 'disabled', 'type'],
      code: ['class'],
      span: ['class', 'style'],
      div: ['class', 'style'],
      p: ['class', 'style'],
      pre: ['class', 'style'],
      audio: ['autoplay', 'controls', 'loop', 'muted', 'src'],
      video: [
        'autoplay',
        'controls',
        'height',
        'loop',
        'muted',
        'src',
        'width'
      ],
      th: ['rowspan', 'colspan'],
      td: ['rowspan', 'colspan']
    },
    // Inline CSS styles that HTML tags may have (and their allowed values)
    allowedStyles: {
      // Allow any element, that allows the 'style' attribute, to have custom colors
      '*': {
        background: CssPropertyRegex.COLOR,
        'background-color': CssPropertyRegex.COLOR,
        color: CssPropertyRegex.COLOR
      },
      img: {
        display: [CssPropertyRegex.DISPLAY],
        float: [CssPropertyRegex.FLOAT],
        clear: [CssPropertyRegex.CLEAR],
        height: [CssPropertyRegex.LENGTH],
        width: [CssPropertyRegex.LENGTH]
      },
      div: {
        display: [CssPropertyRegex.DISPLAY],
        float: [CssPropertyRegex.FLOAT],
        clear: [CssPropertyRegex.CLEAR],
        'font-size': [CssPropertyRegex.FONT_SIZE, CssPropertyRegex.LENGTH],
        'font-weight': [CssPropertyRegex.FONT_WEIGHT],
        height: [CssPropertyRegex.LENGTH],
        width: [CssPropertyRegex.LENGTH]
      },
      span: {
        display: [CssPropertyRegex.DISPLAY],
        float: [CssPropertyRegex.FLOAT],
        clear: [CssPropertyRegex.CLEAR],
        'font-size': [CssPropertyRegex.FONT_SIZE, CssPropertyRegex.LENGTH],
        'font-weight': [CssPropertyRegex.FONT_WEIGHT],
        height: [CssPropertyRegex.LENGTH],
        width: [CssPropertyRegex.LENGTH]
      },
      p: {
        display: [CssPropertyRegex.DISPLAY],
        float: [CssPropertyRegex.FLOAT],
        clear: [CssPropertyRegex.CLEAR],
        'font-size': [CssPropertyRegex.FONT_SIZE, CssPropertyRegex.LENGTH],
        'font-weight': [CssPropertyRegex.FONT_WEIGHT],
        height: [CssPropertyRegex.LENGTH],
        width: [CssPropertyRegex.LENGTH]
      }
    },
    transformTags: {
      // Set the "rel" attribute for <a> tags to "nofollow".
      a: sanitize.simpleTransform('a', { rel: 'nofollow' }),
      // Set the "disabled" attribute for <input> tags.
      input: sanitize.simpleTransform('input', { disabled: 'disabled' })
    },
    allowedSchemesByTag: {
      // Allow 'attachment:' img src (used for markdown cell attachments).
      img: sanitize.defaults.allowedSchemes.concat(['attachment'])
    }
  };
}

/**
 * The default instance of an `ISanitizer` meant for use by user code.
 */
export const defaultSanitizer: ISanitizer = new Sanitizer();
