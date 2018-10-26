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
      let charCode = text.charCodeAt(i);
      // check for surrogate pair
      if (charCode >= 0xd800 && charCode <= 0xdbff) {
        let nextCharCode = text.charCodeAt(i + 1);
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
      let charCode = text.charCodeAt(i);
      // check for surrogate pair
      if (charCode >= 0xd800 && charCode <= 0xdbff) {
        let nextCharCode = text.charCodeAt(i + 1);
        if (nextCharCode >= 0xdc00 && nextCharCode <= 0xdfff) {
          jsIdx++;
          i++;
        }
      }
    }
    return jsIdx;
  }

  /**
   * Given a string, title case the words in the string.
   *
   * @param str: the string to title case.
   *
   * @returns the same string, but with each word capitalized.
   */
  export function titleCase(str: string) {
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
