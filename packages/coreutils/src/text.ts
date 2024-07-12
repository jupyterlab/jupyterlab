// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

/**
 * The namespace for text-related functions.
 */
export namespace Text {
  // javascript stores text as utf16 and string indices use "code units",
  // which stores high-codepoint characters as "surrogate pairs",
  // which occupy two indices in the javascript string.
  // We need to translate cursor_pos in the Jupyter protocol (in characters)
  // to js offset (with surrogate pairs taking two spots).

  const HAS_SURROGATES: boolean = '𝐚'.length > 1;

  /**
   * Convert a javascript string index into a unicode character offset
   *
   * @param jsIdx - The javascript string index (counting surrogate pairs)
   *
   * @param text - The text in which the offset is calculated
   *
   * @returns The unicode character offset
   */
  export function jsIndexToCharIndex(jsIdx: number, text: string): number {
    if (HAS_SURROGATES) {
      // not using surrogates, nothing to do
      return jsIdx;
    }
    let charIdx = jsIdx;
    for (let i = 0; i + 1 < text.length && i < jsIdx; i++) {
      const charCode = text.charCodeAt(i);
      // check for surrogate pair
      if (charCode >= 0xd800 && charCode <= 0xdbff) {
        const nextCharCode = text.charCodeAt(i + 1);
        if (nextCharCode >= 0xdc00 && nextCharCode <= 0xdfff) {
          charIdx--;
          i++;
        }
      }
    }
    return charIdx;
  }

  /**
   * Convert a unicode character offset to a javascript string index.
   *
   * @param charIdx - The index in unicode characters
   *
   * @param text - The text in which the offset is calculated
   *
   * @returns The js-native index
   */
  export function charIndexToJsIndex(charIdx: number, text: string): number {
    if (HAS_SURROGATES) {
      // not using surrogates, nothing to do
      return charIdx;
    }
    let jsIdx = charIdx;
    for (let i = 0; i + 1 < text.length && i < jsIdx; i++) {
      const charCode = text.charCodeAt(i);
      // check for surrogate pair
      if (charCode >= 0xd800 && charCode <= 0xdbff) {
        const nextCharCode = text.charCodeAt(i + 1);
        if (nextCharCode >= 0xdc00 && nextCharCode <= 0xdfff) {
          jsIdx++;
          i++;
        }
      }
    }
    return jsIdx;
  }

  /**
   * Given a 'snake-case', 'snake_case', 'snake:case', or
   * 'snake case' string, will return the camel case version: 'snakeCase'.
   *
   * @param str the snake-case input string.
   *
   * @param upper default = false. If true, the first letter of the
   * returned string will be capitalized.
   *
   * @returns the camel case version of the input string.
   */
  export function camelCase(str: string, upper: boolean = false): string {
    return str.replace(/^(\w)|[\s-_:]+(\w)/g, function (match, p1, p2) {
      if (p2) {
        return p2.toUpperCase();
      } else {
        return upper ? p1.toUpperCase() : p1.toLowerCase();
      }
    });
  }

  /**
   * Given a string, title case the words in the string.
   *
   * @param str the string to title case.
   *
   * @returns the same string, but with each word capitalized.
   */
  export function titleCase(str: string): string {
    return (str || '')
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
