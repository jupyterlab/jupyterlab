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
    // HTML tags that are allowed to be used. Tags were extracted from Google Caja
    allowedTags: [
      'a',
      'abbr',
      'acronym',
      'address',
      'area',
      'article',
      'aside',
      'audio',
      'b',
      'bdi',
      'bdo',
      'big',
      'blockquote',
      'br',
      'button',
      'canvas',
      'caption',
      'center',
      'cite',
      'code',
      'col',
      'colgroup',
      'colspan',
      'command',
      'data',
      'datalist',
      'dd',
      'del',
      'details',
      'dfn',
      'dir',
      'div',
      'dl',
      'dt',
      'em',
      'fieldset',
      'figcaption',
      'figure',
      'font',
      'footer',
      'form',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'header',
      'hgroup',
      'hr',
      // 'iframe' is allowed by Google Caja, but disallowed by default by sanitize-html
      'i',
      'img',
      'input',
      'ins', // , 'iframe'
      'kbd',
      'label',
      'legend',
      'li',
      'map',
      'mark',
      'menu',
      'meter',
      'nav',
      'nobr',
      'ol',
      'optgroup',
      'option',
      'output',
      'p',
      'pre',
      'progress',
      'q',
      'rowspan',
      's',
      'samp',
      'section',
      'select',
      'small',
      'source',
      'span',
      'strike',
      'strong',
      'sub',
      'summary',
      'sup',
      'table',
      'tbody',
      'td',
      'textarea',
      'tfoot',
      'th',
      'thead',
      'time',
      'tr',
      'track',
      'tt',
      'u',
      'ul',
      'var',
      'video',
      'wbr'
    ],
    // Attributes that HTML tags are allowed to have, extracted from Google Caja.
    // See https://github.com/jupyterlab/jupyterlab/issues/1812#issuecomment-285848435
    allowedAttributes: {
      '*': [
        'class',
        'dir',
        'draggable',
        'hidden',
        'id',
        'inert',
        'itemprop',
        'itemref',
        'itemscope',
        'lang',
        'spellcheck',
        'style',
        'title',
        'translate'
      ],
      // 'rel' and 'target' were *not* allowed by Google Caja
      a: [
        'accesskey',
        'coords',
        'href',
        'hreflang',
        'name',
        'rel',
        'shape',
        'tabindex',
        'target',
        'type'
      ],
      area: [
        'accesskey',
        'alt',
        'coords',
        'href',
        'nohref',
        'shape',
        'tabindex'
      ],
      // 'autoplay' was *not* allowed by Google Caja
      audio: [
        'autoplay',
        'controls',
        'loop',
        'mediagroup',
        'muted',
        'preload',
        'src'
      ],
      bdo: ['dir'],
      blockquote: ['cite'],
      br: ['clear'],
      button: ['accesskey', 'disabled', 'name', 'tabindex', 'type', 'value'],
      canvas: ['height', 'width'],
      caption: ['align'],
      col: ['align', 'char', 'charoff', 'span', 'valign', 'width'],
      colgroup: ['align', 'char', 'charoff', 'span', 'valign', 'width'],
      command: [
        'checked',
        'command',
        'disabled',
        'icon',
        'label',
        'radiogroup',
        'type'
      ],
      data: ['value'],
      del: ['cite', 'datetime'],
      details: ['open'],
      dir: ['compact'],
      div: ['align'],
      dl: ['compact'],
      fieldset: ['disabled'],
      font: ['color', 'face', 'size'],
      form: [
        'accept',
        'action',
        'autocomplete',
        'enctype',
        'method',
        'name',
        'novalidate'
      ],
      h1: ['align'],
      h2: ['align'],
      h3: ['align'],
      h4: ['align'],
      h5: ['align'],
      h6: ['align'],
      hr: ['align', 'noshade', 'size', 'width'],
      iframe: [
        'align',
        'frameborder',
        'height',
        'marginheight',
        'marginwidth',
        'width'
      ],
      img: [
        'align',
        'alt',
        'border',
        'height',
        'hspace',
        'ismap',
        'name',
        'src',
        'usemap',
        'vspace',
        'width'
      ],
      input: [
        'accept',
        'accesskey',
        'align',
        'alt',
        'autocomplete',
        'checked',
        'disabled',
        'inputmode',
        'ismap',
        'list',
        'max',
        'maxlength',
        'min',
        'multiple',
        'name',
        'placeholder',
        'readonly',
        'required',
        'size',
        'src',
        'step',
        'tabindex',
        'type',
        'usemap',
        'value'
      ],
      ins: ['cite', 'datetime'],
      label: ['accesskey', 'for'],
      legend: ['accesskey', 'align'],
      li: ['type', 'value'],
      map: ['name'],
      menu: ['compact', 'label', 'type'],
      meter: ['high', 'low', 'max', 'min', 'value'],
      ol: ['compact', 'reversed', 'start', 'type'],
      optgroup: ['disabled', 'label'],
      option: ['disabled', 'label', 'selected', 'value'],
      output: ['for', 'name'],
      p: ['align'],
      pre: ['width'],
      progress: ['max', 'min', 'value'],
      q: ['cite'],
      select: [
        'autocomplete',
        'disabled',
        'multiple',
        'name',
        'required',
        'size',
        'tabindex'
      ],
      source: ['type'],
      table: [
        'align',
        'bgcolor',
        'border',
        'cellpadding',
        'cellspacing',
        'frame',
        'rules',
        'summary',
        'width'
      ],
      tbody: ['align', 'char', 'charoff', 'valign'],
      td: [
        'abbr',
        'align',
        'axis',
        'bgcolor',
        'char',
        'charoff',
        'colspan',
        'headers',
        'height',
        'nowrap',
        'rowspan',
        'scope',
        'valign',
        'width'
      ],
      textarea: [
        'accesskey',
        'autocomplete',
        'cols',
        'disabled',
        'inputmode',
        'name',
        'placeholder',
        'readonly',
        'required',
        'rows',
        'tabindex',
        'wrap'
      ],
      tfoot: ['align', 'char', 'charoff', 'valign'],
      th: [
        'abbr',
        'align',
        'axis',
        'bgcolor',
        'char',
        'charoff',
        'colspan',
        'headers',
        'height',
        'nowrap',
        'rowspan',
        'scope',
        'valign',
        'width'
      ],
      thead: ['align', 'char', 'charoff', 'valign'],
      tr: ['align', 'bgcolor', 'char', 'charoff', 'valign'],
      track: ['default', 'kind', 'label', 'srclang'],
      ul: ['compact', 'type'],
      video: [
        'autoplay',
        'controls',
        'height',
        'loop',
        'mediagroup',
        'muted',
        'poster',
        'preload',
        'src',
        'width'
      ]
    },
    // Inline CSS styles that HTML tags may have (and their allowed values)
    allowedStyles: {
      //
      '*': {
        background: CssPropertyRegex.COLOR,
        'background-color': CssPropertyRegex.COLOR,
        clear: [CssPropertyRegex.CLEAR],
        color: CssPropertyRegex.COLOR,
        display: [CssPropertyRegex.DISPLAY],
        float: [CssPropertyRegex.FLOAT],
        height: [CssPropertyRegex.LENGTH],
        'font-size': [CssPropertyRegex.FONT_SIZE, CssPropertyRegex.LENGTH],
        'font-weight': [CssPropertyRegex.FONT_WEIGHT],
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
