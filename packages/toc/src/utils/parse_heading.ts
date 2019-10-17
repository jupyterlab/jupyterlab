// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

/**
 * Interface describing a parsed heading result.
 *
 * @private
 */
interface IHeading {
  /**
   * Heading text.
   */
  text: string;

  /**
   * Heading level.
   */
  level: number;

  /**
   * Heading type.
   */
  type: 'html' | 'markdown' | 'markdown-alt';
}

/**
 * Parses a heading, if one exists, from a provided string.
 *
 * ## Notes
 *
 * -   Heading examples:
 *
 *     -   Markdown heading:
 *
 *         ```
 *         # Foo
 *         ```
 *
 *     -   Markdown heading (alternative style):
 *
 *         ```
 *         Foo
 *         ===
 *         ```
 *
 *         ```
 *         Foo
 *         ---
 *         ```
 *
 *     -   HTML heading:
 *
 *         ```
 *         <h3>Foo</h3>
 *         ```
 *
 * @private
 * @param str - input text
 * @returns heading info
 *
 * @example
 * const out = parseHeading('### Foo\n');
 * // returns {'text': 'Foo', 'level': 3, 'type': 'markdown'}
 *
 * @example
 * const out = parseHeading('Foo\n===\n');
 * // returns {'text': 'Foo', 'level': 1, 'type': 'markdown-alt'}
 *
 * @example
 * const out = parseHeading('<h4>Foo</h4>\n');
 * // returns {'text': 'Foo', 'level': 4, 'type': 'html'}
 *
 * @example
 * const out = parseHeading('Foo');
 * // returns null
 */
function parseHeading(str: string): IHeading | null {
  const lines = str.split('\n');

  // Case: Markdown heading
  let match = lines[0].match(/^([#]{1,6}) (.*)/);
  if (match) {
    return {
      text: match[2].replace(/\[(.+)\]\(.+\)/g, '$1'), // take special care to parse Markdown links into raw text
      level: match[1].length,
      type: 'markdown'
    };
  }
  // Case: Markdown heading (alternative style)
  if (lines.length > 1) {
    match = lines[1].match(/^([=]{2,}|[-]{2,})/);
    if (match) {
      return {
        text: lines[0].replace(/\[(.+)\]\(.+\)/g, '$1'), // take special care to parse Markdown links into raw text
        level: match[1][0] === '=' ? 1 : 2,
        type: 'markdown-alt'
      };
    }
  }
  // Case: HTML heading (WARNING: this is not particularly robust, as HTML headings can span multiple lines)
  match = lines[0].match(/<h([1-6]).*>(.*)<\/h\1>/i);
  if (match) {
    return {
      text: match[2],
      level: parseInt(match[1], 10),
      type: 'html'
    };
  }
  return null;
}

/**
 * Exports.
 */
export { parseHeading };
