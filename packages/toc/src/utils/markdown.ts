// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { TableOfContents } from '../tokens';

/**
 * Table of Contents Markdown utilities
 */

/**
 * Markdown heading
 */
export interface IMarkdownHeading extends TableOfContents.IHeading {
  /**
   * Heading line
   */
  line: number;
  raw: string;
}

/**
 * Parses the provided string and returns a list of headings.
 *
 * @param text - Input text
 * @param options - Parser configuration
 * @param initialLevels - Initial levels to use for computing the prefix
 * @returns List of headings
 */
export function getHeadings(
  text: string,
  options?: Partial<TableOfContents.IConfig>,
  initialLevels: number[] = []
): IMarkdownHeading[] {
  const { numberingH1, maximalDepth } = {
    ...TableOfContents.defaultConfig,
    ...options
  };

  // Split the text into lines:
  const lines = text.split('\n');

  // Iterate over the lines to get the header level and text for each line:
  const levels = initialLevels;
  let previousLevel = levels.length;
  let headings = new Array<IMarkdownHeading>();
  let isCodeBlock;
  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    let line = lines[lineIdx];

    if (line === '') {
      // Bail early
      continue;
    }

    // Don't check for Markdown headings if in a code block:
    if (line.startsWith('```')) {
      isCodeBlock = !isCodeBlock;
    }
    if (isCodeBlock) {
      continue;
    }

    const heading = parseHeading(line, line[lineIdx + 1]); // append the next line to capture alternative style Markdown headings

    if (heading) {
      let level = heading.level;
      if (!numberingH1) {
        level -= 1;
      }

      if (level > 0 && level <= maximalDepth) {
        if (level > previousLevel) {
          // Initialize the new levels
          for (let l = previousLevel; l < level - 1; l++) {
            levels[l] = 0;
          }
          levels[level - 1] = 1;
        } else {
          // Increment the current level
          levels[level - 1] += 1;

          // Drop higher levels
          if (level < previousLevel) {
            levels.splice(level);
          }
        }
        previousLevel = level;

        headings.push({
          text: heading.text,
          prefix: levels.map(level => level.toString()).join('.') + '.',
          level,
          line: lineIdx,
          raw: heading.raw
        });
      }
    }
  }
  return headings;
}

const MARKDOWN_MIME_TYPE = [
  'text/x-ipythongfm',
  'text/x-markdown',
  'text/x-gfm',
  'text/markdown'
];

/**
 * Returns whether a MIME type corresponds to a Markdown flavor.
 *
 * @param mime - MIME type string
 * @returns boolean indicating whether a provided MIME type corresponds to a Markdown flavor
 *
 * @example
 * const bool = isMarkdown('text/markdown');
 * // returns true
 *
 * @example
 * const bool = isMarkdown('text/plain');
 * // returns false
 */
export function isMarkdown(mime: string): boolean {
  return MARKDOWN_MIME_TYPE.includes(mime);
}

/**
 * Interface describing a parsed heading result.
 *
 * @private
 */
interface IHeader {
  /**
   * Heading text.
   */
  text: string;

  /**
   * Heading level.
   */
  level: number;

  raw: string;
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
 * @param line - Line to parse
 * @param nextLine - The line after the one to parse
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
function parseHeading(line: string, nextLine?: string): IHeader | null {
  // Case: Markdown heading
  let match = line.match(/^([#]{1,6}) (.*)/);
  if (match) {
    return {
      text: match[2].replace(/\[(.+)\]\(.+\)/g, '$1'), // take special care to parse Markdown links into raw text
      level: match[1].length,
      raw: line
    };
  }
  // Case: Markdown heading (alternative style)
  if (nextLine) {
    match = nextLine.match(/^ {0,3}([=]{2,}|[-]{2,})\s*$/);
    if (match) {
      return {
        text: line.replace(/\[(.+)\]\(.+\)/g, '$1'), // take special care to parse Markdown links into raw text
        level: match[1][0] === '=' ? 1 : 2,
        raw: line + nextLine
      };
    }
  }
  // Case: HTML heading (WARNING: this is not particularly robust, as HTML headings can span multiple lines)
  match = line.match(/<h([1-6]).*>(.*)<\/h\1>/i);
  if (match) {
    return {
      text: match[2],
      level: parseInt(match[1], 10),
      raw: line
    };
  }

  return null;
}
